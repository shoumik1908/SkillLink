import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Inbox } from 'lucide-react';
import { Button } from '../ui/Button';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  pagination?: PaginationProps;
  onSort?: (accessor: string) => void;
  emptyMessage?: string;
  emptySubtitle?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  pagination,
  onSort,
  emptyMessage = 'No records found',
  emptySubtitle = 'Try adjusting your filters or search criteria.',
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-5 py-3.5 ${col.className || ''}`}
                  onClick={() => col.sortable && col.accessorKey && onSort?.(String(col.accessorKey))}
                >
                  <div className="flex items-center space-x-1.5 select-none">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-5 py-4">
                      <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
                    <p className="text-xs text-slate-400 max-w-sm">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  className="hover:bg-purple-50/30 transition-colors"
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`px-5 py-3.5 text-slate-700 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? '—')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>
              Showing{' '}
              <span className="font-semibold text-slate-800">
                {pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{pagination.total}</span> items
            </span>

            {pagination.onPageSizeChange && (
              <div className="flex items-center space-x-1 pl-4 border-l border-slate-200">
                <span>Per page:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="h-8 px-2.5 rounded-lg text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <span className="px-2 font-medium text-slate-700">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="h-8 px-2.5 rounded-lg text-xs"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
