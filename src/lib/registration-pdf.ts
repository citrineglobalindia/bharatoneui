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

  section("Applicant / Personal", [
    ["Name", [reg.first_name, reg.middle_name, reg.surname].filter(Boolean).join(" ") || reg.distributor_name || reg.proprietor_name],
    ["Proprietor", reg.proprietor_name], ["Company / Firm", reg.company_name],
    ["Date of Birth", reg.dob], ["Gender", reg.gender],
    ["Mobile", reg.mobile], ["Alternate Mobile", reg.alt_mobile], ["Email", reg.email],
    ["Application ID", reg.application_id], ["Agent / JSKO / Distributor ID", reg.jsko_id || reg.distributor_id],
    ["Username", reg.username], ["Registration Type", reg.registration_type], ["Status", reg.status],
    ["PAN", reg.pan_number], ["Aadhaar", reg.aadhaar_number], ["GST", reg.gst_number], ["Group", reg.group_name],
  ]);
  section("Business / Address", [
    ["Shop / Firm Name", reg.shop_name || reg.company_name], ["Address Type", reg.address_type],
    ["Building / Shop No", reg.building_shop_no], ["Street / Area", reg.street_area],
    ["Ward Number", reg.ward_number], ["Landmark", reg.landmark],
    ["Village", reg.village_name], ["Gram Panchayat", reg.gram_panchayat], ["Hobli", reg.hobli_name],
    ["Post Office", reg.post_office_name || reg.post_office], ["Taluk", reg.taluk],
    ["City", reg.city], ["District", reg.district], ["State", reg.state], ["Pincode", reg.pincode],
    ["Full Address", reg.address_line],
    ["GPS", (reg.latitude && reg.longitude) ? `${reg.latitude}, ${reg.longitude}` : (reg.video_kyc_lat && reg.video_kyc_lng) ? `${reg.video_kyc_lat}, ${reg.video_kyc_lng}` : ""],
  ]);
  section("Bank Details", [
    ["Account Holder", reg.bank_holder_name || reg.proprietor_name], ["Bank", reg.bank_name],
    ["Account No", reg.account_number], ["IFSC", reg.ifsc], ["Account Type", reg.account_type],
  ]);
  section("Payment", [
    ["Amount", reg.payment_amount != null ? `Rs. ${Number(reg.payment_amount).toLocaleString("en-IN")}` : ""],
    ["Method", reg.payment_method], ["UTR / Reference", reg.payment_utr],
    ["Paid On", reg.payment_paid_on], ["Payer Name", reg.payer_name],
    ["Payer Bank", reg.payer_bank], ["Payer Account", reg.payer_account],
    ["Transaction ID", reg.transaction_id], ["Payment Remarks", reg.payment_remarks],
  ]);
  section("Review / Status", [
    ["Accountant Decision", reg.accountant_decision],
    ["Remark / Reason", reg.rejection_reason || reg.payment_verification_notes],
    ["Payment Verified", reg.payment_verified === true ? "Yes" : reg.payment_verified === false ? "No" : ""],
    ["QC Verified", reg.qc_verified === true ? "Yes" : reg.qc_verified === false ? "No" : ""],
    ["QC Remarks", reg.qc_notes], ["Declaration Agreed", reg.declaration_agreed === true ? "Yes" : ""],
    ["Submitted On", reg.created_at ? new Date(reg.created_at).toLocaleString("en-IN") : ""],
  ]);

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
