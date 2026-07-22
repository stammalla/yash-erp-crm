import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Challan, Paginated } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ChallanForm } from './ChallanForm';
import type { ChallanInput } from './ChallanForm';

export function ChallansList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['challans', status, page],
    queryFn: async () => (await api.get<Paginated<Challan>>('/challans', { params: { status: status || undefined, page } })).data,
  });

  const create = useMutation({
    mutationFn: (v: ChallanInput) => api.post<Challan>('/challans', v),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['challans'] }); setOpen(false); nav(`/challans/${res.data.id}`); },
  });

  return (
    <div>
      <PageHeader title="Sales Challans" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">New Challan</button>} />
      <select className="mb-4 border rounded px-3 py-2" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option><option value="draft">Draft</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option>
      </select>
      <DataTable
        columns={[
          { header: 'Number', render: (c) => c.challanNumber },
          { header: 'Customer', render: (c) => c.customer?.name ?? '—' },
          { header: 'Qty', render: (c) => c.totalQuantity },
          { header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
          { header: 'Date', render: (c) => c.createdAt.slice(0, 10) },
        ]}
        rows={data?.data ?? []}
        onRowClick={(c) => nav(`/challans/${c.id}`)}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="New Challan" onClose={() => setOpen(false)}>
        <ChallanForm onSubmit={(v) => create.mutate(v)} />
      </Modal>
    </div>
  );
}
