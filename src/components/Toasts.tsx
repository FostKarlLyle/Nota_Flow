import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react';
import { useDiagram } from '../store/useDiagram';

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: XCircle,
};

const COLORS = {
  success: 'text-emerald-500',
  info: 'text-sky-500',
  warning: 'text-amber-500',
  error: 'text-rose-500',
};

export function Toasts() {
  const toasts = useDiagram((s) => s.toasts);
  const dismiss = useDiagram((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.level];
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-lg transition hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <Icon size={14} className={COLORS[toast.level]} />
            {toast.message}
          </button>
        );
      })}
    </div>
  );
}
