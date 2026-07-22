import type { ReactNode } from 'react';

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
