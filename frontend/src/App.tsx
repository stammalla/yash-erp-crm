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
