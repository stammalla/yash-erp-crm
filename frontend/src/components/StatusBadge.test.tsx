import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

test('renders label with a color class', () => {
  render(<StatusBadge value="confirmed" />);
  const el = screen.getByText('confirmed');
  expect(el.className).toContain('bg-');
});
