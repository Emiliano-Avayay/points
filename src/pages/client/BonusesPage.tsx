import { CalendarClock, Percent, Zap } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, EmptyState, type BadgeTone } from '@/components/ui/Primitives';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { promotionStatus, promotionsOf, type PromotionStatus } from '@/domain/selectors';
import { fmtDate } from '@/domain/format';

export const PROMO_STATUS: Record<PromotionStatus, { label: string; tone: BadgeTone }> = {
  live: { label: 'Activa ahora', tone: 'lime' },
  active: { label: 'Vigente', tone: 'success' },
  scheduled: { label: 'Próximamente', tone: 'warning' },
  ended: { label: 'Finalizada', tone: 'neutral' },
  paused: { label: 'Pausada', tone: 'outline' },
};

const ORDER: PromotionStatus[] = ['live', 'active', 'scheduled', 'paused', 'ended'];

export function BonusesPage() {
  const { state, merchant } = useClient();
  const promos = promotionsOf(state, merchant.id)
    .map((p) => ({ p, status: promotionStatus(p, merchant) }))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Bonificaciones" subtitle={`Puntos extra en ${merchant.name}`} />
      <p className="mb-4 rounded-2xl bg-white p-4 text-sm text-ink-3 shadow-card">
        Las bonificaciones se aplican automáticamente cuando el comercio registra tu compra. Si coinciden varias, se aplica la de mayor porcentaje: <strong className="text-ink">nunca se acumulan ni se aplican dos veces</strong>.
      </p>
      {!merchant.promotionsEnabled && (
        <p className="mb-4 rounded-2xl bg-warning-soft p-4 text-sm font-medium text-warning" role="status">
          {merchant.name} pausó temporalmente sus bonificaciones.
        </p>
      )}
      {promos.length === 0 ? (
        <EmptyState icon={<Percent className="size-7" />} title="Sin bonificaciones por ahora" description="Cuando el comercio lance una promoción, la vas a ver acá." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {promos.map(({ p, status }) => (
            <li key={p.id}>
              <Card className={`flex h-full flex-col p-5 ${status === 'ended' ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl ${status === 'live' ? 'bg-lime' : 'bg-ink text-white'}`}>
                    <span className="text-lg font-extrabold leading-none">+{p.bonusPercent}%</span>
                  </span>
                  <Badge tone={PROMO_STATUS[status].tone} icon={status === 'live' ? <Zap className="size-3 fill-ink" aria-hidden /> : undefined}>
                    {PROMO_STATUS[status].label}
                  </Badge>
                </div>
                <h2 className="mt-3 text-lg font-bold leading-snug">{p.name}</h2>
                <p className="mt-1 text-sm text-ink-3">{p.description}</p>
                <div className="mt-auto flex flex-col gap-1.5 pt-4 text-[0.8rem] text-muted">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-4" aria-hidden /> {p.schedule}
                  </span>
                  <span>
                    Del {fmtDate(p.startsAt)} al {fmtDate(p.endsAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MerchantMark merchant={merchant} size="sm" className="!size-5 !rounded-md [&_svg]:!size-3" /> {merchant.name}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
