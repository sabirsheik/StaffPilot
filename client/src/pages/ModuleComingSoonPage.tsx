import { Wrench, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ModuleComingSoonPage = ({ title = 'Module', subtitle, backTo = '/' }) => {
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="card p-8 sm:p-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 border border-brand-200">
          <Wrench className="h-7 w-7 text-brand-600" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {subtitle ||
            'This module is part of the StaffPilot roadmap and will be available in an upcoming release.'}
        </p>
        <div className="mt-6">
          <Link to={backTo} className="inline-flex items-center gap-2 btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ModuleComingSoonPage;
