import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { User } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';

interface UserInput { name: string; email: string; password: string; role: User['role']; }

export function UsersList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<UserInput>();

  const { data } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data });
  const create = useMutation({
    mutationFn: (v: UserInput) => api.post('/users', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); reset(); },
  });

  const field = 'w-full border rounded px-3 py-2';
  return (
    <div>
      <PageHeader title="Users" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Add User</button>} />
      <DataTable
        columns={[
          { header: 'Name', render: (u) => u.name },
          { header: 'Email', render: (u) => u.email },
          { header: 'Role', render: (u) => u.role },
        ]}
        rows={data ?? []}
      />
      <Modal open={open} title="Add User" onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <input className={field} placeholder="Name" {...register('name', { required: true })} />
          <input className={field} placeholder="Email" {...register('email', { required: true })} />
          <input className={field} type="password" placeholder="Password" {...register('password', { required: true })} />
          <select className={field} {...register('role', { required: true })}>
            <option value="sales">Sales</option><option value="warehouse">Warehouse</option><option value="accounts">Accounts</option><option value="admin">Admin</option>
          </select>
          <button className="w-full bg-blue-600 text-white rounded py-2">Create</button>
          {create.isError && <p className="text-red-600 text-sm">Failed — email may be in use.</p>}
        </form>
      </Modal>
    </div>
  );
}
