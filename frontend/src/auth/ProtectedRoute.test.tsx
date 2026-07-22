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
