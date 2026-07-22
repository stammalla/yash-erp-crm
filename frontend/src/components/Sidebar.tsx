import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types';

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
