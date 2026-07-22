import PDFDocument from 'pdfkit';

interface InvoicePdfData {
  invoiceNumber: string;
  createdAt: Date;
  customer: { name: string; businessName?: string | null; gstNumber?: string | null; address?: string | null };
  items: { productName: string; productSku: string; unitPrice: unknown; quantity: number }[];
  subtotal: unknown; gstPercent: unknown; gstAmount: unknown; totalAmount: unknown;
}

export function buildInvoicePdf(data: InvoicePdfData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(20).text('INVOICE', { align: 'right' });
  doc.fontSize(10).text(`No: ${data.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text('Bill To:');
  doc.fontSize(10).text(data.customer.businessName ?? data.customer.name);
  if (data.customer.gstNumber) doc.text(`GST: ${data.customer.gstNumber}`);
  if (data.customer.address) doc.text(data.customer.address);
  doc.moveDown();

  doc.fontSize(11).text('Items', { underline: true });
  data.items.forEach((i) => {
    doc.fontSize(10).text(`${i.productName} (${i.productSku})  x${i.quantity}  @ ${Number(i.unitPrice).toFixed(2)}  = ${(Number(i.unitPrice) * i.quantity).toFixed(2)}`);
  });
  doc.moveDown();
  doc.text(`Subtotal: ${Number(data.subtotal).toFixed(2)}`, { align: 'right' });
  doc.text(`GST (${Number(data.gstPercent)}%): ${Number(data.gstAmount).toFixed(2)}`, { align: 'right' });
  doc.fontSize(12).text(`Total: ${Number(data.totalAmount).toFixed(2)}`, { align: 'right' });
  doc.end();
  return doc;
}
