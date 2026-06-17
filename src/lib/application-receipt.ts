import { jsPDF } from "jspdf";

export type AppReceipt = {
  application_no: string;
  status: string;
  created_at?: string;
  retailer_name?: string;
  full_name?: string; father_name?: string; gender?: string; phone?: string; email?: string;
  aadhaar_number?: string; pan_number?: string; address?: string;
  category_name?: string; service_name?: string;
  service_charge?: number; commission_price?: number;
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted", in_progress: "In Progress", approved: "Approved", completed: "Completed", rejected: "Rejected",
};
const fmtDate = (iso?: string) =>
  new Date(iso ?? Date.now()).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const rupee = (n?: number) => "Rs. " + Number(n || 0).toLocaleString("en-IN");
const rupeeU = (n?: number) => "₹" + Number(n || 0).toLocaleString("en-IN");

function applicantRows(r: AppReceipt): [string, string][] {
  return ([
    ["Applicant Name", r.full_name], ["Father's Name", r.father_name], ["Gender", r.gender],
    ["Phone", r.phone], ["Email", r.email], ["Aadhaar", r.aadhaar_number], ["PAN", r.pan_number],
  ].filter(([, v]) => v) as [string, string][]);
}

/* ---------------- PDF ---------------- */
export function downloadReceiptPDF(r: AppReceipt) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header band (saffron)
  doc.setFillColor(255, 145, 35); doc.rect(0, 0, W, 84, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(24);
  doc.text("BharatOne", M, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text("For Serving Indian Citizens", M, 60);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("SERVICE APPLICATION RECEIPT", W - M, 50, { align: "right" });

  // Status pill
  const status = STATUS_LABEL[r.status] ?? r.status;
  doc.setFillColor(255, 255, 255); doc.setDrawColor(255, 255, 255);
  const sw = doc.getTextWidth(status) + 24;
  doc.roundedRect(W - M - sw, 60, sw, 18, 9, 9, "F");
  doc.setTextColor(200, 90, 0); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(status, W - M - sw / 2, 72, { align: "center" });

  // App ID + Date
  let y = 116;
  doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("APPLICATION ID", M, y); doc.text("DATE", W / 2, y);
  doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(r.application_no, M, y + 18); doc.text(fmtDate(r.created_at), W / 2, y + 18);
  if (r.retailer_name) {
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("APPLIED BY (RETAILER)", M, y + 44);
    doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(r.retailer_name, M, y + 60); y += 16;
  }

  // Service box
  y += 70;
  doc.setFillColor(245, 247, 245); doc.roundedRect(M, y, W - 2 * M, 78, 8, 8, "F");
  doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("SERVICE", M + 16, y + 22); doc.text("CATEGORY", M + 16, y + 52);
  doc.text("TOTAL COST", W - M - 200, y + 22); doc.text("YOUR COMMISSION", W - M - 200, y + 52);
  doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(String(r.service_name ?? "-"), M + 16, y + 38);
  doc.text(String(r.category_name ?? "-"), M + 16, y + 68);
  doc.text(rupee(r.service_charge), W - M - 200, y + 38);
  doc.setTextColor(19, 136, 8);
  doc.text(rupee(r.commission_price), W - M - 200, y + 68);

  // Applicant section
  y += 110;
  doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Applicant Details", M, y);
  doc.setDrawColor(230, 230, 230); doc.line(M, y + 8, W - M, y + 8);
  y += 28;
  const rows = applicantRows(r);
  const colW = (W - 2 * M) / 2;
  rows.forEach((row, i) => {
    const col = i % 2; const x = M + col * colW;
    if (col === 0 && i > 0) y += 42;
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(row[0].toUpperCase(), x, y);
    doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(doc.splitTextToSize(String(row[1]), colW - 16), x, y + 15);
  });
  if (r.address) {
    y += 42;
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("ADDRESS", M, y);
    doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(doc.splitTextToSize(r.address, W - 2 * M), M, y + 15);
  }

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(230, 230, 230); doc.line(M, H - 70, W - M, H - 70);
  doc.setTextColor(140, 140, 140); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("This is a system-generated receipt and does not require a signature.", M, H - 52);
  doc.text("Track this application anytime under My Applications in your BharatOne portal.", M, H - 38);
  doc.setTextColor(255, 145, 35); doc.setFont("helvetica", "bold");
  doc.text("Thank you for using BharatOne.", M, H - 22);

  doc.save(`Receipt-${r.application_no}.pdf`);
}

/* ---------------- PNG (manual canvas) ---------------- */
export async function downloadReceiptPNG(r: AppReceipt) {
  const blob = await renderPNG(r);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Receipt-${r.application_no}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function renderPNG(r: AppReceipt): Promise<Blob> {
  const scale = 2, W = 720, H = 980;
  const c = document.createElement("canvas"); c.width = W * scale; c.height = H * scale;
  const x = c.getContext("2d")!; x.scale(scale, scale);
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  // header
  x.fillStyle = "#ff9123"; x.fillRect(0, 0, W, 110);
  x.fillStyle = "#fff"; x.font = "bold 34px Arial"; x.fillText("BharatOne", 40, 56);
  x.font = "15px Arial"; x.fillText("For Serving Indian Citizens", 40, 82);
  x.font = "bold 16px Arial"; x.textAlign = "right"; x.fillText("SERVICE APPLICATION RECEIPT", W - 40, 50);
  // status pill
  const status = STATUS_LABEL[r.status] ?? r.status;
  x.font = "bold 13px Arial"; const sw = x.measureText(status).width + 28;
  x.fillStyle = "#fff"; roundRect(x, W - 40 - sw, 66, sw, 26, 13); x.fill();
  x.fillStyle = "#c85a00"; x.textAlign = "center"; x.fillText(status, W - 40 - sw / 2, 84);
  x.textAlign = "left";
  // app id + date
  let y = 150;
  label(x, "APPLICATION ID", 40, y); label(x, "DATE", W / 2, y);
  val(x, r.application_no, 40, y + 24, "bold 20px Arial"); val(x, fmtDate(r.created_at), W / 2, y + 24, "bold 16px Arial");
  if (r.retailer_name) { y += 50; label(x, "APPLIED BY (RETAILER)", 40, y); val(x, r.retailer_name, 40, y + 22, "bold 16px Arial"); }
  // service card
  y += 60;
  x.fillStyle = "#f4f7f4"; roundRect(x, 40, y, W - 80, 110, 12); x.fill();
  label(x, "SERVICE", 60, y + 28); val(x, r.service_name ?? "-", 60, y + 52, "bold 17px Arial");
  label(x, "CATEGORY", 60, y + 80); val(x, r.category_name ?? "-", 60, y + 102, "bold 15px Arial");
  label(x, "TOTAL COST", W - 280, y + 28); val(x, rupeeU(r.service_charge), W - 280, y + 52, "bold 17px Arial");
  label(x, "YOUR COMMISSION", W - 280, y + 80);
  x.fillStyle = "#138808"; x.font = "bold 17px Arial"; x.fillText(rupeeU(r.commission_price), W - 280, y + 102);
  // applicant
  y += 150;
  x.fillStyle = "#1e1e1e"; x.font = "bold 17px Arial"; x.fillText("Applicant Details", 40, y);
  x.strokeStyle = "#e6e6e6"; x.beginPath(); x.moveTo(40, y + 10); x.lineTo(W - 40, y + 10); x.stroke();
  y += 36;
  const rows = applicantRows(r); const colW = (W - 80) / 2;
  rows.forEach((row, i) => {
    const col = i % 2; const cx = 40 + col * colW;
    if (col === 0 && i > 0) y += 54;
    label(x, row[0].toUpperCase(), cx, y); val(x, String(row[1]), cx, y + 20, "bold 15px Arial");
  });
  if (r.address) { y += 54; label(x, "ADDRESS", 40, y); val(x, r.address, 40, y + 20, "bold 14px Arial", W - 80); }
  // footer
  x.strokeStyle = "#e6e6e6"; x.beginPath(); x.moveTo(40, H - 80); x.lineTo(W - 40, H - 80); x.stroke();
  x.fillStyle = "#8c8c8c"; x.font = "12px Arial";
  x.fillText("System-generated receipt - no signature required.", 40, H - 56);
  x.fillText("Track this application under My Applications in your BharatOne portal.", 40, H - 38);
  x.fillStyle = "#ff9123"; x.font = "bold 13px Arial"; x.fillText("Thank you for using BharatOne.", 40, H - 18);

  return await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}
function label(x: CanvasRenderingContext2D, t: string, px: number, py: number) { x.fillStyle = "#8c8c8c"; x.font = "11px Arial"; x.fillText(t, px, py); }
function val(x: CanvasRenderingContext2D, t: string, px: number, py: number, font = "bold 15px Arial", maxW?: number) {
  x.fillStyle = "#1e1e1e"; x.font = font;
  if (maxW) { wrap(x, t, px, py, maxW, 18); } else x.fillText(t, px, py);
}
function wrap(x: CanvasRenderingContext2D, text: string, px: number, py: number, maxW: number, lh: number) {
  const words = String(text).split(" "); let line = ""; let yy = py;
  for (const w of words) { const test = line + w + " "; if (x.measureText(test).width > maxW && line) { x.fillText(line.trim(), px, yy); line = w + " "; yy += lh; } else line = test; }
  x.fillText(line.trim(), px, yy);
}
function roundRect(x: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number, r: number) {
  x.beginPath(); x.moveTo(rx + r, ry); x.arcTo(rx + w, ry, rx + w, ry + h, r); x.arcTo(rx + w, ry + h, rx, ry + h, r);
  x.arcTo(rx, ry + h, rx, ry, r); x.arcTo(rx, ry, rx + w, ry, r); x.closePath();
}

/* ---------------- Share ---------------- */
export async function shareReceipt(r: AppReceipt) {
  const text = `BharatOne Application Receipt\nApplication ID: ${r.application_no}\nService: ${r.service_name ?? "-"} (${r.category_name ?? "-"})\nApplicant: ${r.full_name ?? "-"}\nStatus: ${STATUS_LABEL[r.status] ?? r.status}\nDate: ${fmtDate(r.created_at)}`;
  try {
    const blob = await renderPNG(r);
    const file = new File([blob], `Receipt-${r.application_no}.png`, { type: "image/png" });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ title: "BharatOne Application Receipt", text, files: [file] });
      return;
    }
    if (nav.share) { await nav.share({ title: "BharatOne Application Receipt", text }); return; }
  } catch { /* fall through */ }
  try { await navigator.clipboard.writeText(text); return "copied"; } catch { return "failed"; }
}
