import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Mail, MapPin, Phone, PlusCircle, SlidersHorizontal, Smartphone, UserX } from 'lucide-react';
import { useAdmin, useSessionActions } from '@/state/hooks';
import { Avatar, Badge, Card, EmptyState, StatTile } from '@/components/ui/Primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { MovementList } from '@/components/points/MovementList';
import { RewardImage } from '@/components/ui/RewardImage';
import { TierMedal } from '@/pages/client/LevelsPage';
import { customerStats, getCustomer, isMember, movementsFor, redemptionsOf } from '@/domain/selectors';
import { tierProgress } from '@/domain/tiers';
import { fmtDate, fmtPoints } from '@/domain/format';

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const { state, merchant } = useAdmin();
  const { viewAsCustomer } = useSessionActions();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(10);
  const customer = getCustomer(state, customerId);

  if (!customer || !isMember(state, merchant.id, customer.id)) {
    return (
      <EmptyState
        icon={<UserX className="size-7" />}
        title="Cliente no encontrado en este comercio"
        description="Los datos de cada comercio son independientes."
        action={<ButtonLink to="/admin/clientes">Volver a clientes</ButtonLink>}
      />
    );
  }
  const s = customerStats(state, merchant.id, customer.id);
  const tp = tierProgress(s.totalEarned);
  const movs = movementsFor(state, merchant.id, customer.id);
  const reds = redemptionsOf(state, merchant.id, customer.id);

  return (
    <>
      <Link to="/admin/clientes" className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-full pr-3 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Clientes
      </Link>
      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar name={customer.name} className="size-16 text-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold">{customer.name}</h1>
              <p className="font-mono text-xs text-muted">{customer.id}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral" icon={<TierMedal tier={tp.current.id} className="size-3.5" />}>
                  {tp.current.name}
                </Badge>
                <Badge tone="outline">Cliente desde {fmtDate(customer.createdAt)}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/admin/acreditar?cliente=${customer.id}`} icon={<PlusCircle className="size-5" aria-hidden />}>
              Acreditar
            </ButtonLink>
            <ButtonLink to={`/admin/acreditar?cliente=${customer.id}&modo=ajuste`} variant="secondary" icon={<SlidersHorizontal className="size-5" aria-hidden />}>
              Ajustar
            </ButtonLink>
            <Button
              variant="dark"
              icon={<Smartphone className="size-5" aria-hidden />}
              onClick={() => {
                viewAsCustomer(customer.id, merchant.id);
                navigate('/app');
              }}
            >
              Ver como cliente
            </Button>
          </div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-2 truncate rounded-2xl bg-surface px-3 py-2.5">
            <Mail className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{customer.email}</span>
          </li>
          <li className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
            <Phone className="size-4 shrink-0 text-muted" aria-hidden /> {customer.phone}
          </li>
          <li className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
            <MapPin className="size-4 shrink-0 text-muted" aria-hidden /> {customer.city}
          </li>
        </ul>
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile tone="lime" label="Saldo disponible" value={`${fmtPoints(s.balance)} pts`} />
        <StatTile label="Ganados históricamente" value={fmtPoints(s.totalEarned)} hint={tp.next ? `${fmtPoints(tp.pointsToNext)} para ${tp.next.name}` : 'Nivel máximo'} />
        <StatTile label="Usados en canjes" value={fmtPoints(s.totalRedeemed)} hint={`${reds.length} canjes`} />
        <StatTile label="Ajustes en contra" value={fmtPoints(s.totalAdjustedDown)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Movimientos en {merchant.name}</h2>
          {movs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Sin movimientos todavía.</p>
          ) : (
            <>
              <MovementList movements={movs.slice(0, limit)} />
              {movs.length > limit && (
                <Button variant="secondary" full size="sm" onClick={() => setLimit((l) => l + 10)}>
                  Ver más
                </Button>
              )}
            </>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold">Canjes</h2>
          {reds.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Este cliente todavía no canjeó premios.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {reds.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <RewardImage src={r.rewardImage} alt="" className="size-12 shrink-0 rounded-xl" ratio="" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.rewardName}</p>
                    <p className="text-xs text-muted">
                      {fmtDate(r.createdAt)} · <span className="font-mono">{r.code}</span>
                    </p>
                  </div>
                  <Badge tone={r.status === 'pending' ? 'warning' : 'success'}>{r.status === 'pending' ? 'Pendiente' : 'Entregado'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
