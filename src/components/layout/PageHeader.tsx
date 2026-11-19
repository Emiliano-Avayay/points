import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

/** Encabezado de pantallas internas del cliente: volver + título + subtítulo. */
export function PageHeader({ title, subtitle, action, back = true }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="mb-5 flex items-start gap-2">
      {back && (
        <IconButton label="Volver" tone="soft" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))} className="-ml-1 mt-0.5">
          <ArrowLeft className="size-5" aria-hidden />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 animate-fade-up ${className}`}>{children}</div>;
}
