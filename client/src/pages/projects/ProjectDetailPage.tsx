import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquareText, Users, Clock3, BriefcaseBusiness } from 'lucide-react';
import { useProject } from '../../hooks/useProjects';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: project, isLoading } = useProject(id);
  const baseProjectsPath = user?.role === ROLES.SUPER_ADMIN ? '/admin/projects' : user?.role === ROLES.TEAM_LEAD ? '/lead/projects' : '/intern/projects';

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size={28} className="text-brand-500" /></div>;
  }

  if (!project) {
    return <div className="p-8 text-sm text-slate-500">Project not found.</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Link to={baseProjectsPath} className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-600">Project overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{project.title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{project.description || 'No description provided.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" /> {project.lead?.fullName || 'Unassigned'}</div>
            <div className="mt-2 flex items-center gap-2"><Users className="h-4 w-4" /> {project.assignedInterns?.length || 0} interns</div>
            <div className="mt-2 flex items-center gap-2"><Clock3 className="h-4 w-4" /> Due {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-slate-900"><MessageSquareText className="h-4 w-4 text-brand-600" /> Remarks</div>
          <div className="mt-4 space-y-3">
            {(project.remarks || []).map((remark) => (
              <div key={remark._id || remark.createdAt} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{remark.authorName}</span>
                  <span>{new Date(remark.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{remark.content}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 text-slate-900"><FileText className="h-4 w-4 text-brand-600" /> Files</div>
          <div className="mt-4 space-y-3">
            {(project.files || []).map((file) => (
              <div key={file._id || file.storedName} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">{file.originalName}</div>
                <div className="mt-1 text-xs text-slate-500">{file.mimeType} · {Math.round(file.size / 1024)} KB</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
