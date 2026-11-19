import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CircleAlert, CircleCheck, Gift, PackageCheck, Store, Ticket } from 'lucide-react';
import { useClient, useSessionActions } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { RewardImage } from '@/components/ui/RewardImage';
import { Badge, EmptyState, PointsPill, ProgressBar } from '@/components/ui/Primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { FavoriteButton } from '@/components/rewards/RewardCard';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { useToast } from '@/components/ui/Toast';
import { getMerchant, getReward, isMember } from '@/domain/selectors';
import { redeemReward } from '@/domain/operations';
import { fmtPoints } from '@/domain/format';
import { uid } from '@/domain/ids';
import type { Redemption } from '@/domain/types';

export function RewardDetailPage() {
  const { rewardId = '' } = useParams();
  const { state, customer, merchant, stats } = useClient();
  const { setClientMerchant } = useSessionActions();
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<Redemption | null>(null);
  const requestId = useRef<string>('');
  const inFlight = useRef(false);

  const reward = getReward(state, rewardId);

  if (!reward) {
    return (
      <PageContainer>
        <PageHeader title="Premio no encontrado" />
        <EmptyState icon={<Gift className="size-7" />} title="Este premio ya no existe" description="Puede que el comercio lo haya quitado del catálogo." action={<ButtonLink to="/app/premios">Ver la tienda</ButtonLink>} />
      </PageContainer>
    );
  }

  const owner = getMerchant(state, reward.merchantId)!;
  const otherMerchant = owner.id !== merchant.id;
  const balance = stats.balance;
  const missing = Math.max(0, reward.cost - balance);
  const soldOut = reward.stock !== null && reward.stock <= 0;
  const available = reward.active && !soldOut;
  const canRedeem = available && missing === 0 && !otherMerchant;

  const openConfirm = () => {
    requestId.current = uid('req');
    setConfirmOpen(true);
  };

  const confirm = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setProcessing(true);
    // La clave de idempotencia evita que un doble clic genere dos canjes.
    const res = store.run((s) => redeemReward(s, { merchantId: merchant.id, customerId: customer.id, rewardId: reward.id, requestId: requestId.current }));
    inFlight.current = false;
    setProcessing(false);
    setConfirmOpen(false);
    if (res.ok) {
      setDone(res.value);
    } else {
      toast.error('No se pudo canjear', res.error);
    }
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Detalle del premio" />
      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        <div className="relative">
          <RewardImage src={reward.image} alt={reward.name} className="rounded-card shadow-card" eager />
          <FavoriteButton reward={reward} className="absolute right-3 top-3" />
          {!available && (
            <span className="absolute left-3 top-3">
              <Badge tone="danger">{soldOut ? 'Sin stock' : 'No disponible'}</Badge>
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{reward.category}</Badge>
            {available ? <Badge tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>Disponible</Badge> : null}
            {reward.stock !== null && reward.stock > 0 && <Badge tone="outline">Quedan {reward.stock}</Badge>}
          </div>
          <h2 className="mt-3 text-[1.75rem] font-extrabold leading-tight sm:text-4xl">{reward.name}</h2>
          <p className="mt-2 leading-relaxed text-ink-3">{reward.description}</p>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
            <MerchantMark merchant={owner} size="sm" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="text-muted">Lo canjeás en </span>
              <strong>{owner.name}</strong>
            </p>
            <Store className="size-4 text-subtle" aria-hidden />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-lime p-4">
              <dt className="text-xs font-semibold text-ink/75">Necesitás</dt>
              <dd className="mt-1 text-xl font-extrabold tabular min-[400px]:text-2xl">{fmtPoints(reward.cost)} pts</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <dt className="text-xs font-semibold text-muted">Tu saldo{otherMerchant ? ` en ${merchant.name}` : ''}</dt>
              <dd className="mt-1 text-xl font-extrabold tabular min-[400px]:text-2xl">{fmtPoints(balance)} pts</dd>
            </div>
          </dl>

          {otherMerchant ? (
            <div className="mt-4 rounded-2xl border-2 border-ink bg-lime-wash p-4" role="note">
              <p className="flex items-start gap-2 text-sm font-medium">
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                Este premio es de {owner.name}. Los puntos de {merchant.name} no se pueden usar en otro comercio.
              </p>
              {isMember(state, owner.id, customer.id) && (
                <Button variant="dark" size="sm" className="mt-3" onClick={() => setClientMerchant(owner.id)}>
                  Cambiar a {owner.name}
                </Button>
              )}
            </div>
          ) : missing > 0 && available ? (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-card" role="status">
              <p className="text-sm font-semibold">
                Te faltan <span className="tabular">{fmtPoints(missing)}</span> puntos para este premio
              </p>
              <ProgressBar value={balance} max={reward.cost} label="Puntos acumulados para este premio" className="mt-2" />
              <Link to="/app/sumar" className="mt-3 inline-block text-sm font-semibold underline decoration-lime decoration-[3px] underline-offset-4">
                ¿Cómo sumo más puntos?
              </Link>
            </div>
          ) : null}

          <div className="mt-6">
            <Button size="lg" full disabled={!canRedeem} onClick={openConfirm} icon={<Gift className="size-5" aria-hidden />}>
              {otherMerchant ? 'No disponible con este saldo' : !available ? 'Premio no disponible' : missing > 0 ? `Te faltan ${fmtPoints(missing)} pts` : 'Canjear premio'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !processing && setConfirmOpen(false)}
        title="Confirmá tu canje"
        description="Una vez confirmado, los puntos se descuentan y se genera tu código."
        confirmLabel={`Canjear por ${fmtPoints(reward.cost)} pts`}
        loading={processing}
        onConfirm={confirm}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <RewardImage src={reward.image} alt="" className="size-16 shrink-0 rounded-xl" ratio="" />
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{reward.name}</p>
            <p className="text-sm text-muted">{owner.name}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Saldo actual</dt>
            <dd className="font-semibold tabular">{fmtPoints(balance)} pts</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Costo del premio</dt>
            <dd className="font-semibold tabular">−{fmtPoints(reward.cost)} pts</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-semibold">Saldo después del canje</dt>
            <dd className="font-extrabold tabular">{fmtPoints(balance - reward.cost)} pts</dd>
          </div>
        </dl>
      </ConfirmDialog>

      <Modal open={!!done} onClose={() => setDone(null)} title="¡Canje realizado!" size="sm">
        {done && (
          <div className="flex flex-col items-center text-center">
            <span className="mb-3 inline-flex size-20 items-center justify-center rounded-full bg-lime animate-pop" aria-hidden>
              <PackageCheck className="size-10" />
            </span>
            <p className="text-ink-3">
              Canjeaste <strong className="text-ink">{done.rewardName}</strong>. Mostrá este código en {owner.name}.
            </p>
            <p className="mt-4 w-full rounded-2xl border-2 border-dashed border-ink bg-lime-wash px-4 py-3 font-mono text-2xl font-bold tracking-widest" aria-label={`Código de canje ${done.code}`}>
              {done.code}
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              Nuevo saldo: <PointsPill points={stats.balance} size="sm" />
            </div>
            <div className="mt-5 flex w-full flex-col gap-2">
              <Button full onClick={() => navigate('/app/canjes')} icon={<Ticket className="size-5" aria-hidden />}>
                Ver mis canjes
              </Button>
              <Button variant="secondary" full onClick={() => navigate('/app/premios')}>
                Seguir explorando
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
