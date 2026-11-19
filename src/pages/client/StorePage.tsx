import { useMemo, useState } from 'react';
import { Search, SearchX, X } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { ChipGroup } from '@/components/ui/Chips';
import { RewardCard } from '@/components/rewards/RewardCard';
import { EmptyState, PointsPill } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { rewardCategories, rewardsOf } from '@/domain/selectors';

type Sort = 'relevance' | 'cost-asc' | 'cost-desc' | 'affordable';

const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function StorePage() {
  const { state, merchant, stats } = useClient();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<Sort>('relevance');
  const all = rewardsOf(state, merchant.id);
  const categories = rewardCategories(all);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    let items = all.filter((r) => (category === 'all' || r.category === category) && (!q || normalize(`${r.name} ${r.description} ${r.category}`).includes(q)));
    if (sort === 'affordable') items = items.filter((r) => r.cost <= stats.balance);
    if (sort === 'cost-asc') items = [...items].sort((a, b) => a.cost - b.cost);
    if (sort === 'cost-desc') items = [...items].sort((a, b) => b.cost - a.cost);
    return items;
  }, [all, category, query, sort, stats.balance]);

  return (
    <PageContainer>
      <PageHeader
        title="Tienda de premios"
        subtitle={
          <>
            Catálogo de <strong className="text-ink">{merchant.name}</strong>
          </>
        }
        action={
          <span className="mt-2 hidden md:inline">
            <PointsPill points={stats.balance} size="sm" />
          </span>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="buscar-premio" className="sr-only">
            Buscar premios
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="buscar-premio"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Buscá un premio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-full border border-line-strong bg-white pl-12 pr-12 text-base placeholder:text-subtle focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/60"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full hover:bg-surface">
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <label className="sr-only" htmlFor="orden">
          Ordenar premios
        </label>
        <select
          id="orden"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-12 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/60 md:w-56"
        >
          <option value="relevance">Destacados</option>
          <option value="affordable">Me alcanzan los puntos</option>
          <option value="cost-asc">Menor costo</option>
          <option value="cost-desc">Mayor costo</option>
        </select>
      </div>

      <ChipGroup
        label="Filtrar por categoría"
        className="mt-3"
        value={category}
        onChange={setCategory}
        options={[{ value: 'all', label: 'Todos', count: all.length }, ...categories.map((c) => ({ value: c, label: c, count: all.filter((r) => r.category === c).length }))]}
      />

      <p className="sr-only" aria-live="polite">
        {list.length} premios encontrados
      </p>

      {all.length === 0 ? (
        <EmptyState className="mt-6" icon={<SearchX className="size-7" />} title="Todavía no hay premios" description={`${merchant.name} está armando su catálogo. ¡Volvé pronto!`} />
      ) : list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<SearchX className="size-7" />}
          title="No encontramos premios"
          description="Probá con otra búsqueda o categoría."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setSort('relevance');
              }}
            >
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.map((r) => (
            <li key={r.id} className="flex">
              <RewardCard reward={r} balance={stats.balance} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
