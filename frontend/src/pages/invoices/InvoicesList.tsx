import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Invoice, Paginated, Challan } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function InvoicesList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [challanId, setChallanId] = useState('');

  const { data } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => (await api.get<Paginated<Invoice>>('/invoices', { params: { page } })).data,
  });
  const { data: challans } = useQuery({
    queryKey: ['challans', 'confirmed'],
    queryFn: async () => (await api.get<Paginated<Challan>>('/challans', { params: { status: 'confirmed', limit: 100 } })).data,
  });

  const create = useMutation({
    mutationFn: () => api.post<Invoice>('/invoices', { challanId }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['invoices'] }); setOpen(false); nav(`/invoices/${res.data.id}`); },
  });

  return (
    <div>
      <PageHeader title="Invoices" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">New Invoice</button>} />
      <DataTable
        columns={[
          { header: 'Number', render: (i) => i.invoiceNumber },
          { header: 'Customer', render: (i) => i.customer?.name ?? '—' },
          { header: 'Total', render: (i) => `₹${Number(i.totalAmount).toFixed(2)}` },
          { header: 'Payment', render: (i) => <StatusBadge value={i.paymentStatus} /> },
          { header: 'Date', render: (i) => i.createdAt.slice(0, 10) },
        ]}
        rows={data?.data ?? []}
        onRowClick={(i) => nav(`/invoices/${i.id}`)}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="Create Invoice from Challan" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <select className="w-full border rounded px-3 py-2" value={challanId} onChange={(e) => setChallanId(e.target.value)}>
            <option value="">Select confirmed challan</option>
            {challans?.data.map((c) => <option key={c.id} value={c.id}>{c.challanNumber} — {c.customer?.name}</option>)}
          </select>
          <button disabled={!challanId} onClick={() => create.mutate()} className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50">Generate</button>
          {create.isError && <p className="text-red-600 text-sm">Failed — challan may already be invoiced.</p>}
        </div>
      </Modal>
    </div>
  );
}
