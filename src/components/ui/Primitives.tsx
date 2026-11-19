import type { HTMLAttributes, ReactNode } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { fmtPoints } from '@/domain/format';

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-card bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Círculo lima con flecha, como en las tarjetas de la referencia. Decorativo dentro de un link. */
export function ArrowDot({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'size-8' : 'size-10';
  return (
    <span aria-hidden className={`inline-flex ${s} shrink-0 items-center justify-center rounded-full bg-lime text-ink transition-transform duration-200 group-hover:translate-x-0.5 ${className}`}>
      <ChevronRight className="size-5" strokeWidth={3} />
    </span>
  );
}

export function PointsPill({ points, className = '', size = 'md', label }: { points: number; className?: string; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const s = size === 'lg' ? 'h-12 px-5 text-xl gap-2' : size === 'sm' ? 'h-7 px-2.5 text-xs gap-1' : 'h-10 px-4 text-base gap-1.5';
  const icon = size === 'lg' ? 'size-5' : size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <span className={`inline-flex items-center rounded-full bg-lime font-bold text-ink tabular ${s} ${className}`} aria-label={label ?? `${fmtPoints(points)} puntos`}>
      <Star className={`${icon} fill-ink`} aria-hidden strokeWidth={0} />
      <span aria-hidden>{fmtPoints(points)}</span>
    </span>
  );
}

export type BadgeTone = 'lime' | 'neutral' | 'success' | 'warning' | 'danger' | 'dark' | 'outline';

export function Badge({ tone = 'neutral', children, className = '', icon }: { tone?: BadgeTone; children: ReactNode; className?: string; icon?: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    lime: 'bg-lime text-ink',
    neutral: 'bg-surface text-ink-3',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    dark: 'bg-ink text-white',
    outline: 'border border-line-strong text-ink-3',
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

export function ProgressBar({ value, max = 1, label, className = '', tone = 'lime' }: { value: number; max?: number; label: string; className?: string; tone?: 'lime' | 'ink' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={`h-3 w-full overflow-hidden rounded-full ${tone === 'lime' ? 'bg-ink/10' : 'bg-white/15'} ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone === 'lime' ? 'bg-lime' : 'bg-lime'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className = '' }: { icon: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center rounded-card border-2 border-dashed border-line bg-white px-6 py-10 text-center ${className}`}>
      <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-lime-soft text-ink" aria-hidden>
        {icon}
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="text-lg font-bold leading-tight">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Avatar({ name, className = '', tone = 'lime' }: { name: string; className?: string; tone?: 'lime' | 'dark' | 'soft' }) {
  const initialsText = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const tones = { lime: 'bg-lime text-ink', dark: 'bg-ink text-lime', soft: 'bg-surface text-ink' };
  return (
    <span aria-hidden className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tones[tone]} ${className}`}>
      {initialsText}
    </span>
  );
}

export function StatTile({ label, value, hint, icon, tone = 'white' }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'white' | 'lime' | 'dark' }) {
  const tones = { white: 'bg-white text-ink shadow-card', lime: 'bg-lime text-ink', dark: 'bg-ink text-white on-dark' };
  return (
    <div className={`rounded-tile p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[0.8rem] font-medium leading-snug ${tone === 'dark' ? 'text-white/70' : tone === 'lime' ? 'text-ink/75' : 'text-muted'}`}>{label}</p>
        {icon && <span aria-hidden>{icon}</span>}
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular leading-none tracking-tight">{value}</p>
      {hint && <p className={`mt-1.5 text-xs ${tone === 'dark' ? 'text-white/60' : tone === 'lime' ? 'text-ink/70' : 'text-muted'}`}>{hint}</p>}
    </div>
  );
}
