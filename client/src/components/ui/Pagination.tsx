import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Form.jsx';

export const Pagination = ({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onChange,
  className = '',
}) => {
  if (totalPages <= 1) {
    return (
      <div className={`flex items-center justify-end text-xs text-slate-500 ${className}`}>
        {total > 0 ? `Showing ${total} result${total === 1 ? '' : 's'}` : 'No results'}
      </div>
    );
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const goTo = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    if (next !== page) onChange?.(next);
  };

  const pages = [];
  const delta = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
    >
      <div className="text-xs text-slate-500">
        Showing <span className="text-slate-800 font-medium">{from}</span>
        <span className="mx-1">–</span>
        <span className="text-slate-800 font-medium">{to}</span>
        <span className="mx-1">of</span>
        <span className="text-slate-800 font-medium">{total}</span>
        <span className="ml-1">results</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(1)}
          disabled={page === 1}
          className="!px-2"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="!px-2"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) =>
            p === '…' ? (
              <span
                key={`e-${idx}`}
                className="inline-flex h-8 w-8 items-center justify-center text-xs text-slate-500"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="!px-2"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(totalPages)}
          disabled={page === totalPages}
          className="!px-2"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
