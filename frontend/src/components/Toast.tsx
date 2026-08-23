/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
type Kind = 'success' | 'error';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}
interface Context {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}
const ToastContext = createContext<Context | undefined>(undefined);
let nextId = 1;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback(
    (id: number) =>
      setToasts((items) => items.filter((item) => item.id !== id)),
    [],
  );
  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++;
      setToasts((items) => [...items, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  const value = useMemo(
    () => ({
      showSuccess: (message: string) => push('success', message),
      showError: (message: string) => push('error', message),
    }),
    [push],
  );
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg ${toast.kind === 'success' ? 'border-emerald-200' : 'border-rose-200'}`}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="text-emerald-600" />
            ) : (
              <XCircle className="text-rose-600" />
            )}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast(): Context {
  const context = useContext(ToastContext);
  if (!context)
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
