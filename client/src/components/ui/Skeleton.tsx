export const Skeleton = ({ className = '', count = 1 }) => {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-full animate-pulse rounded-md bg-slate-200/70 ${className}`}
            style={{ opacity: 1 - i * 0.05 }}
          />
        ))}
      </>
    );
  }
  return (
    <div
      className={`h-4 w-full animate-pulse rounded-md bg-slate-200/70 ${className}`}
    />
  );
};

export const TableSkeleton = ({ columns = 5, rows = 8 }) => (
  <div className="card overflow-hidden">
    <div className="grid gap-3 border-b border-slate-200 px-6 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-24" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, row) => (
      <div
        key={row}
        className="grid items-center gap-3 border-b border-slate-100 px-6 py-4 last:border-0"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
      >
        {Array.from({ length: columns }).map((_, col) => (
          <Skeleton key={col} className="h-3.5 w-full" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 w-3/4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
