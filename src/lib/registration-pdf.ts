import { jsPDF } from "jspdf";

// Fetch an image (via its signed URL) and normalise it to a JPEG data URL using
// a canvas, so any source format (jpg/webp/jfif/png/heic-decoded) embeds cleanly.
async function toJpegDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    if (blob.type === "application/pdf") return null; // PDFs handled separately
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = objUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w: canvas.width, h: canvas.height };
    } finally { URL.revokeObjectURL(objUrl); }
  } catch { return null; }
}

export type PdfDoc = { label: string; url: string; isPdf?: boolean };

export async function downloadRegistrationPDF(
  reg: Record<string, any>,
  docs: PdfDoc[],
  fileBase: string,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = 0;

  // Header band
  doc.setFillColor(255, 145, 35); doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("BharatOne", M, 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Registration Details", M, 52);
  doc.setFontSize(10);
  doc.text(String(reg.application_id || ""), W - M, 34, { align: "right" });
  doc.text(String(reg.jsko_id || reg.distributor_id || ""), W - M, 52, { align: "right" });
  y = 92;

  const section = (title: string, rows: [string, any][]) => {
    const clean = rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "—");
    if (!clean.length) return;
    if (y > H - 80) { doc.addPage(); y = M; }
    doc.setTextColor(255, 145, 35); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(title, M, y); y += 6;
    doc.setDrawColor(230); doc.line(M, y, W - M, y); y += 16;
    doc.setTextColor(40); doc.setFontSize(10);
    for (const [k, v] of clean) {
      if (y > H - 50) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(String(v), W - M - 180);
      doc.text(lines, M + 170, y);
      y += Math.max(16, lines.length * 14);
    }
    y += 10;
  };

  section("Applicant", [
    ["Name", [reg.first_name, reg.middle_name, reg.surname].filter(Boolean).join(" ")],
    ["Date of Birth", reg.dob], ["Mobile", reg.mobile], ["Email", reg.email],
    ["Application ID", reg.application_id], ["Agent / JSKO ID", reg.jsko_id],
    ["Registration Type", reg.registration_type], ["Status", reg.status],
    ["PAN", reg.pan_number], ["Aadhaar", reg.aadhaar_number],
  ]);
  section("Business", [
    ["Shop Name", reg.shop_name], ["Address Type", reg.address_type],
    ["Address", [reg.building_shop_no, reg.street_area, reg.village_name, reg.taluk, reg.city, reg.district, reg.state].filter(Boolean).join(", ")],
    ["Pincode", reg.pincode], ["GPS", (reg.latitude && reg.longitude) ? `${reg.latitude}, ${reg.longitude}` : ""],
  ]);
  section("Bank Details", [
    ["Account Holder", reg.bank_holder_name], ["Bank", reg.bank_name],
    ["Account No", reg.account_number], ["IFSC", reg.ifsc], ["Account Type", reg.account_type],
  ]);
  section("Payment", [
    ["Amount", reg.payment_amount != null ? `Rs. ${Number(reg.payment_amount).toLocaleString("en-IN")}` : ""],
    ["Method", reg.payment_method], ["UTR / Reference", reg.payment_utr],
    ["Paid On", reg.payment_paid_on], ["Payer", reg.payer_name],
  ]);
  if (reg.accountant_decision || reg.rejection_reason) {
    section("Review", [["Decision", reg.accountant_decision], ["Remark", reg.rejection_reason]]);
  }

  // Attachments (images only — Video KYC excluded by caller)
  for (const d of docs) {
    if (d.isPdf) {
      if (y > H - 60) { doc.addPage(); y = M; }
      doc.setTextColor(255, 145, 35); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text(d.label, M, y); y += 16;
      doc.setTextColor(120); doc.setFont("helvetica", "italic"); doc.setFontSize(10);
      doc.text("(PDF attachment — available in the portal)", M, y); y += 22;
      continue;
    }
    const img = await toJpegDataUrl(d.url);
    if (!img) continue;
    doc.addPage(); y = M;
    doc.setTextColor(255, 145, 35); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(d.label, M, y); y += 18;
    const maxW = W - M * 2, maxH = H - y - M;
    const ratio = Math.min(maxW / img.w, maxH / img.h);
    const dw = img.w * ratio, dh = img.h * ratio;
    doc.addImage(img.dataUrl, "JPEG", M, y, dw, dh);
  }

  const safe = String(fileBase || reg.application_id || "registration").replace(/[^\w.-]+/g, "_");
  doc.save(`${safe}.pdf`);
}
