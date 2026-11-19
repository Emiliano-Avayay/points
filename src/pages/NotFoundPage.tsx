import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { SummaLogo } from '@/components/brand/Logo';

export function NotFoundPage({ inApp }: { inApp?: boolean }) {
  return (
    <div className={`mx-auto flex max-w-md flex-col items-center gap-6 px-4 ${inApp ? 'pt-8' : 'min-h-dvh justify-center'}`}>
      {!inApp && <SummaLogo />}
      <EmptyState
        className="w-full"
        icon={<SearchX className="size-7" />}
        title="Página no encontrada"
        description="El enlace no existe o cambió de lugar."
        action={<ButtonLink to={inApp ? '/app' : '/'}>Volver al inicio</ButtonLink>}
      />
    </div>
  );
}
