import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  emptyMessage = 'No data found',
  emptyIcon,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-14 text-text-tertiary flex flex-col items-center gap-3">
        {emptyIcon || (
          <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center">
            <span className="text-2xl text-text-muted">📄</span>
          </div>
        )}
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-highlight/50 border-b border-divider">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-3.5 text-[10px] font-black text-text-tertiary uppercase tracking-wider ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                }`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-5 py-3.5 text-center text-[10px] font-black text-text-tertiary uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {data.map((row) => (
            <tr
              key={row.id || Math.random()}
              className="hover:bg-white/[0.02] transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3.5 text-xs ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.accessor(row)}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-5 py-3.5 text-center">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="w-8 h-8 rounded-lg hover:bg-money-gold/5 text-text-tertiary hover:text-money-gold mr-1 transition-colors"
                    >
                      <Edit2 size={14} className="mx-auto" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/5 text-text-tertiary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} className="mx-auto" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
