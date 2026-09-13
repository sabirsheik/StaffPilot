import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/ui/BrandMark';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, getDashboardPath } = useAuth();
  const fallback = isAuthenticated ? getDashboardPath() : '/login';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="max-w-lg w-full text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          <BrandMark className="h-16 w-16" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 mb-2">
          Error 404
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-3">
          Page not found
        </h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist, has been moved, or you don't have permission to view it.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          <Link to={fallback} className="btn-primary w-full sm:w-auto">
            <Home className="h-4 w-4" />
            {isAuthenticated ? 'Go to Dashboard' : 'Sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
