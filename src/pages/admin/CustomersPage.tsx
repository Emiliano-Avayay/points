import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, PlusCircle, Search, Users } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/Chips';
import { TierMedal } from '@/pages/client/LevelsPage';
import { ACTIVE_WINDOW_DAYS, customerStats, customersOfMerchant } from '@/domain/selectors';
import { TIERS } from '@/domain/tiers';
import { fmtPoints, relativeDays } from '@/domain/format';
import type { TierId } from '@/domain/types';

type TierFilter = 'all' | TierId | 'inactive';
type Sort = 'name' | 'balance' | 'recent';

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CustomersPage() {
  const { state, merchant } = useAdmin();
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const rows = useMemo(() => {
    const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000).toISOString();
    return customersOfMerchant(state, merchant.id).map((c) => {
      const s = customerStats(state, merchant.id, c.id);
      return { c, s, inactive: !s.lastActivityAt || s.lastActivityAt < since };
    });
  }, [state, merchant.id]);

  const filtered = rows
    .filter(({ c, s, inactive }) => {
      if (tier === 'inactive' && !inactive) return false;
      if (tier !== 'all' && tier !== 'inactive' && s.tier !== tier) return false;
      const query = norm(q.trim());
      return !query || norm(`${c.name} ${c.id} ${c.email}`).includes(query);
    })
    .sort((a, b) =>
      sort === 'name' ? a.c.name.localeCompare(b.c.name, 'es') : sort === 'balance' ? b.s.balance - a.s.balance : (b.s.lastActivityAt ?? '').localeCompare(a.s.lastActivityAt ?? ''),
    );

  return (
    <>
      <AdminPageHeader
        title="Clientes"
        subtitle={`${rows.length} clientes adheridos a ${merchant.name}`}
        actions={
          <ButtonLink to="/admin/acreditar" icon={<PlusCircle className="size-5" aria-hidden />}>
            Acreditar puntos
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="buscar-cliente" className="sr-only">
            Buscar cliente
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="buscar-cliente"
            type="search"
            placeholder="Buscá por nombre, ID o email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 w-full rounded-full border border-line-strong bg-white pl-12 pr-4 text-base focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/60"
          />
        </div>
        <label htmlFor="orden-clientes" className="sr-only">
          Ordenar clientes
        </label>
        <select
          id="orden-clientes"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-12 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/60 md:w-52"
        >
          <option value="recent">Actividad reciente</option>
          <option value="balance">Mayor saldo</option>
          <option value="name">Nombre (A–Z)</option>
        </select>
      </div>
      <ChipGroup
        label="Filtrar por nivel"
        className="mt-3"
        value={tier}
        onChange={setTier}
        options={[
          { value: 'all', label: 'Todos', count: rows.length },
          ...TIERS.map((t) => ({ value: t.id, label: t.name, count: rows.filter((r) => r.s.tier === t.id).length })),
          { value: 'inactive', label: 'Inactivos', count: rows.filter((r) => r.inactive).length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState className="mt-6" icon={<Users className="size-7" />} title="Todavía no hay clientes" description="Los clientes aparecen acá cuando se suman al programa de este comercio." />
      ) : filtered.length === 0 ? (
        <EmptyState className="mt-6" icon={<Search className="size-7" />} title="Sin resultados" description="Probá con otra búsqueda o filtro." />
      ) : (
        <>
          {/* Tarjetas (móvil) */}
          <ul className="mt-4 flex flex-col gap-2 md:hidden">
            {filtered.map(({ c, s, inactive }) => (
              <li key={c.id}>
                <Card className="flex items-center gap-3 p-3">
                  <Link to={`/admin/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
                    <Avatar name={c.name} tone="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="flex items-center gap-1.5 text-[0.8rem] text-muted">
                        <TierMedal tier={s.tier} className="size-4" />
                        {TIERS.find((t) => t.id === s.tier)?.name} · {s.lastActivityAt ? relativeDays(s.lastActivityAt) : 'Sin actividad'}
                        {inactive && <Badge tone="warning" className="!px-1.5 !py-0">Inactivo</Badge>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold tabular">{fmtPoints(s.balance)}</span>
                      <span className="block text-[0.7rem] text-muted">pts</span>
                    </span>
                  </Link>
                  <Link to={`/admin/acreditar?cliente=${c.id}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-lime" aria-label={`Acreditar puntos a ${c.name}`}>
                    <PlusCircle className="size-5" aria-hidden />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          {/* Tabla (tablet/escritorio) */}
          <Card className="mt-4 hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Clientes de {merchant.name}</caption>
              <thead className="bg-surface text-left text-[0.8rem] text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ID</th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold xl:table-cell">Comercio</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Saldo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Nivel</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Última actividad</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(({ c, s, inactive }) => (
                  <tr key={c.id} className="hover:bg-canvas">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} tone="soft" className="size-9 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="truncate text-xs text-muted">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-3">{c.id}</td>
                    <td className="hidden px-4 py-3 xl:table-cell">{merchant.name}</td>
                    <td className="px-4 py-3 text-right font-bold tabular">{fmtPoints(s.balance)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <TierMedal tier={s.tier} className="size-5" />
                        {TIERS.find((t) => t.id === s.tier)?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.lastActivityAt ? relativeDays(s.lastActivityAt) : '—'} {inactive && <Badge tone="warning">Inactivo</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/admin/acreditar?cliente=${c.id}`} className="inline-flex h-9 items-center gap-1 rounded-full bg-lime px-3 text-xs font-semibold" aria-label={`Acreditar puntos a ${c.name}`}>
                          <PlusCircle className="size-4" aria-hidden /> Acreditar
                        </Link>
                        <Link to={`/admin/clientes/${c.id}`} className="inline-flex h-9 items-center gap-0.5 rounded-full border border-line-strong px-3 text-xs font-semibold hover:bg-surface" aria-label={`Ver detalle de ${c.name}`}>
                          Detalle <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
