import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChartNoAxesColumnIncreasing, ChevronRight, Star } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, EmptyState, ProgressBar } from '@/components/ui/Primitives';
import { ChipGroup } from '@/components/ui/Chips';
import { Button } from '@/components/ui/Button';
import { MovementList } from '@/components/points/MovementList';
import { movementsFor } from '@/domain/selectors';
import { tierProgress } from '@/domain/tiers';
import { fmtPoints } from '@/domain/format';

type Filter = 'all' | 'in' | 'out';
const PAGE = 12;

export function PointsPage() {
  const { state, customer, merchant, stats } = useClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const movs = useMemo(() => movementsFor(state, merchant.id, customer.id), [state, merchant.id, customer.id]);
  const filtered = movs.filter((m) => (filter === 'all' ? true : filter === 'in' ? m.points > 0 : m.points < 0));
  const tp = tierProgress(stats.totalEarned);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Mis puntos" subtitle={`Saldo en ${merchant.name}`} />

      <div className="relative overflow-hidden rounded-card bg-ink p-5 text-white on-dark sm:p-7">
        <svg className="absolute -right-16 -top-20 size-44 sm:-right-10 sm:-top-14 sm:size-56" viewBox="0 0 100 100" aria-hidden>
          <circle cx="60" cy="40" r="46" fill="var(--color-lime)" />
        </svg>
        <div className="relative">
          <p className="text-sm text-white/70">Saldo disponible</p>
          <p className="mt-1 flex items-center gap-2 text-5xl font-extrabold tabular leading-none tracking-tight sm:text-6xl">
            <Star className="size-9 fill-lime text-lime" aria-hidden />
            {fmtPoints(stats.balance)}
          </p>
          <p className="mt-2 text-sm text-white/70">puntos para canjear en {merchant.name}</p>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Nivel {tp.current.name}</span>
              <span className="text-white/75">{tp.next ? `${fmtPoints(tp.pointsToNext)} pts para ${tp.next.name}` : 'Nivel máximo'}</span>
            </div>
            <ProgressBar value={tp.ratio} label="Progreso de nivel" tone="ink" className="mt-2" />
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <dt className="text-[0.8rem] text-muted">Ganados históricamente</dt>
          <dd className="mt-1 text-2xl font-bold tabular text-success">+{fmtPoints(stats.totalEarned)}</dd>
        </Card>
        <Card className="p-4">
          <dt className="text-[0.8rem] text-muted">Utilizados en canjes</dt>
          <dd className="mt-1 text-2xl font-bold tabular">{fmtPoints(stats.totalRedeemed)}</dd>
        </Card>
      </dl>
      {stats.totalAdjustedDown > 0 && <p className="mt-2 text-xs text-muted">Incluye ajustes administrativos por −{fmtPoints(stats.totalAdjustedDown)} pts.</p>}

      <Link to="/app/niveles" className="mt-3 flex items-center justify-between rounded-2xl bg-lime px-4 py-3 font-semibold">
        Ver beneficios de cada nivel <ChevronRight className="size-5" aria-hidden />
      </Link>

      <section className="mt-7" aria-labelledby="movs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 id="movs" className="text-lg font-bold">
            Movimientos
          </h2>
          <ChipGroup
            label="Filtrar movimientos"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setLimit(PAGE);
            }}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'in', label: 'Sumados' },
              { value: 'out', label: 'Usados' },
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<ChartNoAxesColumnIncreasing className="size-7" />} title="Sin movimientos" description="Cuando sumes o uses puntos, los vas a ver acá." />
        ) : (
          <Card className="px-4">
            <MovementList movements={filtered.slice(0, limit)} />
          </Card>
        )}
        {filtered.length > limit && (
          <Button variant="secondary" full className="mt-3" onClick={() => setLimit((l) => l + PAGE)}>
            Ver más movimientos
          </Button>
        )}
      </section>
    </PageContainer>
  );
}
