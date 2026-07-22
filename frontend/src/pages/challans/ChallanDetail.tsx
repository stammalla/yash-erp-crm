import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Challan } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';

export function ChallanDetail() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: challan } = useQuery({ queryKey: ['challan', id], queryFn: async () => (await api.get<Challan>(`/challans/${id}`)).data });

  const confirm = useMutation({
    mutationFn: () => api.post(`/challans/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challan', id] }),
  });
  const cancel = useMutation({
    mutationFn: () => api.post(`/challans/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challan', id] }),
  });

  if (!challan) return <p>Loading…</p>;
  return (
    <div>
      <PageHeader title={challan.challanNumber} action={<StatusBadge value={challan.status} />} />
      <p className="mb-4 text-gray-600">Customer: {challan.customer?.name}</p>
      <DataTable
        columns={[
          { header: 'Product', render: (it) => `${it.productName} (${it.productSku})` },
          { header: 'Unit Price', render: (it) => `₹${Number(it.unitPrice).toFixed(2)}` },
          { header: 'Qty', render: (it) => it.quantity },
          { header: 'Line Total', render: (it) => `₹${(Number(it.unitPrice) * it.quantity).toFixed(2)}` },
        ]}
        rows={challan.items}
      />
      {challan.status === 'draft' && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => confirm.mutate()} className="bg-green-600 text-white px-4 py-2 rounded">Confirm (reduce stock)</button>
          <button onClick={() => cancel.mutate()} className="bg-red-600 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      )}
      {confirm.isError && <p className="text-red-600 mt-2 text-sm">Confirm failed — insufficient stock for one or more items.</p>}
    </div>
  );
}
