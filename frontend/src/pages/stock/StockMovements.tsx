import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Product, Paginated, StockMovement } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';

export function StockMovements() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: 1, type: 'in' as 'in' | 'out', reason: '' });

  const { data } = useQuery({
    queryKey: ['stock-movements', page],
    queryFn: async () => (await api.get<Paginated<StockMovement>>('/stock-movements', { params: { page } })).data,
  });
  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { limit: 100 } })).data,
  });

  const create = useMutation({
    mutationFn: () => api.post('/stock-movements', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-movements'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); setOpen(false); },
  });

  const field = 'w-full border rounded px-3 py-2';
  return (
    <div>
      <PageHeader title="Stock Movements" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">New Movement</button>} />
      <DataTable
        columns={[
          { header: 'Product', render: (m) => `${m.product?.name} (${m.product?.sku})` },
          { header: 'Type', render: (m) => (m.type === 'in_' ? 'IN' : 'OUT') },
          { header: 'Qty', render: (m) => m.quantity },
          { header: 'Reason', render: (m) => m.reason ?? '—' },
          { header: 'Date', render: (m) => m.createdAt.slice(0, 10) },
        ]}
        rows={data?.data ?? []}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="New Stock Movement" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <select className={field} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product</option>
            {products?.data.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock {p.currentStock}</option>)}
          </select>
          <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'in' | 'out' })}>
            <option value="in">IN</option><option value="out">OUT</option>
          </select>
          <input className={field} type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input className={field} placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button disabled={!form.productId} onClick={() => create.mutate()} className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50">Save</button>
          {create.isError && <p className="text-red-600 text-sm">Movement failed (insufficient stock?)</p>}
        </div>
      </Modal>
    </div>
  );
}
