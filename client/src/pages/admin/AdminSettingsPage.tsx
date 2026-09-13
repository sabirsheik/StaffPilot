import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  Globe,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Form';
import { settingsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const defaultSettings = {
  companyName: 'StaffPilot',
  timezone: 'UTC+05:00',
  autoLogout: true,
  sessionTimeout: '30 min',
  taskNotifications: true,
  projectAlerts: true,
  attendanceReminders: false,
  securityMode: 'strict',
  maintenanceMode: false,
};

const settingCards = [
  {
    id: 'workspace',
    title: 'Workspace Preferences',
    icon: Building2,
    tone: 'bg-brand-50 text-brand-700',
    description: 'Set the primary working environment details for the whole platform.',
  },
  {
    id: 'security',
    title: 'Security & Access',
    icon: ShieldCheck,
    tone: 'bg-emerald-50 text-emerald-700',
    description: 'Control access hygiene and session protection policies.',
  },
  {
    id: 'communication',
    title: 'Communications',
    icon: Bell,
    tone: 'bg-amber-50 text-amber-700',
    description: 'Control messaging, notifications, and operational reminders.',
  },
];

const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
    <span className="relative inline-flex h-6 w-11 items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-500" />
      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
    </span>
  </label>
);

const AdminSettingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [savedAt, setSavedAt] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!isAuthenticated) return;

      try {
        const res = await settingsApi.getSettings();
        const savedSettings = res?.data?.data || res?.data || {};
        setSettings({ ...defaultSettings, ...savedSettings });
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Unable to load saved settings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [isAuthenticated]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isAuthenticated || user?.role !== 'super_admin') {
      toast.error('Only the Super Admin can update platform settings.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await settingsApi.updateSettings(settings);
      const savedSettings = res?.data?.data || res?.data || {};
      setSettings({ ...defaultSettings, ...savedSettings });
      setSavedAt(new Date());
      toast.success('Platform settings saved successfully.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Unable to save settings right now.');
    } finally {
      setTimeout(() => setIsSaving(false), 350);
    }
  };

  const lastSavedLabel = useMemo(() => {
    return savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [savedAt]);

  return (
    <div className="page-shell space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">System</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Platform Settings</h2>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {isLoading ? 'Loading saved settings...' : `Saved at ${lastSavedLabel}`}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {settingCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
                    <p className="text-sm text-slate-500">{card.description}</p>
                  </div>
                </div>

                {card.id === 'workspace' && (
                  <div className="space-y-4">
                    <div>
                      <label className="label-base">Company name</label>
                      <input
                        value={settings.companyName}
                        onChange={(e) => updateSetting('companyName', e.target.value)}
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="label-base">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="input-base appearance-none"
                      >
                        <option value="UTC+05:00">UTC+05:00</option>
                        <option value="UTC+00:00">UTC+00:00</option>
                        <option value="UTC-05:00">UTC-05:00</option>
                        <option value="UTC+01:00">UTC+01:00</option>
                      </select>
                    </div>
                  </div>
                )}

                {card.id === 'security' && (
                  <div className="space-y-4">
                    <Toggle
                      checked={settings.autoLogout}
                      onChange={(e) => updateSetting('autoLogout', e.target.checked)}
                      label="Automatic session logout"
                      hint="End inactive sessions automatically for better protection."
                    />

                    <div>
                      <label className="label-base">Session timeout</label>
                      <select
                        value={settings.sessionTimeout}
                        onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                        className="input-base appearance-none"
                      >
                        <option value="15 min">15 min</option>
                        <option value="30 min">30 min</option>
                        <option value="45 min">45 min</option>
                        <option value="60 min">60 min</option>
                      </select>
                    </div>

                    <div>
                      <label className="label-base">Security mode</label>
                      <select
                        value={settings.securityMode}
                        onChange={(e) => updateSetting('securityMode', e.target.value)}
                        className="input-base appearance-none"
                      >
                        <option value="strict">Strict</option>
                        <option value="balanced">Balanced</option>
                        <option value="light">Light</option>
                      </select>
                    </div>
                  </div>
                )}

                {card.id === 'communication' && (
                  <div className="space-y-4">
                    <Toggle
                      checked={settings.taskNotifications}
                      onChange={(e) => updateSetting('taskNotifications', e.target.checked)}
                      label="Task notifications"
                      hint="Push updates when a task is created, changed, or completed."
                    />

                    <Toggle
                      checked={settings.projectAlerts}
                      onChange={(e) => updateSetting('projectAlerts', e.target.checked)}
                      label="Project alerts"
                      hint="Get notified when project milestones or remarks change."
                    />

                    <Toggle
                      checked={settings.attendanceReminders}
                      onChange={(e) => updateSetting('attendanceReminders', e.target.checked)}
                      label="Attendance reminders"
                      hint="Send check-in reminders before the working day starts."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live status</p>
                <h3 className="text-xl font-semibold text-slate-900">System overview</h3>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Environment</span>
                  <span className="font-semibold text-slate-900">Production</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Session health</span>
                  <span className="font-semibold text-emerald-600">Stable</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Notifications</span>
                  <span className="font-semibold text-slate-900">{settings.taskNotifications ? 'Enabled' : 'Paused'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Quick action</p>
                <h3 className="text-xl font-semibold text-slate-900">Apply changes</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Lock className="h-4 w-4" />
                    Access controls
                  </div>
                  <span className="font-semibold text-slate-900">{settings.securityMode}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock3 className="h-4 w-4" />
                    Auto logout
                  </div>
                  <span className="font-semibold text-slate-900">{settings.autoLogout ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="h-4 w-4" />
                    Timezone
                  </div>
                  <span className="font-semibold text-slate-900">{settings.timezone}</span>
                </div>
              </div>

              <Button onClick={handleSave} loading={isSaving || isLoading} className="w-full justify-center" disabled={isLoading}>
                Save settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
