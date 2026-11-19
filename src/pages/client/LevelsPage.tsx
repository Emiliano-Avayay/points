import { Check, Lock, Medal } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, ProgressBar } from '@/components/ui/Primitives';
import { TIERS, tierProgress } from '@/domain/tiers';
import { fmtPoints } from '@/domain/format';
import type { TierId } from '@/domain/types';

export const TIER_STYLE: Record<TierId, { bg: string; ring: string; text: string }> = {
  bronze: { bg: '#C98B5B', ring: '#F3DCC8', text: '#5A3519' },
  silver: { bg: '#A7ADB7', ring: '#E6E8EC', text: '#3B4049' },
  gold: { bg: '#E3B92B', ring: '#F8EAB8', text: '#5B4500' },
};

export function TierMedal({ tier, className = 'size-14' }: { tier: TierId; className?: string }) {
  const s = TIER_STYLE[tier];
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`} style={{ backgroundColor: s.ring }}>
      <span className="inline-flex size-[72%] items-center justify-center rounded-full" style={{ backgroundColor: s.bg }}>
        <Medal className="size-1/2 text-white" strokeWidth={2.4} />
      </span>
    </span>
  );
}

export function LevelsPage() {
  const { merchant, stats } = useClient();
  const tp = tierProgress(stats.totalEarned);
  const currentIdx = TIERS.findIndex((t) => t.id === tp.current.id);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Niveles" subtitle={`Tu progreso en ${merchant.name}`} />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <TierMedal tier={tp.current.id} className="size-16" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Tu nivel actual</p>
            <p className="text-2xl font-extrabold">{tp.current.name}</p>
            <p className="text-sm text-ink-3">{fmtPoints(stats.totalEarned)} puntos ganados históricamente</p>
          </div>
        </div>
        {tp.next ? (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold">{tp.current.name}</span>
              <span className="text-muted">
                {fmtPoints(tp.pointsToNext)} pts para <strong className="text-ink">{tp.next.name}</strong>
              </span>
            </div>
            <ProgressBar value={tp.ratio} label={`Progreso hacia ${tp.next.name}`} />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-lime p-3 text-sm font-semibold">¡Llegaste al nivel máximo! Disfrutá todos los beneficios.</p>
        )}
        <p className="mt-4 text-xs text-muted">El nivel se calcula con los puntos ganados en este comercio. Canjear puntos no te baja de nivel.</p>
      </Card>

      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {TIERS.map((t, i) => {
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <li key={t.id}>
              <Card className={`flex h-full flex-col p-5 ${isCurrent ? 'ring-[3px] ring-ink' : ''}`}>
                <div className="flex items-center justify-between">
                  <TierMedal tier={t.id} className="size-12" />
                  {isCurrent ? <Badge tone="lime">Tu nivel</Badge> : reached ? <Badge tone="success">Alcanzado</Badge> : <Badge tone="neutral" icon={<Lock className="size-3" aria-hidden />}>Bloqueado</Badge>}
                </div>
                <h2 className="mt-3 text-xl font-extrabold">{t.name}</h2>
                <p className="text-sm text-muted">{t.max === null ? `${fmtPoints(t.min)} pts o más` : `${fmtPoints(t.min)} a ${fmtPoints(t.max)} pts`}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {merchant.tierBenefits[t.id].map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className={`mt-0.5 size-4 shrink-0 ${reached ? 'text-success' : 'text-subtle'}`} aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>
    </PageContainer>
  );
}
