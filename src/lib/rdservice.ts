// ============================================================================
// RD-Service fingerprint capture (UIDAI Registered Devices 2.0)
// ----------------------------------------------------------------------------
// Biometric devices (Mantra, Morpho/Idemia, Startek, Evolute, Precision, ...)
// each run a local "RD service" that listens on a port on 127.0.0.1 and answers
// two custom HTTP verbs: RDSERVICE (discovery) and CAPTURE (scan).
//
// The browser talks to that local service directly — the fingerprint never goes
// anywhere else. We take the returned PID block (already encrypted and signed by
// the device itself, per UIDAI spec) and post it to our edge function, which
// forwards it to Eko. We never see, store, or transmit the raw fingerprint image.
//
// NOTE ON MIXED CONTENT: the portal is served over HTTPS, and the RD service is
// plain HTTP on localhost. Chrome and Edge treat http://127.0.0.1 as a "potentially
// trustworthy origin" and allow it. Firefox and Safari generally do not — retailers
// should use Chrome/Edge. Some newer RD services also expose an HTTPS endpoint on
// 127.0.0.1 with a locally trusted certificate; we probe those too.
// ============================================================================

export type RdDevice = { port: number; base: string; info: string; status: string };

export type CaptureResult = {
  ok: boolean;
  pidData?: string;      // full <PidData> XML, sent to Eko as `piddata`
  quality?: number;      // qScore 0-100
  errCode?: string;
  error?: string;
  pidOptions?: string;   // exact <PidOptions> XML handed to the RD service
  deviceInfo?: Record<string, string>; // dpId/rdsId/rdsVer/mi/mc-present, for partner support
};

// UIDAI RD services bind somewhere in 11100-11120; vendors differ, and a second
// device on the same PC takes the next free port. Probe the whole documented range.
const RD_PORTS = Array.from({ length: 21 }, (_, i) => 11100 + i);

// NPCI/UIDAI wadh value for AePS FIR+FMR single-PID-block authentication.
export const AEPS_WADH = "E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=";

async function rdFetch(url: string, method: string, body?: string, timeoutMs = 30000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "text/xml; charset=utf-8", "Accept": "text/xml" },
      ...(body ? { body } : {}),
      signal: ctrl.signal,
    });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export type DiscoveryReport = {
  device: RdDevice | null;
  /** Ports that answered but weren't usable, with why. */
  found: { base: string; status: string; info: string }[];
  /** True if at least one port responded at all — i.e. an RD service exists. */
  anyResponse: boolean;
  hint: string;
};

/**
 * Probe localhost for an RD service and report what was actually seen, so the
 * retailer gets a real reason rather than a generic "not found".
 */
export async function discoverDeviceVerbose(): Promise<DiscoveryReport> {
  const found: DiscoveryReport["found"] = [];

  for (const scheme of ["http", "https"]) {
    // Probe the ports in parallel — serial probing of 42 endpoints is far too slow.
    const results = await Promise.all(RD_PORTS.map(async (port) => {
      const base = `${scheme}://127.0.0.1:${port}`;
      try {
        const xml = await rdFetch(`${base}/`, "RDSERVICE", undefined, 2000);
        if (!xml || !xml.includes("RDService")) return null;
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const node = doc.getElementsByTagName("RDService")[0];
        return {
          port, base,
          status: node?.getAttribute("status") ?? "",
          info: node?.getAttribute("info") ?? "",
        };
      } catch {
        return null;                       // closed, blocked, or CORS-refused
      }
    }));

    for (const r of results.filter(Boolean) as any[]) {
      found.push({ base: r.base, status: r.status, info: r.info });
      if (String(r.status).toUpperCase() === "READY") {
        return { device: r, found, anyResponse: true, hint: "" };
      }
    }
  }

  // Nothing usable. Work out the most likely reason and say so plainly.
  let hint: string;
  if (found.length > 0) {
    const st = found[0].status.toUpperCase();
    hint = st === "NOTREADY"
      ? "The RD service is running but the scanner is not ready — plug the device in, or its RD licence may have expired."
      : st === "USED"
        ? "The scanner is in use by another application. Close any other biometric software and try again."
        : `The RD service replied with status "${found[0].status}". Check the device driver.`;
  } else if (!window.isSecureContext) {
    hint = "The page is not on a secure origin, so the browser is blocking the scanner. Open the portal over HTTPS.";
  } else if (!/Chrome|Edg/i.test(navigator.userAgent)) {
    hint = "Use Google Chrome or Microsoft Edge. Firefox and Safari block the local scanner connection from an HTTPS page.";
  } else {
    hint = "No RD service is responding. Install and start the scanner's RD service (Mantra RD, Morpho RD, Startek RD…), then plug the device in.";
  }
  return { device: null, found, anyResponse: found.length > 0, hint };
}

/** Find the RD service by probing the known localhost ports. */
export async function discoverDevice(): Promise<RdDevice | null> {
  return (await discoverDeviceVerbose()).device;
}

/**
 * Capture one fingerprint and return the PID block.
 *
 * fType = 2 is mandatory: NPCI requires the FIR+FMR single-PID-block format for
 * Aadhaar-based biometric auth. (A small list of banks is still on fType = 0 —
 * pass fType: 0 for those.)
 */
export async function captureFingerprint(
  device: RdDevice,
  opts: { fType?: 0 | 2; timeoutMs?: number; wadh?: string } = {},
): Promise<CaptureResult> {
  const fType = opts.fType ?? 2;
  const timeout = opts.timeoutMs ?? 20000;
  // Eko's docs make the wadh conditional: "If you generate the PID block yourself".
  // With a vendor RD service the device generates and signs it, so forcing a wadh in
  // changes what gets signed. Pass wadh: "" to omit the attribute entirely.
  const wadh = opts.wadh ?? AEPS_WADH;
  const wadhAttr = wadh ? ` wadh="${wadh}"` : "";

  // format="0" => PID Data type="X" (XML), which is what Eko expects.
  const pidOptions =
    `<?xml version="1.0"?>` +
    `<PidOptions ver="1.0">` +
    `<Opts fCount="1" fType="${fType}" iCount="0" pCount="0" format="0" ` +
    `pidVer="2.0" timeout="${timeout}" posh="UNKNOWN" env="P"${wadhAttr} />` +
    `</PidOptions>`;

  let xml: string;
  try {
    xml = await rdFetch(`${device.base}/rd/capture`, "CAPTURE", pidOptions, timeout + 10000);
  } catch (e) {
    // Older services expose /capture instead of /rd/capture.
    try {
      xml = await rdFetch(`${device.base}/capture`, "CAPTURE", pidOptions, timeout + 10000);
    } catch {
      return { ok: false, error: "Could not reach the fingerprint scanner. Is the RD service running?" };
    }
  }

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const resp = doc.getElementsByTagName("Resp")[0];
  if (!resp) return { ok: false, error: "The scanner returned an unreadable response." };

  const errCode = resp.getAttribute("errCode") ?? "";
  if (errCode !== "0") {
    return {
      ok: false,
      errCode,
      error: resp.getAttribute("errInfo") || `Capture failed (code ${errCode})`,
    };
  }

  // Guard against the device returning Protobuf instead of XML — Eko needs XML.
  const dataNode = doc.getElementsByTagName("Data")[0];
  if (dataNode && dataNode.getAttribute("type") !== "X") {
    return { ok: false, error: "The scanner returned a non-XML PID block. Set capture format to 0 in the RD service." };
  }

  return {
    ok: true,
    pidData: xml,
    quality: Number(resp.getAttribute("qScore") ?? 0),
    pidOptions,
    deviceInfo: (() => {
      const di = doc.getElementsByTagName("DeviceInfo")[0];
      const out: Record<string, string> = {};
      if (di) for (const a of Array.from(di.attributes)) out[a.name] = a.value;
      return out;
    })(),
  };
}

/** Pull the device model and serial number out of a captured PID block, for activation. */
export function readDeviceInfo(pidXml: string): { model: string; serial: string; provider: string } {
  try {
    const doc = new DOMParser().parseFromString(pidXml, "text/xml");
    const di = doc.getElementsByTagName("DeviceInfo")[0];
    const model = di?.getAttribute("mi") || "";            // e.g. MFS100
    const provider = di?.getAttribute("dpId") || "";        // e.g. MANTRA.MSIPL
    let serial = "";
    const params = di?.getElementsByTagName("Param") ?? [];
    for (let i = 0; i < params.length; i++) {
      if (params[i].getAttribute("name") === "srno") { serial = params[i].getAttribute("value") || ""; break; }
    }
    return { model, serial, provider };
  } catch {
    return { model: "", serial: "", provider: "" };
  }
}

/** Browser geolocation — Eko requires the merchant's real lat,long for fraud checks. */
export function getLatLong(): Promise<string> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve("");
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
      () => resolve(""),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

// Strict variant — REJECTS when location is unavailable or denied.
// NPCI mandates geo-coordinates on every AePS operation, so callers must not proceed without it.
export function getLatLongStrict(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This device/browser cannot share location, which AEPS requires."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED
        ? "Location access is blocked. Allow location for this site and try again — AEPS requires your shop's location."
        : "Could not get your location. Ensure location/GPS is on and try again.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}
