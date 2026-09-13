import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import AppHeader from '../components/layout/AppHeader';
import { CardSkeleton, Skeleton, TableSkeleton } from '../components/ui/Skeleton';

const MainContentFallback = () => (
  <div className="page-shell min-h-[calc(100vh-68px)] space-y-6" aria-busy="true" aria-label="Loading page">
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-72 max-w-[60vw]" />
      </div>
      <Skeleton className="h-10 w-28 shrink-0" />
    </div>
    <CardSkeleton count={4} />
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <TableSkeleton columns={4} rows={5} />
      <div className="card space-y-4 p-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton count={4} className="h-3.5" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  </div>
);

export const AppLayout = ({ title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Suspense fallback={<MainContentFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
