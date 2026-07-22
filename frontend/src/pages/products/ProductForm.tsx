import { useForm } from 'react-hook-form';

export interface ProductInput { name: string; sku: string; category?: string; unitPrice: number; currentStock?: number; minStockQty?: number; warehouseLocation?: string; }

export function ProductForm({ defaultValues, isEdit, onSubmit }: { defaultValues?: Partial<ProductInput>; isEdit?: boolean; onSubmit: (v: ProductInput) => void }) {
  const { register, handleSubmit } = useForm<ProductInput>({ defaultValues });
  const field = 'w-full border rounded px-3 py-2';
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input className={field} placeholder="Name" {...register('name', { required: true })} />
      <input className={field} placeholder="SKU" {...register('sku', { required: true })} disabled={isEdit} />
      <input className={field} placeholder="Category" {...register('category')} />
      <input className={field} type="number" step="0.01" placeholder="Unit price" {...register('unitPrice', { required: true, valueAsNumber: true })} />
      {!isEdit && <input className={field} type="number" placeholder="Opening stock" {...register('currentStock', { valueAsNumber: true })} />}
      <input className={field} type="number" placeholder="Min stock qty" {...register('minStockQty', { valueAsNumber: true })} />
      <input className={field} placeholder="Warehouse location" {...register('warehouseLocation')} />
      <button className="w-full bg-blue-600 text-white rounded py-2">Save</button>
    </form>
  );
}
