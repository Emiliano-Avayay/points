import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RotateCcw } from 'lucide-react';
import { useStore } from '@/state/StoreProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

/** Botón para restablecer la demo a su estado inicial (con confirmación). */
export function ResetDemoButton({ variant = 'secondary', full, onDone, className = '' }: { variant?: 'secondary' | 'ghost' | 'dark'; full?: boolean; onDone?: () => void; className?: string }) {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} full={full} size="sm" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => setOpen(true)} className={className}>
        Restablecer demo
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="¿Restablecer la demo?"
        description="Se borran todas las modificaciones hechas en este navegador (acreditaciones, canjes, premios y comercios creados) y se vuelve a los datos iniciales. No afecta a otras aplicaciones."
        confirmLabel="Sí, restablecer"
        tone="danger"
        onConfirm={() => {
          store.reset();
          setOpen(false);
          onDone?.();
          navigate('/');
          toast.success('Demo restablecida', 'Volviste a los datos iniciales.');
        }}
      />
    </>
  );
}
