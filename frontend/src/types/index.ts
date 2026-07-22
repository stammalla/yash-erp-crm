export type Role = 'admin' | 'sales' | 'warehouse' | 'accounts';

export interface User { id: string; name: string; email: string; role: Role; }

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Customer {
  id: string; name: string; mobile: string; email?: string; businessName?: string;
  gstNumber?: string; type: 'retail' | 'wholesale' | 'distributor'; address?: string;
  status: 'lead' | 'active' | 'inactive'; followUpDate?: string;
  notes?: CustomerNote[]; createdAt: string;
}
export interface CustomerNote { id: string; note: string; createdAt: string; }

export interface Product {
  id: string; name: string; sku: string; category?: string; unitPrice: string;
  currentStock: number; minStockQty: number; warehouseLocation?: string; imageUrl?: string;
}

export interface StockMovement {
  id: string; productId: string; quantity: number; type: 'in_' | 'out'; reason?: string;
  createdAt: string; product?: { name: string; sku: string };
}

export interface ChallanItem { id: string; productId: string; productName: string; productSku: string; unitPrice: string; quantity: number; }
export interface Challan {
  id: string; challanNumber: string; customerId: string; status: 'draft' | 'confirmed' | 'cancelled';
  totalQuantity: number; items: ChallanItem[]; customer?: { name: string; businessName?: string }; createdAt: string;
}

export interface Invoice {
  id: string; invoiceNumber: string; challanId: string; customerId: string;
  subtotal: string; gstPercent: string; gstAmount: string; totalAmount: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid'; createdAt: string; customer?: { name: string };
}
