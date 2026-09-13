import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { TextField, Button } from '../components/ui/Form';
import { useAuth } from '../context/AuthContext';
// Note: email login removed — username-only authentication

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggingIn, getDashboardPath } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  const getRedirect = () => {
    const params = new URLSearchParams(location.search);
    const r = params.get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) return r;
    return null;
  };

  const validate = () => {
    const e = {};
    const id = identifier.trim();
    if (!id) {
      e.identifier = 'Please enter your username.';
    } else if (id.length < 3) {
      e.identifier = 'Username must be at least 3 characters.';
    }

    if (!password) {
      e.password = 'Please enter your password.';
    } else if (password.length < 6) {
      e.password = 'Password must be at least 6 characters.';
    }
    return e;
  };

  useEffect(() => {
    if (attempted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    const payload = {
      username: identifier.trim(),
      password,
    };

    const res = await login(payload);
    if (res.ok && res.user) {
      const customRedirect = getRedirect();
      const target = customRedirect || getDashboardPath();
      navigate(target, { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your StaffPilot workspace."
      footerCta="Don't have an account?"
      footerLink="/register"
      footerLinkText="Create one"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label="Username"
          name="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. staffpilotadmin"
          required
          error={errors.identifier}
          leftIcon={<User className="h-4 w-4" />}
          disabled={isLoggingIn}
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
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
          disabled={isLoggingIn}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-slate-500 select-none cursor-pointer group">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500/30"
            />
            <span className="group-hover:text-slate-800 transition-colors">Remember me</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoggingIn}
          className="w-full mt-2"
        >
          {isLoggingIn ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      {/* Demo credentials removed for production-ready login experience */}
    </AuthLayout>
  );
};

export default LoginPage;
