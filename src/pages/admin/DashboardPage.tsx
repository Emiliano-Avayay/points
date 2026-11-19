import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Gift, PlusCircle, Star, Ticket, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Card, EmptyState, StatTile } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { MovementRow } from '@/components/points/MovementList';
import { TierMedal } from '@/pages/client/LevelsPage';
import { ACTIVE_WINDOW_DAYS, getCustomer, merchantMetrics, monthlyActivity, recentMovements } from '@/domain/selectors';
import { TIERS } from '@/domain/tiers';
import { fmtMonth, fmtPoints } from '@/domain/format';

/** Paleta validada (scripts/validate_palette.js de la skill dataviz): oliva + lima profundo. */
export const CHART = { issued: '#4A5800', redeemed: '#8AA000', grid: '#E6E6EA', axis: '#63636B' };

interface Row {
  label: string;
  issued: number;
  redeemed: number;
  redemptions: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-2xl bg-ink px-3 py-2 text-xs text-white shadow-float">
      <p className="mb-1 font-semibold">{label}</p>
      <p className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ background: CHART.issued }} aria-hidden /> Entregados: <strong className="tabular">{fmtPoints(row.issued)}</strong>
      </p>
      <p className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ background: CHART.redeemed }} aria-hidden /> Canjeados: <strong className="tabular">{fmtPoints(row.redeemed)}</strong>
      </p>
      <p className="mt-1 text-white/70">{row.redemptions} canjes</p>
    </div>
  );
}

export function DashboardPage() {
  const { state, merchant } = useAdmin();
  const [showTable, setShowTable] = useState(false);
  const metrics = useMemo(() => merchantMetrics(state, merchant.id), [state, merchant.id]);
  const rows: Row[] = useMemo(
    () => monthlyActivity(state, merchant.id, 6).map((m) => ({ label: fmtMonth(m.month), issued: m.issued, redeemed: m.redeemed, redemptions: m.redemptions })),
    [state, merchant.id],
  );
  const recent = recentMovements(state, merchant.id, 7);
  const maxTier = Math.max(1, ...Object.values(metrics.tierDistribution));
  const hasData = metrics.customers > 0;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle={
          <>
            Resumen de <strong className="text-ink">{merchant.name}</strong> · {merchant.category}
          </>
        }
        actions={
          <>
            <ButtonLink to="/admin/acreditar" icon={<PlusCircle className="size-5" aria-hidden />}>
              Acreditar puntos
            </ButtonLink>
            <ButtonLink to="/admin/premios" variant="secondary" icon={<Gift className="size-5" aria-hidden />}>
              Premios
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Clientes registrados" value={fmtPoints(metrics.customers)} icon={<Users className="size-5 text-muted" />} />
        <StatTile label="Clientes activos" value={fmtPoints(metrics.activeCustomers)} hint={`Últimos ${ACTIVE_WINDOW_DAYS} días`} icon={<UserCheck className="size-5 text-muted" />} />
        <StatTile tone="lime" label="Puntos entregados" value={fmtPoints(metrics.pointsIssued)} icon={<Star className="size-5 fill-ink" />} />
        <StatTile label="Puntos canjeados" value={fmtPoints(metrics.pointsRedeemed)} hint={`${fmtPoints(metrics.pointsOutstanding)} en circulación`} icon={<TrendingUp className="size-5 text-muted" />} />
        <StatTile label="Canjes realizados" value={fmtPoints(metrics.redemptions)} icon={<Ticket className="size-5 text-muted" />} />
        <StatTile
          tone="dark"
          label="Tasa de clientes con canjes"
          value={`${Math.round(metrics.redemptionRate * 100)}%`}
          hint={`${metrics.redeemingCustomers} de ${metrics.customers} clientes`}
        />
      </section>

      {!hasData ? (
        <EmptyState
          className="mt-6"
          icon={<Users className="size-7" />}
          title="Este comercio todavía no tiene clientes"
          description="Cuando los clientes se sumen y acumulen puntos, vas a ver la actividad acá."
          action={<ButtonLink to="/admin/premios">Armar el catálogo de premios</ButtonLink>}
        />
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
          <Card className="p-5 xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Actividad de los últimos 6 meses</h2>
                <p className="text-sm text-muted">Puntos entregados y canjeados por mes</p>
              </div>
              <button type="button" onClick={() => setShowTable((v) => !v)} className="min-h-10 rounded-full bg-surface px-4 text-sm font-semibold hover:bg-line" aria-pressed={showTable}>
                {showTable ? 'Ver gráfico' : 'Ver tabla'}
              </button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-4 text-sm" aria-label="Leyenda">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-[4px]" style={{ background: CHART.issued }} aria-hidden /> Entregados
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-[4px]" style={{ background: CHART.redeemed }} aria-hidden /> Canjeados
              </li>
            </ul>
            {showTable ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Puntos entregados y canjeados por mes</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th className="py-2 font-medium">Mes</th>
                      <th className="py-2 text-right font-medium">Entregados</th>
                      <th className="py-2 text-right font-medium">Canjeados</th>
                      <th className="py-2 text-right font-medium">Canjes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className="border-b border-line/60">
                        <td className="py-2 font-medium">{r.label}</td>
                        <td className="py-2 text-right tabular">{fmtPoints(r.issued)}</td>
                        <td className="py-2 text-right tabular">{fmtPoints(r.redeemed)}</td>
                        <td className="py-2 text-right tabular">{r.redemptions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 h-64 w-full sm:h-72" role="img" aria-label="Gráfico de barras de puntos entregados y canjeados por mes. Usá 'Ver tabla' para leer los valores.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 12, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART.axis, fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: CHART.axis, fontSize: 12 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip cursor={{ fill: 'rgb(11 11 13 / 0.05)' }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as ReadonlyArray<{ payload?: unknown }>} label={p.label as string} />} />
                    <Bar dataKey="issued" name="Entregados" fill={CHART.issued} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="redeemed" name="Canjeados" fill={CHART.redeemed} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Clientes por nivel</h2>
            <p className="text-sm text-muted">Según puntos históricos ganados</p>
            <ul className="mt-4 flex flex-col gap-4">
              {TIERS.map((t) => {
                const n = metrics.tierDistribution[t.id];
                const pct = metrics.customers ? Math.round((n / metrics.customers) * 100) : 0;
                return (
                  <li key={t.id}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <TierMedal tier={t.id} className="size-7" />
                      <span className="flex-1 font-semibold">{t.name}</span>
                      <span className="tabular text-muted">
                        <strong className="text-ink">{n}</strong> · {pct}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-surface" aria-hidden>
                      <div className="h-full rounded-full bg-ink" style={{ width: `${(n / maxTier) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted">Bronce 0–999 · Plata 1.000–4.999 · Oro 5.000+</p>
          </Card>

          <Card className="p-5 xl:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Últimas operaciones</h2>
              <Link to="/admin/movimientos" className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold hover:bg-surface">
                Ver todas <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="mt-1 divide-y divide-line">
              {recent.map((m) => (
                <MovementRow key={m.id} m={m} extra={getCustomer(state, m.customerId)?.name} />
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
