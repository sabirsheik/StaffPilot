import { useState } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { Pagination } from './Pagination.jsx';
import { TableSkeleton } from './Skeleton.jsx';

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

const defaultGetRowKey = (row, idx) =>
  row?.id || row?._id || row?.uuid || `row-${idx}`;

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  total,
  page = 1,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortBy,
  sortDir = 'desc',
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  searchDebounceMs = 300,
  emptyState = null,
  title,
  subtitle,
  actions,
  filters,
  className = '',
  getRowKey = defaultGetRowKey,
  onRowClick,
  rowClassName,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue || '');

  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const key = col.key || col.id;
    let nextDir = 'asc';
    if (sortBy === key) {
      nextDir = sortDir === 'asc' ? 'desc' : 'asc';
    }
    onSort(key, nextDir);
  };

  const hasPagination = typeof total === 'number' && total >= 0;
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  return (
    <div className={`space-y-4 ${className}`}>
      {(title || actions || filters || onSearchChange) && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end">
            {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
            {onSearchChange && (
              <div className="relative sm:w-64 lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={localSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocalSearch(v);
                    if (searchDebounceMs > 0) {
                      clearTimeout(handleSort._t);
                      handleSort._t = setTimeout(
                        () => onSearchChange(v),
                        searchDebounceMs
                      );
                    } else {
                      onSearchChange(v);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="input-base pl-10 !py-2"
                />
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={Math.max(3, columns.length)} rows={8} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {columns.map((col, colIdx) => {
                    const key = col.key || col.id || `col-${colIdx}`;
                    const isSortable = col.sortable && onSort;
                    const sorted = sortBy === key;
                    return (
                      <th
                        key={key}
                        scope="col"
                        className={`px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 ${
                          isSortable ? 'cursor-pointer select-none hover:text-slate-700 transition-colors' : ''
                        } ${col.className || ''}`}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        onClick={() => handleSort(col)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.header}</span>
                          {isSortable && (
                            <span className="inline-flex flex-col -space-y-1">
                              <ChevronUp
                                className={`h-3 w-3 transition-colors ${
                                  sorted && sortDir === 'asc' ? 'text-brand-600' : 'text-slate-400'
                                }`}
                              />
                              <ChevronDown
                                className={`h-3 w-3 transition-colors ${
                                  sorted && sortDir === 'desc' ? 'text-brand-600' : 'text-slate-400'
                                }`}
                              />
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data.length ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-16">
                      {emptyState || (
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-600">
                            No data available
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Try adjusting filters or search.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const key = getRowKey(row, idx);
                    return (
                      <tr
                        key={key}
                        onClick={() => onRowClick?.(row, idx)}
                        className={`transition-colors ${
                          onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                        } ${rowClassName?.(row, idx) || ''}`}
                      >
                        {columns.map((col, colIdx) => {
                          const ckey = col.key || col.id || `col-${colIdx}`;
                          let content = null;
                          if (typeof col.cell === 'function') {
                            content = col.cell(row, idx);
                          } else if (col.accessor) {
                            const val =
                              typeof col.accessor === 'function'
                                ? col.accessor(row)
                                : row[col.accessor];
                            content = col.render ? col.render(val, row) : val;
                          } else {
                            content = row[ckey];
                          }
                          return (
                            <td
                              key={ckey}
                              className={`px-6 py-3.5 align-middle text-slate-800 ${
                                col.cellClassName || ''
                              }`}
                              style={{ width: col.width, minWidth: col.minWidth }}
                            >
                              <div className="flex items-center gap-2">
                                {typeof content === 'string' || typeof content === 'number'
                                  ? <span className="truncate">{content}</span>
                                  : content}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {hasPagination && (
            <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              {onPageSizeChange && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  >
                    {pageSizeOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={pageSize}
                onChange={onPageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataTable;
