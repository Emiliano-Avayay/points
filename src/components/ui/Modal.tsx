import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** sheet: hoja inferior en móvil, centrado en escritorio · side: panel lateral (menú) */
  variant?: 'sheet' | 'side';
  size?: 'sm' | 'md' | 'lg';
  hideTitle?: boolean;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Diálogo accesible: foco atrapado, Escape para cerrar y devolución del foco al cerrar. */
export function Modal({ open, onClose, title, description, children, footer, variant = 'sheet', size = 'md', hideTitle }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' };
  const isSide = variant === 'side';

  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${isSide ? 'justify-start' : 'items-end justify-center sm:items-center'} sm:p-4`}>
      <div className="absolute inset-0 bg-ink/55 animate-[fade-up_200ms_ease-out_both]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={
          isSide
            ? 'relative flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-white pt-safe shadow-float animate-sheet-up sm:rounded-card'
            : `relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card bg-white shadow-float animate-sheet-up sm:rounded-card ${widths[size]}`
        }
      >
        <div className={`flex items-start justify-between gap-3 px-5 pt-5 ${hideTitle ? 'pb-0' : 'pb-3'}`}>
          <div className={hideTitle ? 'sr-only' : ''}>
            <h2 id={titleId} className="text-xl font-bold leading-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Cerrar" tone="soft" size="sm" onClick={onClose} className="-mr-1 ml-auto">
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
