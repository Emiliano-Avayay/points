import { Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Modal } from '@/components/ui/Modal';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { PointsPill } from '@/components/ui/Primitives';
import { balanceOf } from '@/domain/selectors';
import { useClient, useSessionActions } from '@/state/hooks';
import { useToast } from '@/components/ui/Toast';

/** Selector visual de comercio para la vista cliente. Cada comercio tiene su propio saldo. */
export function MerchantSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, customer, merchant, myMerchants } = useClient();
  const { setClientMerchant } = useSessionActions();
  const navigate = useNavigate();
  const toast = useToast();
  const others = state.merchants.filter((m) => !myMerchants.some((x) => x.id === m.id));
  return (
    <Modal open={open} onClose={onClose} title="Tus comercios" description="Tus puntos son independientes en cada comercio: solo se canjean donde los sumaste.">
      <ul className="flex flex-col gap-2">
        {myMerchants.map((m) => {
          const active = m.id === merchant.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setClientMerchant(m.id);
                  onClose();
                  if (!active) toast.info(`Ahora estás en ${m.name}`);
                }}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${active ? 'border-ink bg-lime-wash' : 'border-line bg-white hover:bg-surface'}`}
              >
                <MerchantMark merchant={m} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block truncate text-sm text-muted">{m.category}</span>
                </span>
                <PointsPill points={balanceOf(state, m.id, customer.id)} size="sm" />
                {active && <Check className="size-5 text-ink" aria-label="Seleccionado" />}
              </button>
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/app/comercios');
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-3 text-sm font-semibold hover:bg-surface"
        >
          <Plus className="size-4" aria-hidden /> Descubrí {others.length} {others.length === 1 ? 'comercio más' : 'comercios más'}
        </button>
      )}
    </Modal>
  );
}
