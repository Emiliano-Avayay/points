import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-2), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4200);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-float animate-sheet-up on-dark"
          >
            <span className={`mt-0.5 ${t.tone === 'error' ? 'text-[#ff8a80]' : 'text-lime'}`} aria-hidden>
              {t.tone === 'success' ? <CircleCheck className="size-5" /> : t.tone === 'error' ? <CircleAlert className="size-5" /> : <Info className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[0.8rem] text-white/75">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 rounded-full p-1 text-white/70 hover:text-white" aria-label="Cerrar aviso">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
