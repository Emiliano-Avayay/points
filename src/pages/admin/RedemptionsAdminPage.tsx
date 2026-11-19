import { useState } from 'react';
import { Link } from 'react-router';
import { PackageCheck, Search, Ticket, Undo2 } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/Chips';
import { RewardImage } from '@/components/ui/RewardImage';
import { useToast } from '@/components/ui/Toast';
import { getCustomer, redemptionsOf } from '@/domain/selectors';
import { setRedemptionStatus } from '@/domain/operations';
import { fmtDateTime, fmtPoints } from '@/domain/format';

type Filter = 'all' | 'pending' | 'delivered';

export function RedemptionsAdminPage() {
  const { state, merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('pending');
  const [q, setQ] = useState('');
  const all = redemptionsOf(state, merchant.id);
  const list = all.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    const name = getCustomer(state, r.customerId)?.name ?? '';
    const query = q.trim().toLowerCase();
    return !query || `${r.code} ${r.rewardName} ${name}`.toLowerCase().includes(query);
  });
  const pending = all.filter((r) => r.status === 'pending').length;

  return (
    <>
      <AdminPageHeader title="Canjes" subtitle={`${all.length} canjes en ${merchant.name} · ${pending} pendientes de entrega`} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="buscar-canje" className="sr-only">
            Buscar por código, premio o cliente
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="buscar-canje"
            type="search"
            placeholder="Código, premio o cliente"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 w-full rounded-full border border-line-strong bg-white pl-12 pr-4 text-base focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/60"
          />
        </div>
        <ChipGroup
          label="Filtrar canjes"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'Pendientes', count: pending },
            { value: 'delivered', label: 'Entregados', count: all.length - pending },
            { value: 'all', label: 'Todos', count: all.length },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState className="mt-4" icon={<Ticket className="size-7" />} title={all.length === 0 ? 'Todavía no hay canjes' : 'No hay canjes en esta vista'} description={all.length === 0 ? 'Cuando un cliente canjee un premio, aparece acá para que lo entregues.' : undefined} />
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {list.map((r) => {
            const c = getCustomer(state, r.customerId);
            return (
              <li key={r.id}>
                <Card className="flex gap-3 p-3">
                  <RewardImage src={r.rewardImage} alt="" className="size-20 shrink-0 rounded-2xl" ratio="" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold leading-snug">{r.rewardName}</h2>
                      <Badge tone={r.status === 'pending' ? 'warning' : 'success'}>{r.status === 'pending' ? 'Pendiente' : 'Entregado'}</Badge>
                    </div>
                    <p className="text-[0.8rem] text-muted">
                      {c ? (
                        <Link to={`/admin/clientes/${c.id}`} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-2">
                          {c.name}
                        </Link>
                      ) : (
                        'Cliente'
                      )}{' '}
                      · {fmtDateTime(r.createdAt)}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                      <span className="text-sm">
                        <span className="font-mono font-bold tracking-wider">{r.code}</span> · <span className="tabular">{fmtPoints(r.cost)} pts</span>
                      </span>
                      {r.status === 'pending' ? (
                        <Button
                          size="sm"
                          icon={<PackageCheck className="size-4" aria-hidden />}
                          onClick={() => {
                            const res = store.run((s) => setRedemptionStatus(s, merchant.id, r.id, 'delivered'));
                            if (res.ok) toast.success('Canje entregado', `${r.rewardName} · ${r.code}`);
                          }}
                        >
                          Marcar entregado
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Undo2 className="size-4" aria-hidden />}
                          onClick={() => {
                            const res = store.run((s) => setRedemptionStatus(s, merchant.id, r.id, 'pending'));
                            if (res.ok) toast.info('Canje vuelto a pendiente');
                          }}
                        >
                          Deshacer
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
