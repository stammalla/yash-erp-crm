import { useForm } from 'react-hook-form';
import type { Customer } from '../../types';

export type CustomerInput = Omit<Customer, 'id' | 'status' | 'notes' | 'createdAt'> & { status?: Customer['status'] };

export function CustomerForm({ defaultValues, onSubmit }: { defaultValues?: Partial<CustomerInput>; onSubmit: (v: CustomerInput) => void }) {
  const { register, handleSubmit } = useForm<CustomerInput>({ defaultValues });
  const field = 'w-full border rounded px-3 py-2';
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input className={field} placeholder="Name" {...register('name', { required: true })} />
      <input className={field} placeholder="Mobile" {...register('mobile', { required: true })} />
      <input className={field} placeholder="Email" {...register('email')} />
      <input className={field} placeholder="Business name" {...register('businessName')} />
      <input className={field} placeholder="GST number" {...register('gstNumber')} />
      <select className={field} {...register('type', { required: true })}>
        <option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="distributor">Distributor</option>
      </select>
      <select className={field} {...register('status')}>
        <option value="lead">Lead</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select>
      <input className={field} type="date" {...register('followUpDate')} />
      <textarea className={field} placeholder="Address" {...register('address')} />
      <button className="w-full bg-blue-600 text-white rounded py-2">Save</button>
    </form>
  );
}
