import { useMemo, useState } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  UserCheck,
  Search,
  CalendarDays,
  Clock,
} from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { Button } from '../../components/ui/Form.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { UserFormDialog } from '../../components/ui/UserFormDialog.jsx';
import {
  useInterns,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useCurrentUser,
} from '../../hooks/useApi.js';
import { ROLES, ROLE_BADGE_CLASS } from '../../constants/roles.js';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

export const LeadInternsPage = () => {
  const { data: me } = useCurrentUser();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      q: search || undefined,
      sortBy,
      sortDir,
    }),
    [page, pageSize, search, sortBy, sortDir]
  );

  const { data, isLoading } = useInterns(params);
  const total = data?.total || 0;
  const rows = data?.data || [];

  const createMut = useCreateUserMutation();
  const updateMut = useUpdateUserMutation();
  const deleteMut = useDeleteUserMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitial, setFormInitial] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, row: null });

  const openCreate = () => {
    setFormMode('create');
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormMode('edit');
    setFormInitial(row);
    setFormOpen(true);
  };

  const onSubmit = (payload) => {
    const base = { ...payload, role: ROLES.INTERN };
    if (formMode === 'create') {
      createMut.mutate(base, { onSuccess: () => setFormOpen(false) });
    } else if (formInitial) {
      updateMut.mutate(
        { id: formInitial._id || formInitial.id, ...base },
        { onSuccess: () => setFormOpen(false) }
      );
    }
  };

  const forceLead = me?._id || me?.id;

  const columns = [
    {
      key: 'intern',
      header: 'Intern',
      minWidth: 280,
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-200">
            {row.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{row.fullName}</p>
            <p className="text-xs text-slate-400 truncate">@{row.username}</p>
          </div>
        </div>
      ),
    },
    // Email column removed per client request
    {
      key: 'teamLead',
      header: 'Reporting To',
      minWidth: 180,
      sortable: false,
      cell: (row) => {
        const l = row.teamLead;
        if (!l) {
          return (
            <span className="text-xs text-red-700 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              Unassigned
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-medium text-xs border border-brand-200">
              {l.fullName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{l.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {l.teamInfo?.teamName || l.teamName || '—'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 120,
      sortable: true,
      accessor: 'isActive',
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            row.isActive
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-red-700 bg-red-50 border-red-200'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              row.isActive ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          />
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      minWidth: 130,
      sortable: true,
      accessor: 'createdAt',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Seen',
      minWidth: 140,
      sortable: true,
      accessor: 'lastLogin',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(row.lastLogin)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      minWidth: 110,
      sortable: false,
      cellClassName: 'justify-end',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
            aria-label="Edit intern"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmDelete({
                open: true,
                id: row._id || row.id,
                row,
              })
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
            aria-label="Remove intern"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
            My Team
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Interns
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage the interns reporting to you directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add Intern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Total Interns
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                {total}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Active
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                {rows.filter((r) => r.isActive).length || total}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl border border-brand-200 bg-brand-50 flex items-center justify-center text-brand-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                This Month Joined
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                {(() => {
                  const now = new Date();
                  return rows.filter((r) => {
                    const d = new Date(r.createdAt);
                    return (
                      d.getUTCMonth() === now.getUTCMonth() &&
                      d.getUTCFullYear() === now.getUTCFullYear()
                    );
                  }).length;
                })()}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-center text-amber-600">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <DataTable
        title={`My Interns${total ? ` · ${total}` : ''}`}
        subtitle="Team members assigned under your supervision"
        loading={isLoading}
        columns={columns}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        searchPlaceholder="Search interns by name or username..."
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={(key, dir) => {
          setSortBy(key);
          setSortDir(dir);
        }}
        emptyState={
          <div className="text-center py-14">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">No interns yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Click “Add Intern” to create your first team member and start managing assignments.
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="primary" size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={openCreate}>
                Add Your First Intern
              </Button>
            </div>
          </div>
        }
      />

      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={onSubmit}
        submitting={formMode === 'create' ? createMut.isPending : updateMut.isPending}
        initial={formInitial}
        mode={formMode}
        allowedRoles={[ROLES.INTERN]}
        forceTeamLead={forceLead}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null, row: null })}
        onConfirm={() =>
          deleteMut.mutate(confirmDelete.id, {
            onSettled: () => setConfirmDelete({ open: false, id: null, row: null }),
          })
        }
        title="Remove Intern"
        message={
          confirmDelete.row ? (
            <p>
              Remove <span className="font-semibold text-slate-800">{confirmDelete.row.fullName}</span>{' '}
              permanently from your team? This deletes their account and cannot be undone.
            </p>
          ) : (
            'This action is permanent and cannot be undone.'
          )
        }
        confirmLabel="Remove Intern"
        tone="danger"
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default LeadInternsPage;
