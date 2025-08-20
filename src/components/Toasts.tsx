import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => onDismiss(t.id), t.duration ?? 2400)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <div className="toast-icon" aria-hidden>
            {t.type === 'success' && <i className="bi bi-check-circle-fill" />}
            {t.type === 'error' && <i className="bi bi-x-circle-fill" />}
            {t.type === 'info' && <i className="bi bi-info-circle-fill" />}
          </div>
          <div className="toast-message">{t.message}</div>
          <button className="btn btn-sm btn-link text-muted p-0 ms-2" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <i className="bi bi-x" />
          </button>
        </div>
      ))}
    </div>
  );
}
