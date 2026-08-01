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
          {/* top right */}
          <path d="M168 0 C300 0 420 62 540 176 L540 0 Z" fill={ORANGE} />
          <path d="M262 0 C372 0 456 46 540 132 L540 176 C420 62 300 0 168 0 Z" fill={GREEN} />
          {/* bottom left */}
          <path d="M0 856 L0 512 C90 618 168 726 232 856 Z" fill={GREEN} />
          <path d="M0 512 L0 452 C112 566 200 700 268 856 L232 856 C168 726 90 618 0 512 Z" fill={ORANGE} />
        </>
      ) : (
        <>
          {/* left ribbon */}
          <path d="M0 96 C86 190 128 320 128 428 C128 552 74 690 0 790 Z" fill={ORANGE} />
          <path d="M0 96 L0 34 C104 150 152 300 152 428 C152 570 92 706 0 812 L0 790 C74 690 128 552 128 428 C128 320 86 190 0 96 Z" fill={GREEN} />
          {/* bottom right */}
          <path d="M540 528 C452 610 396 720 372 856 L540 856 Z" fill={GREEN} />
          <path d="M540 470 C436 560 372 700 344 856 L372 856 C396 720 452 610 540 528 Z" fill={ORANGE} />
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

.bo-logo{height:6.4mm;width:auto;margin-top:1.2mm;}
.bo-logo-sm{height:5.6mm;margin-top:0.6mm;}
.bo-company{margin:2.2mm 0 0;font-size:2.05mm;font-weight:800;text-align:center;line-height:1.25;}
.bo-address{margin:0.8mm 0 0;font-size:1.72mm;font-weight:700;text-align:center;line-height:1.3;}

.bo-photo{margin-top:2.8mm;width:21mm;height:26mm;border-radius:2.6mm;overflow:hidden;
  background:#efece8;display:flex;align-items:center;justify-content:center;flex:none;}
.bo-photo img{width:100%;height:100%;object-fit:cover;display:block;}
.bo-photo-empty{font-size:2mm;color:#8a8a8a;}

.bo-name{margin:3.4mm 0 0;font-size:4.1mm;font-weight:800;text-align:center;line-height:1.15;}
.bo-role{margin:1mm 0 0;font-size:3.1mm;font-weight:500;text-align:center;}

.bo-fields{margin:3.2mm 0 0;display:grid;grid-template-columns:auto auto;
  column-gap:2.2mm;row-gap:1.6mm;align-items:baseline;}
.bo-fields dt{font-size:2.5mm;font-weight:500;text-align:right;}
.bo-fields dd{margin:0;font-size:2.5mm;font-weight:600;}

.bo-sign{margin-top:auto;text-align:center;width:100%;}
.bo-sign img{height:6mm;width:auto;margin:0 auto -1.4mm;display:block;}
.bo-sign p{margin:0;font-size:2.3mm;font-weight:500;}

.bo-back{padding:3mm 4.4mm 2.4mm;}
.bo-meta{margin:2.6mm 0 0;width:100%;display:grid;grid-template-columns:auto 1fr;
  column-gap:4mm;row-gap:0.7mm;padding-left:3mm;}
.bo-meta dt{font-size:2.1mm;font-weight:500;}
.bo-meta dd{margin:0;font-size:2.1mm;font-weight:500;}

.bo-terms-title{margin:2.4mm 0 0;font-size:2.15mm;font-weight:800;text-align:center;}
.bo-terms{margin-top:1mm;width:100%;}
.bo-terms p{margin:0 0 0.9mm;font-size:1.78mm;line-height:1.32;text-align:left;}
.bo-terms strong{font-weight:800;}

.bo-qr{margin-top:auto;align-self:flex-start;width:16mm;height:16mm;}
.bo-qr img{width:100%;height:100%;display:block;}
.bo-qr-empty{width:100%;height:100%;border:0.3mm dashed #bbb;display:flex;
  align-items:center;justify-content:center;font-size:2mm;color:#bbb;}
.bo-site{margin:1.2mm 0 0;align-self:flex-start;font-size:2.05mm;font-weight:600;}

/* Screen preview only — never printed. */
.bo-card-shadow{box-shadow:0 2px 14px rgba(0,0,0,.16);border-radius:2mm;}
`;
