import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ListTodo, Plus, Trash2, PencilLine, CircleDashed, BriefcaseBusiness, UserRound, FileText, Upload, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useInterns } from '../hooks/useApi';
import { SelectField, TextField, Button } from '../components/ui/Form';
import Pagination from '../components/ui/Pagination';
import { Spinner } from '../components/ui/Spinner';
import { getAssetUrl } from '../lib/axios';

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_STYLES = {
  todo: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  review: 'bg-red-100 text-red-700 border-red-200',
  done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PRIORITY_STYLES = {
  low: 'bg-brand-100 text-brand-700',
  medium: 'bg-slate-100 text-slate-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const formatDate = (value) => {
  if (!value) return 'No due date';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'No due date';
  }
};

const TaskManagementPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const focusedTaskId = searchParams.get('taskId');
  const focusedTaskRef = useRef(null);
  const queryClient = useQueryClient();
  const canCreateTask = user?.role === 'team_lead' || user?.role === 'super_admin';
  const isIntern = user?.role === 'intern';
  const { data: internsResponse } = useInterns({ limit: 200 }, { enabled: canCreateTask });
  const internOptions = (internsResponse?.data || []).map((intern) => ({
    value: intern._id,
    label: `${intern.fullName || intern.username} (${intern.username || 'intern'})`,
  }));
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    assigneeId: 'all',
    assigneeIds: [],
  });
  const [editingId, setEditingId] = useState(null);
  const [submissionDrafts, setSubmissionDrafts] = useState({});
  const [expandedSubmissionTasks, setExpandedSubmissionTasks] = useState({});
  const [expandedReviewTasks, setExpandedReviewTasks] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', page],
    queryFn: async () => {
      const res = await taskApi.getAll({ page, limit: PAGE_SIZE });
      return res;
    },
    keepPreviousData: true,
  });

  const tasks = data?.data || [];
  const focusedTaskQuery = useQuery({
    queryKey: ['task', focusedTaskId],
    queryFn: async () => (await taskApi.getById(focusedTaskId || '')).data,
    enabled: Boolean(focusedTaskId) && !tasks.some((task) => task._id === focusedTaskId),
    retry: false,
  });
  const visibleTasks = useMemo(() => {
    if (!focusedTaskQuery.data || tasks.some((task) => task._id === focusedTaskQuery.data._id)) return tasks;
    return [focusedTaskQuery.data, ...tasks];
  }, [focusedTaskQuery.data, tasks]);

  useEffect(() => {
    if (!focusedTaskId || !focusedTaskRef.current) return undefined;
    const timer = window.setTimeout(() => focusedTaskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    return () => window.clearTimeout(timer);
  }, [focusedTaskId, visibleTasks.length]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const createMutation = useMutation({
    mutationFn: async (payload) => taskApi.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
      toast.success('Task created successfully.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to create task.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => taskApi.updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
      toast.success('Task updated successfully.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update task.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => taskApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to update status.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => taskApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to delete task.');
    },
  });

  const submissionMutation = useMutation({
    mutationFn: ({ id, summary, file }) => taskApi.submitTask(id, summary, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSubmissionDrafts({});
      toast.success('Task submitted successfully.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Submission failed. Your draft is preserved.');
    },
  });

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
      assigneeId: 'all',
      assigneeIds: [],
    });
    setEditingId(null);
  };

  const submitTask = (e) => {
    e.preventDefault();

    if (!canCreateTask) {
      toast.error('Interns cannot create new tasks. Please contact your team lead.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || undefined,
      assigneeId: form.assigneeIds.length === 1 ? form.assigneeIds[0] : form.assigneeIds.length ? undefined : 'all',
      assigneeIds: form.assigneeIds,
    };

    if (!payload.title) {
      toast.error('Task title is required.');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const editTask = (task) => {
    setEditingId(task._id);
    setForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      assigneeId: task.assigneeId?._id || task.assigneeId || 'all',
      assigneeIds: task.assigneeIds?.length
        ? task.assigneeIds.map((assignee) => assignee?._id || assignee)
        : task.assigneeId?._id || task.assigneeId ? [task.assigneeId?._id || task.assigneeId] : [],
    });
  };

  const totalCompleted = tasks.filter((task) => task.status === 'done').length;

  const getAssigneeLabel = (task) => {
    if (task.assigneeName === 'All interns' || task.assigneeId === 'all') return 'All interns';
    if (task.assigneeId?.fullName) return task.assigneeId.fullName;
    if (task.assigneeId?.username) return task.assigneeId.username;
    if (task.assigneeName) return task.assigneeName;
    if (task.assignee) {
      if (typeof task.assignee === 'string') return task.assignee;
      return task.assignee.fullName || task.assignee.username || 'Unassigned';
    }
    return 'Unassigned';
  };

  const updateSubmissionDraft = (taskId, patch) => {
    setSubmissionDrafts((previous) => ({
      ...previous,
      [taskId]: { ...(previous[taskId] || { summary: '', file: null, error: '' }), ...patch },
    }));
  };

  const handleSubmissionFile = (taskId, file) => {
    if (!file) return;
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      updateSubmissionDraft(taskId, { error: 'Use a PDF, DOCX, ZIP, PNG, or JPG file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      updateSubmissionDraft(taskId, { error: 'Files must be smaller than 10MB.' });
      return;
    }
    updateSubmissionDraft(taskId, { file, error: '' });
  };

  const submitProgress = (task) => {
    const draft = submissionDrafts[task._id] || { summary: '', file: null, error: '' };
    if (!draft.summary.trim()) {
      updateSubmissionDraft(task._id, { error: 'Add a progress summary before submitting.' });
      return;
    }
    submissionMutation.mutate({ id: task._id, summary: draft.summary.trim(), file: draft.file });
  };

  const handleTaskStatusChange = (task, status) => {
    if (isIntern && status === 'done') {
      setExpandedSubmissionTasks((previous) => ({ ...previous, [task._id]: true }));
    }
    statusMutation.mutate({ id: task._id, status });
  };

  return (
    <div className="page-shell space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 ring-1 ring-brand-200">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">Workflow</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Task Management</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {totalCompleted} completed
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${canCreateTask ? 'xl:grid-cols-[420px_minmax(0,1fr)]' : 'xl:grid-cols-1'}`}>
        {canCreateTask ? (
          <form onSubmit={submitTask} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Task Form</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {editingId ? 'Edit task' : 'Create new task'}
                </h3>
              </div>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-4">
              <TextField
                label="Task title"
                placeholder="Write task title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />

              <TextField
                label="Description"
                placeholder="Describe the task"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Priority"
                  value={form.priority}
                  options={PRIORITY_OPTIONS}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  options={STATUS_OPTIONS}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  disabled={user?.role === 'team_lead' && Boolean(editingId)}
                  hint={user?.role === 'team_lead' && editingId ? 'Status is updated by the assigned intern.' : undefined}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Due date"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                />

                <div className="sm:col-span-2">
                  <p className="label-base">Assign to</p>
                  <div className="rounded-md border border-slate-300 bg-white p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={form.assigneeIds.length === 0}
                        onChange={() => setForm((p) => ({ ...p, assigneeId: 'all', assigneeIds: [] }))}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      All interns
                    </label>
                    {internOptions.length > 0 ? (
                      <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                        {internOptions.map((intern) => {
                          const selected = form.assigneeIds.includes(intern.value);
                          return (
                            <label key={intern.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-brand-50">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => setForm((p) => {
                                  const nextIds = selected
                                    ? p.assigneeIds.filter((id) => id !== intern.value)
                                    : [...p.assigneeIds, intern.value];
                                  return { ...p, assigneeId: nextIds.length ? undefined : 'all', assigneeIds: nextIds };
                                })}
                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                              <span className="truncate">{intern.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">No active interns available.</p>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Choose All interns or select specific interns. Multiple selections are supported.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={resetForm} className={editingId ? '' : 'hidden'}>
                Reset
              </Button>
              <Button type="submit" leftIcon={<Plus className="h-4 w-4" />} loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Update task' : 'Add task'}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Overview</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Tasks board</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {total} total
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Unable to load tasks.
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <CircleDashed className="h-10 w-10 text-slate-400" />
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No tasks found</h4>
              <p className="mt-1 text-sm text-slate-500">Create your first task to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleTasks.map((task) => (
                <div key={task._id} ref={task._id === focusedTaskId ? focusedTaskRef : undefined} className={`rounded-2xl border p-4 ${task._id === focusedTaskId ? 'notification-context-highlight' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-900">{task.title}</h4>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[task.status] || STATUS_STYLES.todo}`}>
                          {task.status?.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{task.description || 'No description provided.'}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(task.dueDate)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          Assigned to: {getAssigneeLabel(task)}
                        </span>
                      </div>

                      {isIntern && task.status === 'done' && (task.submission?.submittedAt || expandedSubmissionTasks[task._id] ? (
                        <div className="mt-5 border-t border-slate-200 pt-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">Progress &amp; review</p>
                              <h5 className="mt-1 text-sm font-semibold text-slate-900">Prepare your submission</h5>
                            </div>
                            <span className="text-xs text-slate-500">{task.submission?.submittedAt ? 'Submitted for review' : task.status === 'done' ? 'Ready to submit' : 'Draft · Ready when complete'}</span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 border-y border-slate-200 bg-white text-xs">
                            {['Progress', 'Review', 'Submit'].map((step, index) => {
                              const hasDraft = Boolean(submissionDrafts[task._id]?.summary?.trim());
                              const active = task.submission?.submittedAt ? true : index === 0 || (index === 1 && hasDraft);
                              return (
                                <div key={step} className={`border-r border-slate-200 px-3 py-2.5 last:border-r-0 ${active ? 'text-brand-700' : 'text-slate-400'}`}>
                                  <span className={`mr-2 inline-flex h-5 w-5 items-center justify-center border text-[10px] font-semibold ${active ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}>{index + 1}</span>
                                  {step}
                                </div>
                              );
                            })}
                          </div>
                          {task.submission?.submittedAt ? (
                            <div className="mt-4 border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
                              <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Submission received</div>
                              <p className="mt-1 text-xs text-emerald-700">Submitted {formatDate(task.submission.submittedAt)}. This task is locked for further changes.</p>
                            </div>
                          ) : (
                            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                              <div>
                                <label htmlFor={`submission-${task._id}`} className="label-base">Progress summary <span className="text-red-500">*</span></label>
                                <textarea
                                  id={`submission-${task._id}`}
                                  value={submissionDrafts[task._id]?.summary || ''}
                                  onChange={(event) => updateSubmissionDraft(task._id, { summary: event.target.value, error: '' })}
                                  placeholder="Describe your progress, completed work, findings, or additional notes..."
                                  maxLength={5000}
                                  rows={4}
                                  className="input-base resize-y leading-6"
                                />
                                <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Required for submission</span><span>{(submissionDrafts[task._id]?.summary || '').length}/5000</span></div>
                              </div>
                              <div>
                                <span className="label-base">Attach supporting file</span>
                                <label
                                  htmlFor={`submission-file-${task._id}`}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => { event.preventDefault(); handleSubmissionFile(task._id, event.dataTransfer.files?.[0]); }}
                                  className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-4 py-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30 focus-within:ring-2 focus-within:ring-brand-500/20"
                                >
                                  <Upload className="h-5 w-5 text-brand-600" />
                                  <span className="mt-2 text-xs font-medium text-slate-700">Choose or drop a file</span>
                                  <span className="mt-1 text-[10px] text-slate-400">PDF, DOCX, ZIP, PNG, JPG · 10MB max</span>
                                  <input id={`submission-file-${task._id}`} type="file" accept=".pdf,.docx,.zip,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => handleSubmissionFile(task._id, event.target.files?.[0])} />
                                </label>
                                {submissionDrafts[task._id]?.file && (
                                  <div className="mt-2 flex items-center justify-between gap-2 border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                                    <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-brand-600" /><span className="truncate">{submissionDrafts[task._id].file.name}</span></span>
                                    <button type="button" onClick={() => updateSubmissionDraft(task._id, { file: null })} className="text-slate-400 hover:text-slate-800" aria-label="Remove attachment"><X className="h-4 w-4" /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {!task.submission?.submittedAt && submissionDrafts[task._id]?.summary?.trim() && (
                            <div className="mt-4 border border-brand-100 bg-brand-50/40 p-3 text-xs text-slate-600">
                              <p className="font-semibold text-slate-800">Review before submitting</p>
                              <p className="mt-1 line-clamp-2">{submissionDrafts[task._id].summary}</p>
                              {submissionDrafts[task._id].file && <p className="mt-2 text-brand-700">Attachment ready: {submissionDrafts[task._id].file.name}</p>}
                            </div>
                          )}
                          {!task.submission?.submittedAt && (submissionDrafts[task._id]?.error || (submissionMutation.isError && submissionMutation.variables?.id === task._id)) && (
                            <p className="mt-3 flex items-center gap-2 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{submissionDrafts[task._id]?.error || 'Submission failed. Review your details and try again.'}</p>
                          )}
                          {!task.submission?.submittedAt && (
                            <div className="mt-4 flex justify-end">
                              <Button type="button" onClick={() => submitProgress(task)} loading={submissionMutation.isPending && submissionMutation.variables?.id === task._id} disabled={submissionMutation.isPending}>
                                Review &amp; submit
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedSubmissionTasks((previous) => ({ ...previous, [task._id]: true }))}
                          className="mt-5 flex w-full items-center justify-between border-t border-slate-200 pt-4 text-left transition-colors hover:text-brand-700"
                        >
                          <span>
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">Progress &amp; review</span>
                            <span className="mt-1 block text-sm font-semibold text-slate-900">Prepare your submission</span>
                          </span>
                          <span className="text-xs font-medium text-brand-600">Open submission</span>
                        </button>
                      ))}

                      {!isIntern && task.submission?.submittedAt && (
                        <div className="mt-5 border-t border-slate-200 pt-5">
                          <button
                            type="button"
                            onClick={() => setExpandedReviewTasks((previous) => ({ ...previous, [task._id]: !previous[task._id] }))}
                            aria-expanded={Boolean(expandedReviewTasks[task._id])}
                            className="flex w-full flex-col gap-3 border border-brand-200 bg-brand-50/40 p-4 text-left transition-colors hover:bg-brand-50/70 sm:flex-row sm:items-start sm:justify-between focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Submission received for review
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {task.submission.submittedBy?.fullName || task.submission.submittedBy?.username || 'Assigned intern'} · Submitted {formatDate(task.submission.submittedAt)}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{expandedReviewTasks[task._id] ? 'Hide review' : 'View review'}</span>
                          </button>
                          {expandedReviewTasks[task._id] && (
                            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <div className="border border-slate-200 bg-white p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Progress summary</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{task.submission.summary}</p>
                            </div>
                            {task.submission.file && (
                              <div className="flex items-center justify-between gap-3 border border-slate-200 bg-white p-4">
                                <div className="flex min-w-0 items-center gap-2">
                                  <FileText className="h-5 w-5 shrink-0 text-brand-600" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">{task.submission.file.originalName}</p>
                                    <p className="mt-1 text-xs text-slate-400">{Math.round((task.submission.file.size || 0) / 1024)} KB · Supporting file</p>
                                  </div>
                                </div>
                                <a
                                  href={getAssetUrl(task.submission.file.path || `/uploads/tasks/${task.submission.file.storedName}`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                                >
                                  Preview
                                </a>
                              </div>
                            )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {task.submission?.submittedAt ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700" aria-label={`${task.title} submitted`}>
                          <CheckCircle2 className="h-4 w-4" />
                          Submitted
                        </div>
                      ) : user?.role === 'team_lead' ? (
                        <span className={`inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.todo}`} aria-label={`Status: ${task.status?.replace('_', ' ')}`}>
                          {task.status?.replace('_', ' ')}
                        </span>
                      ) : (
                        <select
                          value={task.status || 'todo'}
                          onChange={(e) => handleTaskStatusChange(task, e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none ring-0 focus:border-brand-300"
                          aria-label={`Change status for ${task.title}`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      )}

                      {canCreateTask && (
                        <>
                          {!task.submission?.submittedAt && (
                            <button
                              type="button"
                              onClick={() => editTask(task)}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                              aria-label={`Edit ${task.title}`}
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(task._id)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                            aria-label={`Delete ${task.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && visibleTasks.length > 0 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagementPage;
