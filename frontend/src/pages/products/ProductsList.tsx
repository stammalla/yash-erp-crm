import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Product, Paginated } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { LowStockBanner } from '../../components/LowStockBanner';
import { ProductForm } from './ProductForm';
import type { ProductInput } from './ProductForm';

export function ProductsList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'admin' || user?.role === 'warehouse';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['products', search, page],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { search, page } })).data,
  });

  const create = useMutation({
    mutationFn: (v: ProductInput) => api.post('/products', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); setOpen(false); },
  });

  return (
    <div>
      <PageHeader title="Products" action={canEdit && <button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Add Product</button>} />
      <LowStockBanner />
      <input className="mb-4 border rounded px-3 py-2 w-64" placeholder="Search name / SKU" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      <DataTable
        columns={[
          { header: 'Name', render: (p) => p.name },
          { header: 'SKU', render: (p) => p.sku },
          { header: 'Price', render: (p) => `₹${Number(p.unitPrice).toFixed(2)}` },
          { header: 'Stock', render: (p) => <span className={p.currentStock <= p.minStockQty ? 'text-red-600 font-medium' : ''}>{p.currentStock}</span> },
          { header: 'Location', render: (p) => p.warehouseLocation ?? '—' },
        ]}
        rows={data?.data ?? []}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="Add Product" onClose={() => setOpen(false)}>
        <ProductForm onSubmit={(v) => create.mutate(v)} />
      </Modal>
    </div>
  );
}
