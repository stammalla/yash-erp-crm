import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Customer, Product, Paginated } from '../../types';

export interface ChallanInput { customerId: string; items: { productId: string; quantity: number }[]; }

export function ChallanForm({ onSubmit }: { onSubmit: (v: ChallanInput) => void }) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([{ productId: '', quantity: 1 }]);

  const { data: customers } = useQuery({ queryKey: ['customers', 'all'], queryFn: async () => (await api.get<Paginated<Customer>>('/customers', { params: { limit: 100 } })).data });
  const { data: products } = useQuery({ queryKey: ['products', 'all'], queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { limit: 100 } })).data });

  const field = 'w-full border rounded px-3 py-2';
  const update = (i: number, patch: Partial<{ productId: string; quantity: number }>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-3">
      <select className={field} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
        <option value="">Select customer</option>
        {customers?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <select className={field} value={it.productId} onChange={(e) => update(i, { productId: e.target.value })}>
            <option value="">Product</option>
            {products?.data.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.currentStock})</option>)}
          </select>
          <input className="w-24 border rounded px-3 py-2" type="number" min={1} value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
        </div>
      ))}
      <button onClick={() => setItems([...items, { productId: '', quantity: 1 }])} className="text-blue-600 text-sm">+ Add item</button>
      <button
        disabled={!customerId || items.some((i) => !i.productId)}
        onClick={() => onSubmit({ customerId, items })}
        className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50"
      >Create Draft Challan</button>
    </div>
  );
}
