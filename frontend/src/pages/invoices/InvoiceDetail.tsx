import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

interface InvoiceFull {
  id: string; invoiceNumber: string; subtotal: string; gstPercent: string; gstAmount: string; totalAmount: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid'; customer: { name: string };
  challan: { items: { id: string; productName: string; productSku: string; unitPrice: string; quantity: number }[] };
}

export function InvoiceDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: inv } = useQuery({ queryKey: ['invoice', id], queryFn: async () => (await api.get<InvoiceFull>(`/invoices/${id}`)).data });

  const setStatus = useMutation({
    mutationFn: (paymentStatus: string) => api.put(`/invoices/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  function downloadPdf() {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => window.open(URL.createObjectURL(blob)));
  }

  if (!inv) return <p>Loading…</p>;
  return (
    <div>
      <PageHeader title={inv.invoiceNumber} action={<StatusBadge value={inv.paymentStatus} />} />
      <p className="mb-4 text-gray-600">Customer: {inv.customer.name}</p>
      <table className="w-full text-sm bg-white rounded-lg shadow mb-4">
        <thead className="bg-gray-100 text-left"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Price</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Total</th></tr></thead>
        <tbody>
          {inv.challan.items.map((it) => (
            <tr key={it.id} className="border-t"><td className="px-4 py-2">{it.productName}</td><td className="px-4 py-2">₹{Number(it.unitPrice).toFixed(2)}</td><td className="px-4 py-2">{it.quantity}</td><td className="px-4 py-2">₹{(Number(it.unitPrice) * it.quantity).toFixed(2)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="text-right space-y-1 mb-4">
        <div>Subtotal: ₹{Number(inv.subtotal).toFixed(2)}</div>
        <div>GST ({Number(inv.gstPercent)}%): ₹{Number(inv.gstAmount).toFixed(2)}</div>
        <div className="font-semibold text-lg">Total: ₹{Number(inv.totalAmount).toFixed(2)}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={downloadPdf} className="bg-gray-800 text-white px-4 py-2 rounded">Download PDF</button>
        <select className="border rounded px-3 py-2" value={inv.paymentStatus} onChange={(e) => setStatus.mutate(e.target.value)}>
          <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
        </select>
      </div>
    </div>
  );
}
