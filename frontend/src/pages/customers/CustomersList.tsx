import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Customer, Paginated } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { CustomerForm } from './CustomerForm';
import type { CustomerInput } from './CustomerForm';

export function CustomersList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => (await api.get<Paginated<Customer>>('/customers', { params: { search, page } })).data,
  });

  const create = useMutation({
    mutationFn: (v: CustomerInput) => api.post('/customers', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setOpen(false); },
  });

  return (
    <div>
      <PageHeader title="Customers" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Add Customer</button>} />
      <input className="mb-4 border rounded px-3 py-2 w-64" placeholder="Search name / mobile" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      <DataTable
        columns={[
          { header: 'Name', render: (c) => c.name },
          { header: 'Mobile', render: (c) => c.mobile },
          { header: 'Type', render: (c) => c.type },
          { header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
        ]}
        rows={data?.data ?? []}
        onRowClick={(c) => nav(`/customers/${c.id}`)}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="Add Customer" onClose={() => setOpen(false)}>
        <CustomerForm onSubmit={(v) => create.mutate(v)} />
      </Modal>
    </div>
  );
}
