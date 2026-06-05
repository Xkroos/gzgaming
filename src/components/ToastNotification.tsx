import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: Toast = { ...toastData, id, duration: toastData.duration ?? 4000 };
    setToasts(prev => [newToast, ...prev].slice(0, 5)); // Max 5 toasts

    // Auto-remove after duration
    setTimeout(() => removeToast(id), newToast.duration);
  }, [removeToast]);

  const toast = {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// Individual Toast Item
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev - (100 / (duration / 100));
        return next < 0 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const config = {
    success: {
      icon: <CheckCircle size={18} />,
      color: 'var(--neon-green)',
      glow: 'rgba(57, 255, 20, 0.15)',
      border: 'rgba(57, 255, 20, 0.3)',
    },
    error: {
      icon: <XCircle size={18} />,
      color: 'var(--neon-red)',
      glow: 'rgba(255, 51, 102, 0.15)',
      border: 'rgba(255, 51, 102, 0.3)',
    },
    warning: {
      icon: <AlertTriangle size={18} />,
      color: 'var(--neon-yellow)',
      glow: 'rgba(255, 204, 0, 0.15)',
      border: 'rgba(255, 204, 0, 0.3)',
    },
    info: {
      icon: <Info size={18} />,
      color: 'var(--neon-cyan)',
      glow: 'rgba(0, 240, 255, 0.15)',
      border: 'rgba(0, 240, 255, 0.3)',
    },
  }[toast.type];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${config.border}`,
        borderLeft: `4px solid ${config.color}`,
        borderRadius: '10px',
        padding: '14px 16px',
        minWidth: '300px',
        maxWidth: '380px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${config.glow}`,
        backdropFilter: 'blur(12px)',
        animation: isExiting ? 'toast-exit 0.3s ease-in forwards' : 'toast-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={handleDismiss}
    >
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '3px',
        width: `${progress}%`,
        background: config.color,
        transition: 'width 0.1s linear',
        borderRadius: '0 0 0 10px',
        opacity: 0.7,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ color: config.color, flexShrink: 0, marginTop: '2px' }}>
          {config.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', marginBottom: toast.message ? '2px' : 0 }}>
            {toast.title}
          </div>
          {toast.message && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {toast.message}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// Toast Container
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-enter {
          from { opacity: 0; transform: translateX(100%) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toast-exit {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(100%) scale(0.95); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        alignItems: 'flex-end',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  );
};
