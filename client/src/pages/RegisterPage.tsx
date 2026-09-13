import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, AtSign, Lock, Eye, EyeOff, Briefcase, Users } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { TextField, SelectField, Button } from '../components/ui/Form';
import { useAuth } from '../context/AuthContext';
import { useTeamLeads } from '../hooks/useApi';
import { REGISTER_ROLE_OPTIONS, ROLES, USERNAME_REGEX } from '../constants/roles';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isRegistering, getDashboardPath } = useAuth();
  const { data: teamLeads = [], isLoading: loadingLeads } = useTeamLeads({ enabled: true });

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    teamInfo: { teamName: '', department: '', projectFocus: '' },
    teamLead: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  const role = form.role;
  const isLead = role === ROLES.TEAM_LEAD;
  const isIntern = role === ROLES.INTERN;

  const teamLeadOptions = useMemo(() => {
    return teamLeads.map((l) => ({
      value: l.id,
      label: `${l.fullName} — ${l.teamName || 'Unassigned'}`,
    }));
  }, [teamLeads]);

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };
  const updateTeamInfo = (key, val) => {
    setForm((prev) => ({ ...prev, teamInfo: { ...prev.teamInfo, [key]: val } }));
  };

  const validate = () => {
    const e = {};

    const fullName = form.fullName.trim();
    if (!fullName) e.fullName = 'Full name is required.';
    else if (fullName.length < 2) e.fullName = 'Full name must be at least 2 characters.';
    else if (fullName.length > 100) e.fullName = 'Full name cannot exceed 100 characters.';

    // Email removed from registration form per client request.

    const username = form.username.trim();
    if (!username) e.username = 'Username is required.';
    else if (!USERNAME_REGEX.test(username))
      e.username = '3-50 letters, numbers, or underscores only.';

    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';

    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.';

    if (!form.role) e.role = 'Please select a role.';
    else if (![ROLES.TEAM_LEAD, ROLES.INTERN].includes(form.role))
      e.role = 'Invalid role selection.';

    if (isLead) {
      const teamName = form.teamInfo.teamName.trim();
      if (!teamName) e['teamInfo.teamName'] = 'Team name is required.';
      else if (teamName.length > 100) e['teamInfo.teamName'] = '100 characters max.';
    }

    if (isIntern) {
      if (!form.teamLead) e.teamLead = 'You must select a Team Lead.';
    }

    return e;
  };

  useEffect(() => {
    if (attempted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.fullName,
    form.username,
    form.password,
    form.confirmPassword,
    form.role,
    form.teamLead,
    form.teamInfo.teamName,
    form.teamInfo.department,
    form.teamInfo.projectFocus,
  ]);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setAttempted(true);
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    const payload = {
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      role: form.role,
    };

    // Provide a fallback email so backend that requires email continues to work
    if (!payload.username) payload.username = `user${Date.now()}`;
    payload.email = `${payload.username}@example.com`;

    if (isLead) {
      payload.teamInfo = {
        teamName: form.teamInfo.teamName.trim(),
        department: form.teamInfo.department.trim() || undefined,
        projectFocus: form.teamInfo.projectFocus.trim() || undefined,
      };
    }

    if (isIntern) {
      payload.teamLead = form.teamLead;
    }

    const res = await register(payload);
    if (res.ok && res.user) {
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      const target = redirect && redirect.startsWith('/') ? redirect : getDashboardPath();
      navigate(target, { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join StaffPilot and start collaborating with your team today."
      footerCta="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <TextField
            label="Full Name"
            name="fullName"
            placeholder="Jane Doe"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            required
            error={errors.fullName}
            leftIcon={<User className="h-4 w-4" />}
            disabled={isRegistering}
          />
        </div>

        <TextField
          label="Username"
          name="username"
          placeholder="jane_doe"
          value={form.username}
          onChange={(e) => update('username', e.target.value)}
          required
          error={errors.username}
          hint="Letters, numbers, and underscores only."
          leftIcon={<AtSign className="h-4 w-4" />}
          disabled={isRegistering}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            error={errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="pointer-events-auto text-slate-500 hover:text-slate-800 transition-colors"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            disabled={isRegistering}
          />
          <TextField
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            required
            error={errors.confirmPassword}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="pointer-events-auto text-slate-500 hover:text-slate-800 transition-colors"
                onClick={() => setShowConfirm((s) => !s)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            disabled={isRegistering}
          />
        </div>

        <SelectField
          label="Role"
          name="role"
          value={form.role}
          onChange={(e) => update('role', e.target.value)}
          required
          error={errors.role}
          placeholder="Select your role"
          options={REGISTER_ROLE_OPTIONS}
          disabled={isRegistering}
        />

        {isLead && (
          <div
            className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-4 animate-fade-in"
            role="group"
            aria-label="Team Lead information"
          >
            <div className="flex items-center gap-2 text-brand-600">
              <Briefcase className="h-4 w-4" />
              <p className="text-sm font-medium">Team Information</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Team Name"
                placeholder="e.g. Platform Engineering"
                value={form.teamInfo.teamName}
                onChange={(e) => updateTeamInfo('teamName', e.target.value)}
                required
                error={errors['teamInfo.teamName']}
                disabled={isRegistering}
              />
              <TextField
                label="Department (optional)"
                placeholder="e.g. Engineering"
                value={form.teamInfo.department}
                onChange={(e) => updateTeamInfo('department', e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <TextField
              label="Project Focus (optional)"
              placeholder="e.g. SaaS platform development"
              value={form.teamInfo.projectFocus}
              onChange={(e) => updateTeamInfo('projectFocus', e.target.value)}
              disabled={isRegistering}
              hint="Short description of the team's focus area."
            />
          </div>
        )}

        {isIntern && (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-fade-in"
            role="group"
            aria-label="Intern assignment"
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-4">
              <Users className="h-4 w-4" />
              <p className="text-sm font-medium">Team Lead Assignment</p>
            </div>
            <SelectField
              label="Select Team Lead"
              name="teamLead"
              value={form.teamLead}
              onChange={(e) => update('teamLead', e.target.value)}
              required
              error={errors.teamLead}
              placeholder={
                loadingLeads
                  ? 'Loading Team Leads...'
                  : teamLeads.length
                    ? 'Choose a Team Lead'
                    : 'No Team Leads available yet'
              }
              emptyLabel="No Team Leads are registered yet. Please ask an admin."
              loading={loadingLeads}
              options={teamLeadOptions}
              disabled={isRegistering || teamLeads.length === 0}
              hint="You will be assigned to the selected Team Lead's team."
            />
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isRegistering}
          className="w-full mt-2"
        >
          {isRegistering ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
