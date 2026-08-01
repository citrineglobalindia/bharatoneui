// Renders the QR code printed on the back of a BharatOne ID card.
//
// Why this is a server function rather than a browser library: adding a QR
// package to the web app means changing package.json and the lockfile, and the
// card only ever needs a QR for a card that already exists. Doing it here keeps
// the front end dependency-free and lets the SVG be dropped straight into an
// <img> tag by the print sheet.
//
// It will only encode a token that belongs to a real card. Without that check
// this would be an open QR generator on BharatOne's domain, which is exactly the
// kind of thing that ends up embedded in someone else's phishing page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4";

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://mybharatone.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  // 12 base64url characters from 9 random bytes. Reject anything else without
  // touching the database.
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) {
    return new Response("Bad token", { status: 400, headers: cors });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await svc
    .from("hr_id_cards").select("id").eq("verify_token", token).maybeSingle();
  if (error) return new Response("Lookup failed", { status: 500, headers: cors });
  if (!data) return new Response("Unknown card", { status: 404, headers: cors });

  // Error correction level H (30%). A card gets scuffed in a wallet, and the
  // payload is short enough that the extra redundancy costs nothing.
  const qr = qrcode(0, "H");
  qr.addData(`${SITE}/verify/${token}`);
  qr.make();

  const count = qr.getModuleCount();
  const quiet = 4;                       // required quiet zone, in modules
  const size = count + quiet * 2;
  let path = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="Scan to verify this ID card">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path d="${path}" fill="#000"/></svg>`;

  return new Response(svg, {
    headers: {
      ...cors,
      "Content-Type": "image/svg+xml; charset=utf-8",
      // The QR for a given token never changes, so let the browser and the CDN
      // keep it. Printing a sheet of 20 cards should not be 20 round trips.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
});
