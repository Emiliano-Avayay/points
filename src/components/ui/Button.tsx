import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { LoaderCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-full select-none transition-[background-color,box-shadow,color,opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-lime text-ink hover:bg-lime-strong shadow-lime',
  dark: 'bg-ink text-white hover:bg-ink-2 on-dark',
  secondary: 'bg-white text-ink border border-line-strong hover:bg-surface',
  ghost: 'bg-transparent text-ink hover:bg-surface',
  danger: 'bg-danger text-white hover:brightness-110',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', full = false, extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', full, loading, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, full, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', full, icon, className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, full, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'plain' | 'lime' | 'dark' | 'soft';
  size?: 'sm' | 'md';
}

export function IconButton({ label, tone = 'plain', size = 'md', className = '', children, type = 'button', ...rest }: IconButtonProps) {
  const tones = {
    plain: 'text-ink hover:bg-surface',
    soft: 'bg-surface text-ink hover:bg-line',
    lime: 'bg-lime text-ink hover:bg-lime-strong',
    dark: 'bg-ink text-white hover:bg-ink-2 on-dark',
  };
  const s = size === 'sm' ? 'size-10' : 'size-11';
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex ${s} shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:opacity-40 ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
