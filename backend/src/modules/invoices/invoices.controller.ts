import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import { buildInvoicePdf } from '../../lib/pdf';
import * as service from './invoices.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listInvoices(p, req.query.paymentStatus as string | undefined));
  } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getInvoice(req.params.id as string)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createInvoice(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function updatePayment(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updatePaymentStatus(req.params.id as string, req.body.paymentStatus)); } catch (e) { next(e); }
}
export async function pdf(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await service.getInvoice(req.params.id as string);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    const doc = buildInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      customer: invoice.customer,
      items: invoice.challan.items,
      subtotal: invoice.subtotal, gstPercent: invoice.gstPercent, gstAmount: invoice.gstAmount, totalAmount: invoice.totalAmount,
    });
    doc.pipe(res);
  } catch (e) { next(e); }
}
