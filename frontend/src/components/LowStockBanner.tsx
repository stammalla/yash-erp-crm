import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Product } from '../types';
import { useAuth } from '../auth/AuthContext';

export function LowStockBanner() {
  const { user } = useAuth();
  const enabled = user?.role === 'admin' || user?.role === 'warehouse';
  const { data } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => (await api.get<Product[]>('/products/low-stock')).data,
    enabled,
  });
  if (!enabled || !data || data.length === 0) return null;
  return (
    <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 rounded px-4 py-2 mb-4 text-sm">
      ⚠ {data.length} product(s) at or below minimum stock: {data.map((p) => p.name).join(', ')}
    </div>
  );
}
