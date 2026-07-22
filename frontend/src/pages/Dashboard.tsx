import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';

interface Summary { customerCount: number; productCount: number; lowStockCount: number; unpaidInvoiceTotal: number; recentChallans: { id: string; challanNumber: string; customer?: { name: string } }[]; }

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<Summary>('/dashboard')).data });
  if (isLoading || !data) return <p>Loading…</p>;
  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Customers" value={data.customerCount} />
        <Card label="Products" value={data.productCount} />
        <Card label="Low Stock" value={data.lowStockCount} />
        <Card label="Unpaid Invoices" value={`₹${data.unpaidInvoiceTotal.toFixed(2)}`} />
      </div>
      <h2 className="text-lg font-semibold mt-8 mb-3">Recent Challans</h2>
      <ul className="bg-white rounded-lg shadow divide-y">
        {data.recentChallans.map((c) => (
          <li key={c.id} className="px-4 py-2 flex justify-between"><span>{c.challanNumber}</span><span className="text-gray-500">{c.customer?.name}</span></li>
        ))}
      </ul>
    </div>
  );
}
