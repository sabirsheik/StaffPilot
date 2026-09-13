import { useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from './Form.jsx';

const TONE_ICONS = {
  danger: { Icon: AlertTriangle, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
  warning: { Icon: AlertCircle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  success: { Icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  info: { Icon: Info, className: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
};

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  confirmVariant = 'primary',
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  const toneConfig = TONE_ICONS[tone] || TONE_ICONS.info;
  const { Icon, className } = toneConfig;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !loading && onClose?.()}
      />
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="card p-6 shadow-panel">
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${className}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-slate-900"
              >
                {title}
              </h3>
              {message && (
                <div className="mt-2 text-sm leading-relaxed text-slate-600">
                  {typeof message === 'string' ? <p>{message}</p> : message}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => !loading && onClose?.()}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              size="md"
              loading={loading}
              onClick={onConfirm}
              className={tone === 'danger' ? '!bg-red-500 hover:!bg-red-600 active:!bg-red-700 focus:!ring-red-500/50' : ''}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
