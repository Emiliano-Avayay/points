import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

const control =
  'w-full rounded-2xl border bg-white px-4 text-base text-ink placeholder:text-subtle transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-ink focus:ring-4 focus:ring-lime/60 disabled:bg-surface disabled:text-muted';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  id: string;
  children: ReactNode;
  optional?: boolean;
}

function FieldShell({ label, hint, error, id, children, optional }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[0.8rem] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function TextField({ label, hint, error, optional, prefix, suffix, id, className = '', ...rest }: TextFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid} optional={optional}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-4 text-muted" aria-hidden>{prefix}</span>}
        <input
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
          className={`${control} h-12 ${error ? 'border-danger' : 'border-line-strong'} ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-14' : ''} ${className}`}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute right-4 text-sm font-semibold text-muted" aria-hidden>{suffix}</span>}
      </div>
    </FieldShell>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
}

export function TextArea({ label, hint, error, optional, id, className = '', ...rest }: TextAreaProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid} optional={optional}>
      <textarea
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={`${control} min-h-28 py-3 leading-relaxed ${error ? 'border-danger' : 'border-line-strong'} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export function SelectField({ label, hint, error, id, className = '', children, ...rest }: SelectFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid}>
      <div className="relative">
        <select
          id={fid}
          aria-invalid={error ? true : undefined}
          className={`${control} h-12 appearance-none pr-11 ${error ? 'border-danger' : 'border-line-strong'} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </FieldShell>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={id} className="text-sm font-semibold">
          {label}
        </p>
        {description && <p className="text-[0.8rem] text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors duration-200 disabled:opacity-40 ${checked ? 'border-ink bg-lime' : 'border-line-strong bg-surface'}`}
      >
        <span className={`inline-block size-6 rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6 bg-ink' : 'translate-x-0.5 bg-white'}`} />
      </button>
    </div>
  );
}
