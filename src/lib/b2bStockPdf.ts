import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type B2BStockPdfData = {
  products: Array<{ bling_code?: string | null; name: string; category?: string | null; stock_quantity: number }>;
  representative: { company_name?: string | null; phone?: string | null; email?: string | null };
  logoDataUrl?: string | null;
};

export function createB2BStockPdf(data: B2BStockPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const issuedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const rows = data.products
    .filter((p) => Number(p.stock_quantity) > 0)
    .sort((a, b) => (a.category || "").localeCompare(b.category || "", "pt-BR") || a.name.localeCompare(b.name, "pt-BR"));
  const totalUnits = rows.reduce((sum, p) => sum + Number(p.stock_quantity), 0);

  doc.setFillColor(28, 26, 24);
  doc.rect(0, 0, pageWidth, 32, "F");
  let logoDrawn = false;
  if (data.logoDataUrl) {
    try { doc.addImage(data.logoDataUrl, "PNG", margin, 8, 36, 16, undefined, "FAST"); logoDrawn = true; } catch { /* fallback */ }
  }
  doc.setTextColor(255, 255, 255);
  if (!logoDrawn) { doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("KEPMA", margin, 19); }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DISPONIBILIDADE DE ESTOQUE", pageWidth - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Emitido em ${issuedAt}`, pageWidth - margin, 21, { align: "right" });

  doc.setTextColor(28, 26, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("REPRESENTANTE", margin, 43);
  doc.text("RESUMO", 125, 43);
  doc.setDrawColor(197, 139, 49);
  doc.setLineWidth(0.7);
  doc.line(margin, 46, pageWidth - margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const rep = data.representative;
  doc.text([rep.company_name?.trim() || "—", `Telefone: ${rep.phone?.trim() || "—"}`, `E-mail: ${rep.email?.trim() || "—"}`], margin, 53, { lineHeightFactor: 1.5, maxWidth: 100 });
  doc.text([`Produtos disponíveis: ${rows.length}`, `Unidades disponíveis: ${totalUnits.toLocaleString("pt-BR")}`], 125, 53, { lineHeightFactor: 1.5 });

  autoTable(doc, {
    startY: 70,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [["Código", "Produto", "Categoria", "Disponível"]],
    body: rows.length
      ? rows.map((p) => [p.bling_code || "—", p.name, p.category || "—", Number(p.stock_quantity).toLocaleString("pt-BR")])
      : [["—", "Nenhum produto com estoque disponível", "—", "0"]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.6, textColor: [28, 26, 24], lineColor: [222, 218, 212], lineWidth: 0.2 },
    headStyles: { fillColor: [28, 26, 24], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 247, 244] },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 92 }, 2: { cellWidth: 36 }, 3: { cellWidth: 22, halign: "right", fontStyle: "bold" } },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(115, 110, 104);
      doc.text(`Disponibilidade Kepma — ${issuedAt}`, margin, pageHeight - 9);
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 9, { align: "right" });
    },
  });
  return doc;
}

export function downloadB2BStockPdf(data: B2BStockPdfData) {
  const stamp = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }).split("/").reverse().join("-");
  createB2BStockPdf(data).save(`disponibilidade-kepma-${stamp}.pdf`);
}
