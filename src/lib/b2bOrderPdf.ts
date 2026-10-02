import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type B2BOrderPdfData = {
  order: {
    id: string;
    created_at: string;
    status: string;
    payment_term_snapshot: string;
    total: number;
    notes?: string | null;
  };
  items: Array<{
    product_name: string;
    product_code?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  client: {
    company_name: string;
    cnpj?: string | null;
    state_registration?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address_zip?: string | null;
    address_street?: string | null;
    address_number?: string | null;
    address_complement?: string | null;
    address_neighborhood?: string | null;
    address_city?: string | null;
    address_state?: string | null;
  };
  representative: {
    company_name?: string | null;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  logoDataUrl?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCnpj = (value?: string | null) => {
  const digits = value?.replace(/\D/g, "").slice(0, 14) ?? "";
  if (digits.length !== 14) return value || "—";
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

const clean = (value?: string | null) => value?.trim() || "—";

export async function imageUrlToPngDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

export function createB2BOrderPdf(data: B2BOrderPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const orderNumber = data.order.id.slice(0, 8).toUpperCase();
  const clientState = data.client.address_state?.trim().toUpperCase();
  const hasOutOfStateDiscount = Boolean(clientState && clientState !== "MG");

  doc.setFillColor(28, 26, 24);
  doc.rect(0, 0, pageWidth, 32, "F");
  if (data.logoDataUrl) {
    try {
      doc.addImage(data.logoDataUrl, "PNG", margin, 8, 36, 16, undefined, "FAST");
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("KEPMA", margin, 19);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("KEPMA", margin, 19);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`PEDIDO B2B #${orderNumber}`, pageWidth - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(new Date(data.order.created_at).toLocaleString("pt-BR"), pageWidth - margin, 21, { align: "right" });

  doc.setTextColor(28, 26, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DADOS DO PEDIDO", margin, 43);
  doc.setDrawColor(197, 139, 49);
  doc.setLineWidth(0.7);
  doc.line(margin, 46, pageWidth - margin, 46);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Situação", margin, 53);
  doc.text("Condição de pagamento", 67, 53);
  doc.text("Política comercial", 137, 53);
  doc.setFont("helvetica", "normal");
  doc.text(STATUS_LABELS[data.order.status] || data.order.status, margin, 59);
  doc.text(clean(data.order.payment_term_snapshot), 67, 59, { maxWidth: 64 });
  doc.text(hasOutOfStateDiscount ? `14% de desconto — ${clientState}` : "Preço B2B integral — MG", 137, 59, { maxWidth: 58 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("REPRESENTANTE", margin, 72);
  doc.text("CLIENTE", 105, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const representativeLines = [
    clean(data.representative.company_name),
    `Documento: ${clean(data.representative.document)}`,
    `Telefone: ${clean(data.representative.phone)}`,
    `E-mail: ${clean(data.representative.email)}`,
  ];
  const address = [
    data.client.address_street,
    data.client.address_number,
    data.client.address_complement,
    data.client.address_neighborhood,
  ].filter(Boolean).join(", ");
  const city = [data.client.address_city, data.client.address_state].filter(Boolean).join(" / ");
  const clientLines = [
    clean(data.client.company_name),
    `CNPJ: ${formatCnpj(data.client.cnpj)}  |  IE: ${clean(data.client.state_registration)}`,
    `Contato: ${clean(data.client.contact_name)}`,
    `Telefone: ${clean(data.client.phone)}  |  E-mail: ${clean(data.client.email)}`,
    address || "Endereço: —",
    `${city || "—"}  |  CEP: ${clean(data.client.address_zip)}`,
  ];
  doc.text(representativeLines, margin, 79, { lineHeightFactor: 1.5, maxWidth: 82 });
  doc.text(clientLines, 105, 79, { lineHeightFactor: 1.5, maxWidth: 90 });

  autoTable(doc, {
    startY: 111,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [["Produto", "Código", "Qtd.", "Valor unitário", "Total"]],
    body: data.items.map((item) => [
      item.product_name,
      item.product_code || "—",
      String(item.quantity),
      formatMoney(Number(item.unit_price)),
      formatMoney(Number(item.line_total)),
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3, textColor: [28, 26, 24], lineColor: [222, 218, 212], lineWidth: 0.2 },
    headStyles: { fillColor: [28, 26, 24], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 247, 244] },
    columnStyles: {
      0: { cellWidth: 74 },
      1: { cellWidth: 28 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 31, halign: "right" },
      4: { cellWidth: 31, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: () => {
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(115, 110, 104);
      doc.text(`Pedido #${orderNumber}`, margin, pageHeight - 9);
      doc.text(`Página ${currentPage}`, pageWidth - margin, pageHeight - 9, { align: "right" });
    },
  });

  const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  let summaryY = tableEndY + 8;
  const requiredSummaryHeight = data.order.notes ? 35 : 20;
  if (summaryY + requiredSummaryHeight > pageHeight - 18) {
    doc.addPage();
    summaryY = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(28, 26, 24);
  doc.text("TOTAL DO PEDIDO", 135, summaryY + 5);
  doc.setFontSize(15);
  doc.text(formatMoney(Number(data.order.total)), pageWidth - margin, summaryY + 5, { align: "right" });
  if (data.order.notes) {
    doc.setFontSize(9);
    doc.text("OBSERVAÇÕES", margin, summaryY + 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 81, 76);
    doc.text(data.order.notes, margin, summaryY + 23, { maxWidth: pageWidth - margin * 2, lineHeightFactor: 1.4 });
  }

  return doc;
}

export async function downloadB2BOrderPdf(data: B2BOrderPdfData) {
  const doc = createB2BOrderPdf(data);
  doc.save(`pedido-b2b-${data.order.id.slice(0, 8).toLowerCase()}.pdf`);
}