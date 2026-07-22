import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Customer } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

export function CustomerDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<Customer>(`/customers/${id}`)).data,
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/customers/${id}/notes`, { note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', id] }); setNote(''); },
  });

  if (!customer) return <p>Loading…</p>;
  return (
    <div>
      <PageHeader title={customer.name} action={<StatusBadge value={customer.status} />} />
      <div className="bg-white rounded-lg shadow p-5 grid grid-cols-2 gap-3 text-sm">
        <div><b>Mobile:</b> {customer.mobile}</div>
        <div><b>Email:</b> {customer.email ?? '—'}</div>
        <div><b>Business:</b> {customer.businessName ?? '—'}</div>
        <div><b>GST:</b> {customer.gstNumber ?? '—'}</div>
        <div><b>Type:</b> {customer.type}</div>
        <div><b>Follow-up:</b> {customer.followUpDate?.slice(0, 10) ?? '—'}</div>
        <div className="col-span-2"><b>Address:</b> {customer.address ?? '—'}</div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-2">Follow-up Notes</h2>
      <div className="flex gap-2 mb-3">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={() => addNote.mutate()} className="bg-blue-600 text-white px-4 rounded">Add</button>
      </div>
      <ul className="bg-white rounded-lg shadow divide-y">
        {customer.notes?.map((n) => (
          <li key={n.id} className="px-4 py-2 flex justify-between"><span>{n.note}</span><span className="text-gray-400 text-xs">{n.createdAt.slice(0, 10)}</span></li>
        ))}
      </ul>
    </div>
  );
}
