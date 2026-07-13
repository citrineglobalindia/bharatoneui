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
};

// Ports used by the common Indian RD services.
const RD_PORTS = [11100, 11101, 11102, 11103, 11104, 11105];

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

/** Find the RD service by probing the known localhost ports. */
export async function discoverDevice(): Promise<RdDevice | null> {
  for (const scheme of ["http", "https"]) {
    for (const port of RD_PORTS) {
      const base = `${scheme}://127.0.0.1:${port}`;
      try {
        const xml = await rdFetch(`${base}/`, "RDSERVICE", undefined, 2500);
        if (!xml || !xml.includes("RDService")) continue;
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const node = doc.getElementsByTagName("RDService")[0];
        const status = node?.getAttribute("status") ?? "";
        const info = node?.getAttribute("info") ?? "";
        if (status.toUpperCase() === "READY") return { port, base, info, status };
      } catch {
        // port closed / blocked — keep probing
      }
    }
  }
  return null;
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
  const wadh = opts.wadh ?? AEPS_WADH;

  // format="0" => PID Data type="X" (XML), which is what Eko expects.
  const pidOptions =
    `<?xml version="1.0"?>` +
    `<PidOptions ver="1.0">` +
    `<Opts fCount="1" fType="${fType}" iCount="0" pCount="0" format="0" ` +
    `pidVer="2.0" timeout="${timeout}" posh="UNKNOWN" env="P" wadh="${wadh}" />` +
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
  };
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
