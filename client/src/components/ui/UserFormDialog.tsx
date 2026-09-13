import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button, TextField, SelectField } from './Form.jsx';
import { useTeamLeads } from '../../hooks/useApi';
import { ROLES, ROLE_LABELS, REGISTER_ROLE_OPTIONS } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';

export const UserFormDialog = ({
  open,
  onClose,
  onSubmit,
  submitting,
  initial = null,
  mode = 'create',
  allowedRoles = null,
  forceTeamLead = null,
}) => {
  const { user: authUser } = useAuth();
  const { data: teamLeads = [], isLoading: leadsLoading } = useTeamLeads();

  const isSuperAdmin = authUser?.role === ROLES.SUPER_ADMIN;
  const editableRole = isSuperAdmin;

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: ROLES.INTERN,
    isActive: true,
    teamLead: forceTeamLead || '',
    teamInfo: { teamName: '', department: '', projectFocus: '' },
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        fullName: initial.fullName || '',
        
        username: initial.username || '',
        password: '',
        confirmPassword: '',
        role: initial.role || ROLES.INTERN,
        isActive: initial.isActive ?? true,
        teamLead: String(initial.teamLead?._id || initial.teamLead || forceTeamLead || ''),
        teamInfo: {
          teamName: initial.teamInfo?.teamName || '',
          department: initial.teamInfo?.department || '',
          projectFocus: initial.teamInfo?.projectFocus || '',
        },
      });
    } else {
      setForm({
        fullName: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: ROLES.INTERN,
        isActive: true,
        teamLead: forceTeamLead || '',
        teamInfo: { teamName: '', department: '', projectFocus: '' },
      });
    }
    setErrors({});
  }, [open, initial, forceTeamLead]);

  if (!open) return null;

  const update = (k, v) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const updateTeamInfo = (k, v) => {
    setForm((prev) => ({
      ...prev,
      teamInfo: { ...prev.teamInfo, [k]: v },
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required.';
    // Email removed from user forms per client request.
    if (!form.username.trim()) e.username = 'Username is required.';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username))
      e.username = 'Letters, numbers, underscores only.';

    if (mode === 'create') {
      if (!form.password) e.password = 'Password is required.';
      else if (form.password.length < 6)
        e.password = 'At least 6 characters.';
      if (!form.confirmPassword) e.confirmPassword = 'Confirm your password.';
      else if (form.confirmPassword !== form.password)
        e.confirmPassword = 'Passwords do not match.';
    } else if (form.password || form.confirmPassword) {
      if (form.password && form.password.length < 6)
        e.password = 'At least 6 characters.';
      if (form.confirmPassword !== form.password)
        e.confirmPassword = 'Passwords do not match.';
    }

    if (!form.role) e.role = 'Role is required.';
    if (form.role === ROLES.INTERN && !form.teamLead)
      e.teamLead = 'Assign a Team Lead.';
    if (
      form.role === ROLES.TEAM_LEAD &&
      !form.teamInfo?.teamName?.trim() &&
      isSuperAdmin
    )
      e.teamName = 'Team name is required.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    delete payload.confirmPassword;
    if (!payload.password) delete payload.password;
    if (payload.role !== ROLES.TEAM_LEAD) delete payload.teamInfo;
    // Ensure a valid email is present for APIs that still require it
    if (!payload.email) payload.email = `${payload.username || 'user'}@example.com`;
    onSubmit(payload);
  };

  const availableRoles = (
    allowedRoles ||
    (isSuperAdmin
      ? REGISTER_ROLE_OPTIONS
      : [{ value: ROLES.INTERN, label: ROLE_LABELS[ROLES.INTERN] }])
  ).filter(Boolean);

  const roleOptions = availableRoles.map((r) =>
    typeof r === 'object'
      ? r
      : { value: r, label: ROLE_LABELS[r] || r }
  );

  const leadOptions = teamLeads.map((l) => ({
    value: l.id,
    label: `${l.fullName} (${l.teamName || 'Unassigned'})`,
  }));

  const disabled = submitting;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !disabled && onClose?.()}
      />
      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        <div className="card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {mode === 'create' ? 'Add User' : 'Edit User'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {mode === 'create'
                  ? 'Create a new account with the selected role.'
                  : 'Update user details and account settings.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !disabled && onClose?.()}
              disabled={disabled}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Full Name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                error={errors.fullName}
                placeholder="Jane Doe"
                required
                disabled={disabled}
              />
              <TextField
                label="Username"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                error={errors.username}
                placeholder="jane_doe"
                required
                disabled={disabled}
              />
              {/* Email field removed */}
              <SelectField
                label="Role"
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
                error={errors.role}
                options={roleOptions}
                placeholder="Select a role"
                disabled={disabled || !editableRole}
                required
              />
              <SelectField
                label="Account Status"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => update('isActive', e.target.value === 'active')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                disabled={disabled || !isSuperAdmin}
              />
              {form.role === ROLES.INTERN && (
                <div className="sm:col-span-2">
                  <SelectField
                    label="Assigned Team Lead"
                    value={form.teamLead}
                    onChange={(e) => update('teamLead', e.target.value)}
                    error={errors.teamLead}
                    options={leadOptions}
                    loading={leadsLoading}
                    placeholder={leadsLoading ? 'Loading team leads...' : 'Select a Team Lead'}
                    required
                    disabled={disabled || Boolean(forceTeamLead)}
                  />
                </div>
              )}

              {form.role === ROLES.TEAM_LEAD && isSuperAdmin && (
                <div className="sm:col-span-2 space-y-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Team Information
                  </p>
                  <TextField
                    label="Team Name"
                    value={form.teamInfo.teamName}
                    onChange={(e) => updateTeamInfo('teamName', e.target.value)}
                    error={errors.teamName}
                    placeholder="Frontend Squad"
                    required
                    disabled={disabled}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Department"
                      value={form.teamInfo.department}
                      onChange={(e) => updateTeamInfo('department', e.target.value)}
                      placeholder="Engineering"
                      disabled={disabled}
                    />
                    <TextField
                      label="Project Focus"
                      value={form.teamInfo.projectFocus}
                      onChange={(e) => updateTeamInfo('projectFocus', e.target.value)}
                      placeholder="Web Platform"
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}

              <div className="sm:col-span-2 divider my-1" />

              <TextField
                label={mode === 'create' ? 'Password' : 'New Password (optional)'}
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                error={errors.password}
                hint={mode === 'create' ? 'At least 6 characters.' : 'Leave blank to keep current.'}
                placeholder="••••••••"
                required={mode === 'create'}
                disabled={disabled}
              />
              <TextField
                label={mode === 'create' ? 'Confirm Password' : 'Confirm New Password'}
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
                placeholder="••••••••"
                required={mode === 'create' || Boolean(form.password)}
                disabled={disabled}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 -mx-6 -mb-5 px-6 py-4 bg-slate-50/70">
              <Button
                type="button"
                variant="secondary"
                onClick={() => !disabled && onClose?.()}
                disabled={disabled}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={disabled}
              >
                {mode === 'create' ? 'Create User' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserFormDialog;
