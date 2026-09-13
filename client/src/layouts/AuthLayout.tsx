import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import BrandMark from '../components/ui/BrandMark';

export const AuthLayout = ({
  children,
  title,
  subtitle,
  footerCta,
  footerLink,
  footerLinkText,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-elevated">
        <div className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center">
                <BrandMark className="h-12 w-12" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">StaffPilot</p>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workforce operations for high-performing teams</p>
              </div>
            </div>
          </div>

          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
              {subtitle && <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>}
            </div>

            {children}

            {footerCta && (
              <p className="mt-8 text-center text-sm text-slate-600">
                {footerCta}{' '}
                <Link to={footerLink || '#'} className="font-medium text-brand-600 transition-colors hover:text-brand-700">
                  {footerLinkText || 'Click here'}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
