const colors: Record<string, string> = {
  lead: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', inactive: 'bg-gray-200 text-gray-700',
  draft: 'bg-gray-200 text-gray-700', confirmed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
  unpaid: 'bg-red-100 text-red-800', partial: 'bg-yellow-100 text-yellow-800', paid: 'bg-green-100 text-green-800',
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[value] ?? 'bg-gray-100 text-gray-700'}`}>{value}</span>;
}
