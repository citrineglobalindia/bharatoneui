// The printable BharatOne ID card, front and back.
//
// Everything here is sized in millimetres, not pixels. The card is a standard
// CR80 portrait — 53.98 × 85.6 mm — which is what every card printer and every
// lanyard holder expects. Laying it out in pixels and hoping the print scale
// works out produces a card that is a millimetre out and rattles in the holder.
//
// The artwork is inline SVG rather than an image file so it stays sharp at any
// print resolution, and so the colours survive a PDF export.
import logoUrl from "@/assets/bharatone-logo.png";

export const CARD_W_MM = 53.98;
export const CARD_H_MM = 85.6;

const ORANGE = "#FF6B1A";
const GREEN = "#0E8A3E";

export type CardData = {
  name: string;
  designation: string | null;
  card_no: string;
  blood_group: string | null;
  phone: string | null;
  photo_url: string | null;
  dob: string | null;
  date_of_joining: string | null;
  work_location: string | null;
  verify_token: string | null;
  company_name: string;
  company_address: string;
  office_contact: string;
  signature_url: string | null;
  qr_url: string | null;
};

const upper = (s: string | null | undefined) => (s ?? "").toUpperCase();

const inDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  return `${day} ${month} ${d.getFullYear()}`;
};

/* ── shared frame ─────────────────────────────────────────────────────── */

// The tricolour sweep. Drawn as two nested arcs so the orange and green read as
// one ribbon rather than two separate shapes.
function Frame({ side }: { side: "front" | "back" }) {
  return (
    <svg viewBox="0 0 540 856" className="bo-card-frame" preserveAspectRatio="none" aria-hidden="true">
      {side === "front" ? (
        <>
          {/* Top-right and bottom-left corners only. These are ribbons hugging
              the corners, not sweeps across the card — the first attempt used
              large filled wedges and they covered the name and the ID fields. */}
          <path d="M382 0 Q540 0 540 192" fill="none" stroke={ORANGE} strokeWidth="38" />
          <path d="M426 0 Q540 0 540 148 L540 0 Z" fill={GREEN} />
          <path d="M0 716 Q0 856 178 856" fill="none" stroke={GREEN} strokeWidth="40" />
          <path d="M0 764 Q0 856 130 856 L0 856 Z" fill={ORANGE} />
        </>
      ) : (
        <>
          {/* A slim band down the left edge and a corner at the bottom right,
              both kept clear of the text column. */}
          {/* The left band bulges only slightly. A deeper curve looked better in
              isolation but ran straight through the metadata labels. */}
          <path d="M20 -20 Q52 428 20 876" fill="none" stroke={GREEN} strokeWidth="44" />
          <path d="M-14 -20 Q10 428 -14 876" fill="none" stroke={ORANGE} strokeWidth="44" />
          <path d="M540 668 Q470 782 416 856 L540 856 Z" fill={ORANGE} />
          <path d="M540 722 Q488 804 452 856 L540 856 Z" fill={GREEN} />
        </>
      )}
    </svg>
  );
}

// The company name printed sideways up the right edge, as on the sample card.
const EdgeText = ({ text }: { text: string }) => (
  <div className="bo-card-edge">{upper(text)}</div>
);

/* ── front ────────────────────────────────────────────────────────────── */

export function IdCardFront({ d }: { d: CardData }) {
  return (
    <div className="bo-card" data-side="front">
      <Frame side="front" />
      <EdgeText text={d.company_name} />

      <div className="bo-card-body">
        <img src={logoUrl} alt="BharatOne" className="bo-logo" />

        <p className="bo-company">{upper(d.company_name)}</p>

        <div className="bo-photo">
          {d.photo_url
            ? <img src={d.photo_url} alt="" />
            : <span className="bo-photo-empty">No photo</span>}
        </div>

        <p className="bo-name">{upper(d.name)}</p>
        <p className="bo-role">{upper(d.designation) || "EMPLOYEE"}</p>

        <dl className="bo-fields">
          <dt>EMPLOYEE ID :</dt><dd>{d.card_no}</dd>
          <dt>BLOOD GROUP :</dt><dd>{upper(d.blood_group) || "—"}</dd>
          <dt>PHONE :</dt><dd>{d.phone ? (/^\d{10}$/.test(d.phone) ? `+91 ${d.phone}` : d.phone) : "—"}</dd>
        </dl>

        <div className="bo-sign">
          {d.signature_url && <img src={d.signature_url} alt="" />}
          <p>AUTHORIZED SIGNATURE</p>
        </div>
      </div>
    </div>
  );
}

/* ── back ─────────────────────────────────────────────────────────────── */

const TERMS: [string, string][] = [
  ["Non-Transferable:", "This card is issued to the individual named and is non-transferable. It must not be used by anyone other than the cardholder."],
  ["Property of Issuer:", "The card remains the property of the issuing authority and must be surrendered upon request."],
  ["Loss or Theft:", "In case of loss or theft, the cardholder must notify the issuing authority immediately to prevent unauthorized use."],
  ["Card Validity:", "The card is valid only for the period mentioned and must be renewed upon expiration for continued use."],
  ["Tampering Prohibited:", "Any tampering, alteration, or unauthorized duplication of this card is strictly prohibited and may result in legal action."],
];

export function IdCardBack({ d }: { d: CardData }) {
  return (
    <div className="bo-card" data-side="back">
      <Frame side="back" />
      <EdgeText text={d.company_name} />

      <div className="bo-card-body bo-back">
        <img src={logoUrl} alt="BharatOne" className="bo-logo bo-logo-sm" />

        <p className="bo-company">{upper(d.company_name)}</p>
        <p className="bo-address">{upper(d.company_address)}</p>

        <dl className="bo-meta">
          <dt>DATE OF BIRTH</dt><dd>{inDate(d.dob)}</dd>
          <dt>JOINING DATE</dt><dd>{inDate(d.date_of_joining)}</dd>
          <dt>WORK AREA</dt><dd>{upper(d.work_location) || "—"}</dd>
          <dt>OFFICE CONTACT</dt><dd>{d.office_contact || "—"}</dd>
        </dl>

        <p className="bo-terms-title">TERMS AND CONDITIONS</p>
        <div className="bo-terms">
          {TERMS.map(([head, body]) => (
            <p key={head}><strong>{head}</strong> {body}</p>
          ))}
        </div>

        <div className="bo-qr">
          {d.qr_url
            ? <img src={d.qr_url} alt="Scan to verify this card" />
            : <div className="bo-qr-empty">QR</div>}
        </div>

        <p className="bo-site">
          <span aria-hidden="true">🌐</span> www.mybharatone.com
        </p>
      </div>
    </div>
  );
}

/* ── styles ───────────────────────────────────────────────────────────── */

// Injected once. Kept as a plain string rather than Tailwind classes because the
// card must be laid out in millimetres, and because the print sheet renders it
// in a context where the app's utility classes are not what we want anyway.
export const ID_CARD_CSS = `
.bo-card{position:relative;width:${CARD_W_MM}mm;height:${CARD_H_MM}mm;background:#fff;
  overflow:hidden;box-sizing:border-box;color:#111;
  font-family:ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.bo-card-frame{position:absolute;inset:0;width:100%;height:100%;}
.bo-card-edge{position:absolute;right:0.4mm;top:50%;transform:translateY(-50%) rotate(180deg);
  writing-mode:vertical-rl;font-size:1.5mm;font-weight:700;letter-spacing:0.03em;color:#111;}
.bo-card-body{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  padding:3.4mm 4.6mm 2.6mm;}

.bo-logo{height:6mm;width:auto;margin-top:0.8mm;}
.bo-logo-sm{height:5mm;margin-top:0.4mm;}
/* The company name is one line on the sample card. nowrap plus a touch of
   negative tracking keeps it that way without relying on a specific font. */
.bo-company{margin:1.7mm 0 0;font-size:1.78mm;font-weight:800;text-align:center;
  line-height:1.2;white-space:nowrap;letter-spacing:-0.012em;}
.bo-address{margin:0.7mm 0 0;font-size:1.45mm;font-weight:700;text-align:center;
  line-height:1.25;white-space:nowrap;letter-spacing:-0.012em;}

.bo-photo{margin-top:2.4mm;width:20mm;height:24.5mm;border-radius:2.6mm;overflow:hidden;
  background:#efece8;display:flex;align-items:center;justify-content:center;flex:none;}
.bo-photo img{width:100%;height:100%;object-fit:cover;display:block;}
.bo-photo-empty{font-size:2mm;color:#8a8a8a;}

.bo-name{margin:3mm 0 0;font-size:3.9mm;font-weight:800;text-align:center;line-height:1.12;}
.bo-role{margin:0.9mm 0 0;font-size:2.9mm;font-weight:500;text-align:center;line-height:1.15;}

.bo-fields{margin:2.8mm 0 0;display:grid;grid-template-columns:auto auto;
  column-gap:2mm;row-gap:1.4mm;align-items:baseline;}
.bo-fields dt{font-size:2.3mm;font-weight:500;text-align:right;white-space:nowrap;}
.bo-fields dd{margin:0;font-size:2.3mm;font-weight:600;white-space:nowrap;}

.bo-sign{margin-top:auto;padding-top:1.6mm;text-align:center;width:100%;}
.bo-sign img{height:5.4mm;width:auto;margin:0 auto -1.2mm;display:block;}
.bo-sign p{margin:0;font-size:2.2mm;font-weight:500;}

/* The back is the tight one: five clauses of terms, a QR and a metadata block
   all inside 85.6 mm. Every size below is chosen so the total column height
   lands just under the card, with the QR pinned to the bottom by margin-top
   auto — if a value here grows, something has to shrink to pay for it. */
.bo-back{padding:2.6mm 4.2mm 2.2mm 6.4mm;}
.bo-meta{margin:2.2mm 0 0;width:100%;display:grid;grid-template-columns:auto 1fr;
  column-gap:3.4mm;row-gap:0.45mm;padding-left:1.6mm;}
.bo-meta dt{font-size:1.95mm;font-weight:500;white-space:nowrap;}
.bo-meta dd{margin:0;font-size:1.95mm;font-weight:500;}

.bo-terms-title{margin:2mm 0 0;font-size:2mm;font-weight:800;text-align:center;}
.bo-terms{margin-top:0.8mm;width:100%;}
.bo-terms p{margin:0 0 0.65mm;font-size:1.5mm;line-height:1.26;text-align:left;}
.bo-terms strong{font-weight:800;}

.bo-qr{margin-top:auto;padding-top:1.4mm;align-self:flex-start;width:13.5mm;height:13.5mm;}
.bo-qr img{width:100%;height:100%;display:block;}
.bo-qr-empty{width:100%;height:100%;border:0.3mm dashed #bbb;display:flex;
  align-items:center;justify-content:center;font-size:2mm;color:#bbb;}
.bo-site{margin:0.9mm 0 0;align-self:flex-start;font-size:1.9mm;font-weight:600;}

/* Screen preview only — never printed. */
.bo-card-shadow{box-shadow:0 2px 14px rgba(0,0,0,.16);border-radius:2mm;}

/* ── gallery thumbnails ───────────────────────────────────────────────
   The grid shows the REAL card scaled down rather than a simplified tile, so
   what HR sees on screen is what comes out of the printer. --s is the scale
   factor; the wrapper is sized from the same millimetre values so the layout
   reflows correctly at any zoom level. */
.bo-thumb{position:relative;perspective:900px;
  width:calc(${CARD_W_MM}mm * var(--s));height:calc(${CARD_H_MM}mm * var(--s));}
.bo-flip{position:absolute;top:0;left:0;width:${CARD_W_MM}mm;height:${CARD_H_MM}mm;
  transform-origin:top left;transform:scale(var(--s));
  transform-style:preserve-3d;transition:transform .5s ease;}
.bo-thumb[data-face="back"] .bo-flip{transform:scale(var(--s)) rotateY(180deg);}
.bo-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;
  border-radius:2mm;overflow:hidden;box-shadow:0 1px 10px rgba(0,0,0,.14);}
.bo-face--back{transform:rotateY(180deg);}
`;
