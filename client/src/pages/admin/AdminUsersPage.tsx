import { useMemo, useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  UserCog,
  User as UserIcon,
  Filter,
  Download,
} from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { Button } from '../../components/ui/Form.jsx';
import { SelectField } from '../../components/ui/Form.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { UserFormDialog } from '../../components/ui/UserFormDialog.jsx';
import {
  useUsers,
  useCreateUserMutation,
  useUpdateUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useCurrentUser,
  useTeamLeads,
} from '../../hooks/useApi.js';
import { ROLES, ROLE_LABELS, ROLE_BADGE_CLASS } from '../../constants/roles.js';

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

export const AdminUsersPage = () => {
  const { data: me } = useCurrentUser();
  const { data: leads = [] } = useTeamLeads();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      q: search || undefined,
      role: role || undefined,
      status: status || undefined,
      teamLead: teamLead || undefined,
      sortBy,
      sortDir,
    }),
    [page, pageSize, search, role, status, teamLead, sortBy, sortDir]
  );

  const { data, isLoading } = useUsers(params);
  const total = data?.total || 0;
  const rows = data?.data || [];

  const createMut = useCreateUserMutation();
  const updateMut = useUpdateUserMutation();
  const activateMut = useActivateUserMutation();
  const deactivateMut = useDeactivateUserMutation();
  const deleteMut = useDeleteUserMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitial, setFormInitial] = useState(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    id: null,
    action: null,
    row: null,
  });

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
    if (formMode === 'create') {
      createMut.mutate(payload, {
        onSuccess: () => setFormOpen(false),
      });
    } else if (formInitial) {
      updateMut.mutate(
        { id: formInitial._id || formInitial.id, ...payload },
        { onSuccess: () => setFormOpen(false) }
      );
    }
  };

  const confirmAction = (row, action) => {
    setConfirmState({ open: true, id: row._id || row.id, action, row });
  };

  const runConfirm = () => {
    const { id, action } = confirmState;
    const done = () => setConfirmState({ open: false, id: null, action: null, row: null });
    if (action === 'activate') activateMut.mutate(id, { onSettled: done });
    else if (action === 'deactivate') deactivateMut.mutate(id, { onSettled: done });
    else if (action === 'delete') deleteMut.mutate(id, { onSettled: done });
  };

  const columns = [
    {
      key: 'user',
      header: 'User',
      minWidth: 260,
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-medium text-sm border ${
              row.role === ROLES.SUPER_ADMIN
                ? 'bg-red-50 text-red-600 border-red-200'
                : row.role === ROLES.TEAM_LEAD
                ? 'bg-brand-50 text-brand-600 border-brand-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}
          >
            {row.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{row.fullName}</p>
            <p className="text-xs text-slate-400 truncate">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: 'role',
      minWidth: 140,
      cell: (row) => {
        const Icon =
          row.role === ROLES.SUPER_ADMIN
            ? ShieldCheck
            : row.role === ROLES.TEAM_LEAD
            ? UserCog
            : UserIcon;
        return (
          <span className={`badge-role ${ROLE_BADGE_CLASS[row.role]}`}>
            <Icon className="h-3 w-3" />
            {ROLE_LABELS[row.role]}
          </span>
        );
      },
    },
    {
      key: 'teamLead',
      header: 'Team Lead / Team',
      minWidth: 180,
      sortable: false,
      cell: (row) => {
        if (row.role === ROLES.TEAM_LEAD) {
          const t = row.teamInfo;
          return (
            <div className="min-w-0">
              <p className="text-sm text-slate-800 truncate">{t?.teamName || '—'}</p>
              <p className="text-xs text-slate-400 truncate">{t?.department || '—'}</p>
            </div>
          );
        }
        if (row.role === ROLES.INTERN) {
          const l = row.teamLead;
          return (
            <div className="min-w-0">
              <p className="text-sm text-slate-800 truncate">
                {l?.fullName || '—'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {l?.teamInfo?.teamName || l?.teamName || 'Unassigned'}
              </p>
            </div>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      minWidth: 120,
      sortable: true,
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
      key: 'createdAt',
      header: 'Joined',
      minWidth: 120,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-slate-600">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      minWidth: 140,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-slate-600">{formatDate(row.lastLogin)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      minWidth: 140,
      sortable: false,
      cellClassName: 'justify-end',
      cell: (row) => {
        const self = String(row._id || row.id) === String(me?._id || me?.id);
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
              aria-label="Edit user"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {row.isActive ? (
              <button
                type="button"
                onClick={() => confirmAction(row, 'deactivate')}
                disabled={self}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                aria-label="Deactivate"
                title="Deactivate"
              >
                <UserX className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => confirmAction(row, 'activate')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                aria-label="Activate"
                title="Activate"
              >
                <UserCheck className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => confirmAction(row, 'delete')}
              disabled={self}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              aria-label="Delete user"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const leadOptions = leads.map((l) => ({
    value: l.id,
    label: `${l.fullName} (${l.teamName})`,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brand-600 uppercase tracking-wider mb-1">
            Management
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Users & Roles
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            View, create, and manage all user accounts across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => {
              const header = ['Name', 'Username', 'Role', 'Status', 'Joined'];
              const csv =
                [
                  header,
                  ...rows.map((r) => [
                    r.fullName,
                    r.username,
                    ROLE_LABELS[r.role],
                    r.isActive ? 'Active' : 'Inactive',
                    formatDate(r.createdAt),
                  ]),
                ]
                  .map((row) =>
                    row
                      .map((v) => {
                        const s = String(v ?? '');
                        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                      })
                      .join(',')
                  )
                  .join('\n');
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add User
          </Button>
        </div>
      </div>

      <DataTable
        title={`All Users${total ? ` · ${total}` : ''}`}
        subtitle="Organization-wide accounts with role-based controls"
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
        searchPlaceholder="Search by name or username..."
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
        filters={
          <>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <SelectField
                placeholder="All roles"
                options={[
                  { value: '', label: 'All roles' },
                  { value: ROLES.TEAM_LEAD, label: 'Team Leads' },
                  { value: ROLES.INTERN, label: 'Interns' },
                ]}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="!py-1.5 !px-2 text-xs"
                inputClassName="!py-1.5 text-xs min-w-[140px]"
              />
              <SelectField
                placeholder="All status"
                options={[
                  { value: '', label: 'All status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                inputClassName="!py-1.5 text-xs min-w-[120px]"
              />
              <SelectField
                placeholder="All team leads"
                options={[
                  { value: '', label: 'All team leads' },
                  ...leadOptions,
                ]}
                value={teamLead}
                onChange={(e) => {
                  setTeamLead(e.target.value);
                  setPage(1);
                }}
                inputClassName="!py-1.5 text-xs min-w-[180px]"
              />
            </div>
          </>
        }
      />

      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={onSubmit}
        submitting={formMode === 'create' ? createMut.isPending : updateMut.isPending}
        initial={formInitial}
        mode={formMode}
      />

      <ConfirmDialog
        open={confirmState.open && confirmState.action === 'deactivate'}
        onClose={() => setConfirmState({ open: false, id: null, action: null, row: null })}
        onConfirm={runConfirm}
        title="Deactivate User"
        message={
          confirmState.row ? (
            <p>
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-slate-800">
                {confirmState.row.fullName}
              </span>
              ? They will no longer be able to log in.
            </p>
          ) : (
            'This user will no longer be able to log in.'
          )
        }
        confirmLabel="Deactivate"
        tone="warning"
        loading={deactivateMut.isPending}
      />

      <ConfirmDialog
        open={confirmState.open && confirmState.action === 'activate'}
        onClose={() => setConfirmState({ open: false, id: null, action: null, row: null })}
        onConfirm={runConfirm}
        title="Activate User"
        message={
          confirmState.row ? (
            <p>
              Reactivate <span className="font-semibold text-slate-800">{confirmState.row.fullName}</span>{' '}
              and restore access to the platform.
            </p>
          ) : (
            'This user will regain access.'
          )
        }
        confirmLabel="Activate"
        tone="success"
        loading={activateMut.isPending}
      />

      <ConfirmDialog
        open={confirmState.open && confirmState.action === 'delete'}
        onClose={() => setConfirmState({ open: false, id: null, action: null, row: null })}
        onConfirm={runConfirm}
        title="Delete User"
        message={
          confirmState.row ? (
            <p>
              Permanently delete{' '}
              <span className="font-semibold text-slate-800">
                {confirmState.row.fullName}
              </span>
              ? This action is irreversible and will remove all associated data.
            </p>
          ) : (
            'This action cannot be undone.'
          )
        }
        confirmLabel="Delete Permanently"
        tone="danger"
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default AdminUsersPage;
