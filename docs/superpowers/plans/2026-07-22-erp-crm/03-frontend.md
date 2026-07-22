# Phase 3 — Frontend

**Produces:** React + TypeScript app with auth context, protected routes, shared components, and all module pages.

Prerequisite: Phase 2 complete (backend running on `:3000`). Run frontend commands from `frontend/`.

> Frontend tests use Vitest + React Testing Library. Because most pages are integration-heavy, this phase tests the high-value pure logic and guard components with TDD, and builds pages against those tested primitives. Manual verification via the running app + Postman covers full flows (Phase 4).

---

### Task 16: Scaffold the frontend

**Files:**
- Create: `frontend/` (Vite React-TS), `frontend/.env.example`, Tailwind config

- [ ] **Step 1: Create the Vite app**

Run from repo root:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm i axios react-router-dom @tanstack/react-query react-hook-form @hookform/resolvers zod
npm i -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind — `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

Replace `frontend/src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Configure Vitest — add to `frontend/vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
});
```

Create `frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```

Add to `frontend/package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 4: Create `frontend/.env.example`**

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "chore: scaffold vite react-ts frontend with tailwind"
```

---

### Task 17: API client + shared types

**Files:**
- Create: `frontend/src/api/client.ts`, `frontend/src/types/index.ts`

- [ ] **Step 1: Create `frontend/src/types/index.ts`**

```ts
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
```

- [ ] **Step 2: Create `frontend/src/api/client.ts`**

```ts
import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api frontend/src/types
git commit -m "feat: add api client and shared types"
```

---

### Task 18: Auth context + login

**Files:**
- Create: `frontend/src/auth/AuthContext.tsx`, `frontend/src/pages/Login.tsx`
- Test: `frontend/src/auth/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, login } = useAuth();
  return (
    <div>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <button onClick={() => login('tok', { id: '1', name: 'A', email: 'a@b.c', role: 'sales' })}>go</button>
    </div>
  );
}

test('login stores user and token', () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(screen.getByTestId('role').textContent).toBe('none');
  act(() => { screen.getByText('go').click(); });
  expect(screen.getByTestId('role').textContent).toBe('sales');
  expect(localStorage.getItem('token')).toBe('tok');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth/AuthContext.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `frontend/src/auth/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  });

  function login(t: string, u: User) {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t); setUser(u);
  }
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null); setUser(null);
  }

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/auth/AuthContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement `frontend/src/pages/Login.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-lg shadow-md w-80 space-y-4">
        <h1 className="text-xl font-semibold text-center">ERP / CRM Login</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white rounded py-2">Sign in</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/auth frontend/src/pages/Login.tsx
git commit -m "feat: add auth context and login page"
```

---

### Task 19: Protected routes + role guard

**Files:**
- Create: `frontend/src/auth/ProtectedRoute.tsx`
- Test: `frontend/src/auth/ProtectedRoute.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/dashboard" element={<div>dashboard</div>} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<div>admin area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

test('redirects to login when unauthenticated', () => {
  localStorage.clear();
  renderAt('/admin');
  expect(screen.getByText('login page')).toBeInTheDocument();
});

test('redirects to dashboard when role not allowed', () => {
  localStorage.setItem('token', 't');
  localStorage.setItem('user', JSON.stringify({ id: '1', name: 'S', email: 's@b.c', role: 'sales' }));
  renderAt('/admin');
  expect(screen.getByText('dashboard')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth/ProtectedRoute.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `frontend/src/auth/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Role } from '../types';

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/auth/ProtectedRoute.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/ProtectedRoute.tsx frontend/src/auth/ProtectedRoute.test.tsx
git commit -m "feat: add protected route with role guard"
```

---

### Task 20: App shell, layout, router wiring

**Files:**
- Create: `frontend/src/components/Layout.tsx`, `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/main.tsx`, `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Role } from '../types';

const links: { to: string; label: string; roles: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
  { to: '/customers', label: 'Customers', roles: ['admin', 'sales'] },
  { to: '/products', label: 'Products', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
  { to: '/stock-movements', label: 'Stock', roles: ['admin', 'warehouse'] },
  { to: '/challans', label: 'Challans', roles: ['admin', 'sales'] },
  { to: '/invoices', label: 'Invoices', roles: ['admin', 'accounts'] },
  { to: '/users', label: 'Users', roles: ['admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const visible = links.filter((l) => user && l.roles.includes(user.role));
  return (
    <aside className="w-56 bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-6">ERP / CRM</h2>
      <nav className="flex-1 space-y-1">
        {visible.map((l) => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="text-sm mt-4">
        <p className="text-gray-400">{user?.name} · {user?.role}</p>
        <button onClick={logout} className="mt-2 text-red-400 hover:underline">Logout</button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/Layout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Wire `frontend/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CustomersList } from './pages/customers/CustomersList';
import { CustomerDetail } from './pages/customers/CustomerDetail';
import { ProductsList } from './pages/products/ProductsList';
import { StockMovements } from './pages/stock/StockMovements';
import { ChallansList } from './pages/challans/ChallansList';
import { ChallanDetail } from './pages/challans/ChallanDetail';
import { InvoicesList } from './pages/invoices/InvoicesList';
import { InvoiceDetail } from './pages/invoices/InvoiceDetail';
import { UsersList } from './pages/users/UsersList';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin', 'sales']} />}>
        <Route element={<Layout />}>
          <Route path="/customers" element={<CustomersList />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/challans" element={<ChallansList />} />
          <Route path="/challans/:id" element={<ChallanDetail />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/products" element={<ProductsList />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin', 'warehouse']} />}>
        <Route element={<Layout />}>
          <Route path="/stock-movements" element={<StockMovements />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin', 'accounts']} />}>
        <Route element={<Layout />}>
          <Route path="/invoices" element={<InvoicesList />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/users" element={<UsersList />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Wire `frontend/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: add app shell, sidebar layout, and router wiring"
```

> The app will not compile until page components exist (Tasks 21-27). Build them next, then run `npm run dev`.

---

### Task 21: Shared UI primitives

**Files:**
- Create: `frontend/src/components/{DataTable,PageHeader,StatusBadge,Modal}.tsx`
- Test: `frontend/src/components/StatusBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

test('renders label with a color class', () => {
  render(<StatusBadge value="confirmed" />);
  const el = screen.getByText('confirmed');
  expect(el.className).toContain('bg-');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/StatusBadge.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `frontend/src/components/StatusBadge.tsx`**

```tsx
const colors: Record<string, string> = {
  lead: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', inactive: 'bg-gray-200 text-gray-700',
  draft: 'bg-gray-200 text-gray-700', confirmed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
  unpaid: 'bg-red-100 text-red-800', partial: 'bg-yellow-100 text-yellow-800', paid: 'bg-green-100 text-green-800',
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[value] ?? 'bg-gray-100 text-gray-700'}`}>{value}</span>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/StatusBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement `frontend/src/components/PageHeader.tsx`**

```tsx
import { ReactNode } from 'react';

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {action}
    </div>
  );
}
```

- [ ] **Step 6: Implement `frontend/src/components/Modal.tsx`**

```tsx
import { ReactNode } from 'react';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implement `frontend/src/components/DataTable.tsx`**

```tsx
import { ReactNode } from 'react';

export interface Column<T> { header: string; render: (row: T) => ReactNode; }

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  page?: number; totalPages?: number; onPageChange?: (p: number) => void;
}

export function DataTable<T>({ columns, rows, onRowClick, page, totalPages, onPageChange }: Props<T>) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>{columns.map((c) => <th key={c.header} className="px-4 py-2 font-medium">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">No records</td></tr>}
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)} className={`border-t ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
              {columns.map((c) => <td key={c.header} className="px-4 py-2">{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages && totalPages > 1 && (
        <div className="flex justify-end gap-2 p-3">
          <button disabled={page === 1} onClick={() => onPageChange?.((page ?? 1) - 1)} className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
          <span className="px-2 py-1">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => onPageChange?.((page ?? 1) + 1)} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components
git commit -m "feat: add shared UI primitives (DataTable, Modal, PageHeader, StatusBadge)"
```

---

### Task 22: Dashboard page

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Implement `frontend/src/pages/Dashboard.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add dashboard page"
```

---

### Task 23: Customers pages

**Files:**
- Create: `frontend/src/pages/customers/CustomersList.tsx`, `frontend/src/pages/customers/CustomerDetail.tsx`, `frontend/src/pages/customers/CustomerForm.tsx`

- [ ] **Step 1: Implement `CustomerForm.tsx`**

```tsx
import { useForm } from 'react-hook-form';
import { Customer } from '../../types';

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
```

- [ ] **Step 2: Implement `CustomersList.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Customer, Paginated } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { CustomerForm, CustomerInput } from './CustomerForm';

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
```

- [ ] **Step 3: Implement `CustomerDetail.tsx`**

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Customer } from '../../types';
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
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/customers
git commit -m "feat: add customers list, detail, and form pages"
```

---

### Task 24: Products + low-stock banner

**Files:**
- Create: `frontend/src/pages/products/ProductsList.tsx`, `frontend/src/pages/products/ProductForm.tsx`, `frontend/src/components/LowStockBanner.tsx`

- [ ] **Step 1: Implement `LowStockBanner.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Product } from '../types';
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
```

- [ ] **Step 2: Implement `ProductForm.tsx`**

```tsx
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
```

- [ ] **Step 3: Implement `ProductsList.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Product, Paginated } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { LowStockBanner } from '../../components/LowStockBanner';
import { ProductForm, ProductInput } from './ProductForm';

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
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/products frontend/src/components/LowStockBanner.tsx
git commit -m "feat: add products page with low-stock banner"
```

---

### Task 25: Stock movements page

**Files:**
- Create: `frontend/src/pages/stock/StockMovements.tsx`

- [ ] **Step 1: Implement `StockMovements.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Product, Paginated, StockMovement } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';

export function StockMovements() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: 1, type: 'in' as 'in' | 'out', reason: '' });

  const { data } = useQuery({
    queryKey: ['stock-movements', page],
    queryFn: async () => (await api.get<Paginated<StockMovement>>('/stock-movements', { params: { page } })).data,
  });
  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { limit: 100 } })).data,
  });

  const create = useMutation({
    mutationFn: () => api.post('/stock-movements', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-movements'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); setOpen(false); },
  });

  const field = 'w-full border rounded px-3 py-2';
  return (
    <div>
      <PageHeader title="Stock Movements" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">New Movement</button>} />
      <DataTable
        columns={[
          { header: 'Product', render: (m) => `${m.product?.name} (${m.product?.sku})` },
          { header: 'Type', render: (m) => (m.type === 'in_' ? 'IN' : 'OUT') },
          { header: 'Qty', render: (m) => m.quantity },
          { header: 'Reason', render: (m) => m.reason ?? '—' },
          { header: 'Date', render: (m) => m.createdAt.slice(0, 10) },
        ]}
        rows={data?.data ?? []}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="New Stock Movement" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <select className={field} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product</option>
            {products?.data.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock {p.currentStock}</option>)}
          </select>
          <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'in' | 'out' })}>
            <option value="in">IN</option><option value="out">OUT</option>
          </select>
          <input className={field} type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input className={field} placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button disabled={!form.productId} onClick={() => create.mutate()} className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50">Save</button>
          {create.isError && <p className="text-red-600 text-sm">Movement failed (insufficient stock?)</p>}
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/stock
git commit -m "feat: add stock movements page"
```

---

### Task 26: Challans pages

**Files:**
- Create: `frontend/src/pages/challans/ChallansList.tsx`, `frontend/src/pages/challans/ChallanDetail.tsx`, `frontend/src/pages/challans/ChallanForm.tsx`

- [ ] **Step 1: Implement `ChallanForm.tsx`**

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Customer, Product, Paginated } from '../../types';

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
```

- [ ] **Step 2: Implement `ChallansList.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Challan, Paginated } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ChallanForm, ChallanInput } from './ChallanForm';

export function ChallansList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['challans', status, page],
    queryFn: async () => (await api.get<Paginated<Challan>>('/challans', { params: { status: status || undefined, page } })).data,
  });

  const create = useMutation({
    mutationFn: (v: ChallanInput) => api.post<Challan>('/challans', v),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['challans'] }); setOpen(false); nav(`/challans/${res.data.id}`); },
  });

  return (
    <div>
      <PageHeader title="Sales Challans" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">New Challan</button>} />
      <select className="mb-4 border rounded px-3 py-2" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option><option value="draft">Draft</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option>
      </select>
      <DataTable
        columns={[
          { header: 'Number', render: (c) => c.challanNumber },
          { header: 'Customer', render: (c) => c.customer?.name ?? '—' },
          { header: 'Qty', render: (c) => c.totalQuantity },
          { header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
          { header: 'Date', render: (c) => c.createdAt.slice(0, 10) },
        ]}
        rows={data?.data ?? []}
        onRowClick={(c) => nav(`/challans/${c.id}`)}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="New Challan" onClose={() => setOpen(false)}>
        <ChallanForm onSubmit={(v) => create.mutate(v)} />
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Implement `ChallanDetail.tsx`**

```tsx
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Challan } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';

export function ChallanDetail() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: challan } = useQuery({ queryKey: ['challan', id], queryFn: async () => (await api.get<Challan>(`/challans/${id}`)).data });

  const confirm = useMutation({
    mutationFn: () => api.post(`/challans/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challan', id] }),
  });
  const cancel = useMutation({
    mutationFn: () => api.post(`/challans/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challan', id] }),
  });

  if (!challan) return <p>Loading…</p>;
  return (
    <div>
      <PageHeader title={challan.challanNumber} action={<StatusBadge value={challan.status} />} />
      <p className="mb-4 text-gray-600">Customer: {challan.customer?.name}</p>
      <DataTable
        columns={[
          { header: 'Product', render: (it) => `${it.productName} (${it.productSku})` },
          { header: 'Unit Price', render: (it) => `₹${Number(it.unitPrice).toFixed(2)}` },
          { header: 'Qty', render: (it) => it.quantity },
          { header: 'Line Total', render: (it) => `₹${(Number(it.unitPrice) * it.quantity).toFixed(2)}` },
        ]}
        rows={challan.items}
      />
      {challan.status === 'draft' && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => confirm.mutate()} className="bg-green-600 text-white px-4 py-2 rounded">Confirm (reduce stock)</button>
          <button onClick={() => cancel.mutate()} className="bg-red-600 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      )}
      {confirm.isError && <p className="text-red-600 mt-2 text-sm">Confirm failed — insufficient stock for one or more items.</p>}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/challans
git commit -m "feat: add challans list, detail, and creation form"
```

---

### Task 27: Invoices + Users pages

**Files:**
- Create: `frontend/src/pages/invoices/InvoicesList.tsx`, `frontend/src/pages/invoices/InvoiceDetail.tsx`, `frontend/src/pages/users/UsersList.tsx`

- [ ] **Step 1: Implement `InvoicesList.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Invoice, Paginated, Challan } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';

export function InvoicesList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [challanId, setChallanId] = useState('');

  const { data } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => (await api.get<Paginated<Invoice>>('/invoices', { params: { page } })).data,
  });
  // Confirmed challans without an invoice are candidates; fetch confirmed challans.
  const { data: challans } = useQuery({
    queryKey: ['challans', 'confirmed'],
    queryFn: async () => (await api.get<Paginated<Challan>>('/challans', { params: { status: 'confirmed', limit: 100 } })).data,
  });

  const create = useMutation({
    mutationFn: () => api.post<Invoice>('/invoices', { challanId }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['invoices'] }); setOpen(false); nav(`/invoices/${res.data.id}`); },
  });

  return (
    <div>
      <PageHeader title="Invoices" action={<button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">New Invoice</button>} />
      <DataTable
        columns={[
          { header: 'Number', render: (i) => i.invoiceNumber },
          { header: 'Customer', render: (i) => i.customer?.name ?? '—' },
          { header: 'Total', render: (i) => `₹${Number(i.totalAmount).toFixed(2)}` },
          { header: 'Payment', render: (i) => <StatusBadge value={i.paymentStatus} /> },
          { header: 'Date', render: (i) => i.createdAt.slice(0, 10) },
        ]}
        rows={data?.data ?? []}
        onRowClick={(i) => nav(`/invoices/${i.id}`)}
        page={page} totalPages={data?.meta.totalPages} onPageChange={setPage}
      />
      <Modal open={open} title="Create Invoice from Challan" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <select className="w-full border rounded px-3 py-2" value={challanId} onChange={(e) => setChallanId(e.target.value)}>
            <option value="">Select confirmed challan</option>
            {challans?.data.map((c) => <option key={c.id} value={c.id}>{c.challanNumber} — {c.customer?.name}</option>)}
          </select>
          <button disabled={!challanId} onClick={() => create.mutate()} className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50">Generate</button>
          {create.isError && <p className="text-red-600 text-sm">Failed — challan may already be invoiced.</p>}
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Implement `InvoiceDetail.tsx`**

```tsx
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

interface InvoiceFull {
  id: string; invoiceNumber: string; subtotal: string; gstPercent: string; gstAmount: string; totalAmount: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid'; customer: { name: string };
  challan: { items: { id: string; productName: string; productSku: string; unitPrice: string; quantity: number }[] };
}

export function InvoiceDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: inv } = useQuery({ queryKey: ['invoice', id], queryFn: async () => (await api.get<InvoiceFull>(`/invoices/${id}`)).data });

  const setStatus = useMutation({
    mutationFn: (paymentStatus: string) => api.put(`/invoices/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  function downloadPdf() {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => window.open(URL.createObjectURL(blob)));
  }

  if (!inv) return <p>Loading…</p>;
  return (
    <div>
      <PageHeader title={inv.invoiceNumber} action={<StatusBadge value={inv.paymentStatus} />} />
      <p className="mb-4 text-gray-600">Customer: {inv.customer.name}</p>
      <table className="w-full text-sm bg-white rounded-lg shadow mb-4">
        <thead className="bg-gray-100 text-left"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Price</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Total</th></tr></thead>
        <tbody>
          {inv.challan.items.map((it) => (
            <tr key={it.id} className="border-t"><td className="px-4 py-2">{it.productName}</td><td className="px-4 py-2">₹{Number(it.unitPrice).toFixed(2)}</td><td className="px-4 py-2">{it.quantity}</td><td className="px-4 py-2">₹{(Number(it.unitPrice) * it.quantity).toFixed(2)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="text-right space-y-1 mb-4">
        <div>Subtotal: ₹{Number(inv.subtotal).toFixed(2)}</div>
        <div>GST ({Number(inv.gstPercent)}%): ₹{Number(inv.gstAmount).toFixed(2)}</div>
        <div className="font-semibold text-lg">Total: ₹{Number(inv.totalAmount).toFixed(2)}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={downloadPdf} className="bg-gray-800 text-white px-4 py-2 rounded">Download PDF</button>
        <select className="border rounded px-3 py-2" value={inv.paymentStatus} onChange={(e) => setStatus.mutate(e.target.value)}>
          <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `UsersList.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { User } from '../../types';
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
```

- [ ] **Step 4: Verify the app builds and boots**

Run: `npm run dev` (backend must be running). Log in with seeded admin (after Phase 4 seed) and click through each module.
Run: `npx vitest run` — all frontend tests pass. Run: `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/invoices frontend/src/pages/users
git commit -m "feat: add invoices and users pages"
```

---

**Phase 3 complete.** Full-stack app is functional. Proceed to `04-devops.md`.
