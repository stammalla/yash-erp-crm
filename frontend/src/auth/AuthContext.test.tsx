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
