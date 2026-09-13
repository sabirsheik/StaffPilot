import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BriefcaseBusiness, Plus, Search, FolderKanban, MessageSquareText, Upload, Trash2, PencilLine, Eye, Clock3, X, CalendarDays, UsersRound, ClipboardPenLine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProjects, useProjectAnalytics, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation, useAddRemarkMutation, useEditRemarkMutation, useUploadProjectFileMutation } from '../../hooks/useProjects';
import { useInterns } from '../../hooks/useApi';
import { ROLES } from '../../constants/roles';
import { Button, TextField, SelectField } from '../../components/ui/Form';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

const ProjectManagementPage = () => {
  const { user } = useAuth();
  const isLead = user?.role === ROLES.TEAM_LEAD;
  const isAdmin = user?.role === ROLES.SUPER_ADMIN;
  const canManageProjects = isLead;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [remarkState, setRemarkState] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectCode: '',
    category: '',
    priority: 'medium',
    status: 'planning',
    startDate: '',
    endDate: '',
    dueDate: '',
    lead: '',
    assignedInternIds: [],
  });

  const { data: projectsResponse, isLoading } = useProjects({ search, status: statusFilter });
  const { data: analytics } = useProjectAnalytics();
  const { data: internsResponse } = useInterns({ limit: 200 });
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const deleteMutation = useDeleteProjectMutation();
  const addRemarkMutation = useAddRemarkMutation();
  const editRemarkMutation = useEditRemarkMutation();
  const uploadFileMutation = useUploadProjectFileMutation();

  useEffect(() => {
    if (!showForm) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [showForm]);

  const projects = projectsResponse?.data || [];
  const internOptions = (internsResponse?.data || []).filter((i) => i.role === ROLES.INTERN);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      projectCode: '',
      category: '',
      priority: 'medium',
      status: 'planning',
      startDate: '',
      endDate: '',
      dueDate: '',
      lead: '',
      assignedInternIds: [],
    });
    setSelectedProject(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (project) => {
    setSelectedProject(project);
    setForm({
      title: project.title || '',
      description: project.description || '',
      projectCode: project.projectCode || '',
      category: project.category || '',
      priority: project.priority || 'medium',
      status: project.status || 'planning',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
      lead: project.lead?._id || project.lead || '',
      assignedInternIds: (project.assignedInterns || []).map((intern) => intern._id || intern),
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (isLead) payload.lead = user.id;
    if (selectedProject) {
      updateMutation.mutate({ id: selectedProject._id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!selectedProject) return;
    deleteMutation.mutate(selectedProject._id);
    setShowDeleteDialog(false);
    setSelectedProject(null);
  };

  const handleRemarkSubmit = (projectId) => {
    const entry = remarkState[projectId] || { draft: '', editingRemarkId: null };
    if (!entry.draft?.trim()) return;
    if (entry.editingRemarkId) {
      editRemarkMutation.mutate({ id: projectId, remarkId: entry.editingRemarkId, content: entry.draft });
    } else {
      addRemarkMutation.mutate({ id: projectId, content: entry.draft });
    }
    setRemarkState((prev) => ({ ...prev, [projectId]: { draft: '', editingRemarkId: null } }));
  };

  const handleFileUpload = (projectId) => {
    if (!uploadFile) return;
    uploadFileMutation.mutate({ id: projectId, file: uploadFile });
    setUploadFile(null);
  };

  const statCards = useMemo(() => [
    { label: 'Active Projects', value: projects.length, icon: FolderKanban, tone: 'bg-brand-50 text-brand-700 border-brand-200' },
    { label: 'In Review', value: analytics?.counts?.review || 0, icon: Eye, tone: 'bg-brand-50 text-brand-700 border-brand-200' },
    { label: 'Completed', value: analytics?.counts?.completed || 0, icon: Clock3, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Recent Remarks', value: analytics?.recentRemarks?.length || 0, icon: MessageSquareText, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  ], [analytics, projects.length]);

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-[0_20px_45px_rgba(2,6,23,0.06)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">Project Operations</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Project management workspace</h2>
          <p className="mt-2 text-sm text-slate-500">Create, assign, review, and document projects with remarks, files, and status updates.</p>
        </div>
        {canManageProjects && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Create Project</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-xl">
            <label className="label-base">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" className="input-base pl-10" />
            </div>
          </div>
          <div className="w-full md:w-56">
            <SelectField label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} />
          </div>
        </div>
      </div>

      <DataTable
        title="Projects"
        subtitle="Role-aware access, filtering, and project lifecycle tracking"
        loading={isLoading}
        columns={[
          { header: 'Project', accessor: 'title', sortable: true },
          { header: 'Code', accessor: 'projectCode', width: 120 },
          { header: 'Lead', accessor: (row) => row.lead?.fullName || '—' },
          { header: 'Status', cell: (row) => <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] uppercase tracking-wide text-brand-600">{row.status?.replace(/_/g, ' ')}</span> },
          { header: 'Due', cell: (row) => formatDate(row.dueDate) },
          { header: 'Actions', cell: (row) => (
            <div className="flex flex-wrap items-center gap-2">
              {canManageProjects && <Button size="sm" variant="ghost" onClick={() => openEdit(row)} leftIcon={<PencilLine className="h-3.5 w-3.5" />}>Edit</Button>}
              {canManageProjects && <Button size="sm" variant="secondary" onClick={() => { setSelectedProject(row); setShowDeleteDialog(true); }} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Archive</Button>}
            </div>
          ) },
        ]}
        data={projects}
        total={projectsResponse?.total || projects.length}
        page={projectsResponse?.page || 1}
        pageSize={projectsResponse?.limit || 10}
        onPageChange={() => {}}
        emptyState={<div className="text-center text-sm text-slate-500">No projects yet. Create the first one to unlock collaboration.</div>}
      />

      {showForm && createPortal((
        <div className="fixed inset-0 z-[100] h-screen min-h-screen w-screen overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center">
            <div role="dialog" aria-modal="true" aria-labelledby="project-form-title" className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:max-h-[calc(100vh-3rem)]">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/75 px-5 py-5 sm:px-7">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-50 text-brand-600">
                    <ClipboardPenLine className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-600">Project workspace</p>
                    <h3 id="project-form-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{selectedProject ? 'Edit project' : 'Create project'}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Manage scope, timing, and assignments with secure role-aware access.</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close project form"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto">
                <div className="space-y-7 px-5 py-6 sm:px-7">
                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project details</h4>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                      <TextField label="Project title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
                      <TextField label="Project code" value={form.projectCode} onChange={(e) => setForm((prev) => ({ ...prev, projectCode: e.target.value }))} />
                      <TextField label="Category" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
                      <SelectField label="Priority" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={PRIORITY_OPTIONS} />
                      {isAdmin && <TextField label="Lead id" value={form.lead} onChange={(e) => setForm((prev) => ({ ...prev, lead: e.target.value }))} placeholder="Team lead id" />}
                    </div>
                  </section>

                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"><CalendarDays className="h-3.5 w-3.5 text-brand-600" />Timeline</h4>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                      <SelectField label="Status" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={STATUS_OPTIONS} />
                      <TextField label="Start date" type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                      <TextField label="End date" type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
                      <TextField label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
                    </div>
                  </section>

                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Brief</h4>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <label className="label-base" htmlFor="project-description">Description</label>
                    <textarea id="project-description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} className="input-base min-h-28 resize-y leading-6" />
                  </section>

                  <section>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-slate-200" />
                        <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"><UsersRound className="h-3.5 w-3.5 text-brand-600" />Assign interns</h4>
                      </div>
                      <span className="text-xs text-slate-400">{form.assignedInternIds.length} selected</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {internOptions.map((intern) => {
                        const checked = form.assignedInternIds.includes(intern._id);
                        return (
                          <label key={intern._id} className={`group flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-sm transition-all focus-within:ring-2 focus-within:ring-brand-500/20 ${checked ? 'border-brand-300 bg-brand-50/70 text-slate-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                            <input type="checkbox" checked={checked} onChange={() => setForm((prev) => ({ ...prev, assignedInternIds: checked ? prev.assignedInternIds.filter((id) => id !== intern._id) : [...prev.assignedInternIds, intern._id] }))} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{intern.fullName}</span>
                              <span className="mt-0.5 block truncate text-xs text-slate-400">{intern.username}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
                  <Button variant="secondary" type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{selectedProject ? 'Save changes' : 'Create project'}</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ), document.body)}

      <ConfirmDialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={handleDelete} title="Archive project" message="This will remove the project from the active list while preserving history." confirmLabel="Archive" tone="warning" loading={deleteMutation.isPending} />

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project._id} className="card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] uppercase tracking-wide text-brand-600">{project.projectCode || 'PROJECT'}</span>
                  <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-500">{project.priority}</span>
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] uppercase tracking-wide text-brand-600">{project.status?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{project.description || 'No project description provided.'}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-4 w-4" /> Lead: {project.lead?.fullName || '—'}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> Due: {formatDate(project.dueDate)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManageProjects && <Button size="sm" variant="secondary" onClick={() => openEdit(project)} leftIcon={<PencilLine className="h-3.5 w-3.5" />}>Edit</Button>}
                <Button size="sm" variant="ghost" onClick={() => { setSelectedProject(project); setRemarkState((prev) => ({ ...prev, [project._id]: { draft: '', editingRemarkId: null } })); }} leftIcon={<MessageSquareText className="h-3.5 w-3.5" />}>Remarks</Button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Recent remarks</h4>
                  <span className="text-xs text-slate-400">Timeline history</span>
                </div>
                {(project.remarks || []).length === 0 ? <p className="text-sm text-slate-400">No remarks yet.</p> : (project.remarks || []).slice(-3).map((remark) => (
                  <div key={remark._id || remark.createdAt} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{remark.authorName}</span>
                      <span>{formatDate(remark.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{remark.content}</p>
                    {canManageProjects && (
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setRemarkState((prev) => ({ ...prev, [project._id]: { draft: remark.content, editingRemarkId: remark._id } }))}>Edit</Button>
                      </div>
                    )}
                  </div>
                ))}
                {canManageProjects ? (
                  <div className="space-y-2">
                    <textarea value={(remarkState[project._id] || { draft: '' }).draft} onChange={(e) => setRemarkState((prev) => ({ ...prev, [project._id]: { ...(prev[project._id] || { editingRemarkId: null }), draft: e.target.value } }))} rows={3} className="input-base" placeholder="Add a remark for this project" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRemarkSubmit(project._id)} loading={addRemarkMutation.isPending || editRemarkMutation.isPending}>{(remarkState[project._id] || { editingRemarkId: null }).editingRemarkId ? 'Save edit' : 'Save remark'}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">Remark entry is restricted to Team Leads for this workspace.</div>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Project files</h4>
                  <span className="text-xs text-slate-400">PDF · DOCX · ZIP</span>
                </div>
                <div className="space-y-2">
                  {(project.files || []).length === 0 ? <p className="text-sm text-slate-400">No files uploaded yet.</p> : (project.files || []).slice(-3).map((file) => (
                    <div key={file._id || file.storedName} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      <div>
                        <div className="font-medium text-slate-900">{file.originalName}</div>
                        <div className="mt-1 text-xs text-slate-400">{Math.round(file.size / 1024)} KB</div>
                      </div>
                      <a href={file.path || `/uploads/projects/${file.storedName}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600">Preview</a>
                    </div>
                  ))}
                </div>
                {canManageProjects && (
                  <div className="space-y-2">
                    <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600" />
                    <Button size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => handleFileUpload(project._id)} loading={uploadFileMutation.isPending}>Upload file</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectManagementPage;
