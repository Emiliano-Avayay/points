import type { ReactNode } from 'react';

interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Grupo de filtros tipo píldora (radio group accesible). */
export function ChipGroup<T extends string>({ options, value, onChange, label, className = '' }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={`no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${
              active ? 'bg-ink text-white on-dark' : 'border border-line bg-white text-ink hover:bg-surface'
            }`}
          >
            {o.icon}
            {o.label}
            {o.count !== undefined && <span className={`tabular text-xs ${active ? 'text-lime' : 'text-muted'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Pestañas segmentadas. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors duration-150 min-[400px]:px-3 ${active ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'}`}
          >
            {o.icon && <span className="hidden shrink-0 min-[400px]:inline-flex">{o.icon}</span>}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
