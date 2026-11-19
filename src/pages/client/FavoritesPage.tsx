import { Heart } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { RewardCard } from '@/components/rewards/RewardCard';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { balanceOf } from '@/domain/selectors';

/** Favoritos de todos los comercios, agrupados: cada uno se canjea con su propio saldo. */
export function FavoritesPage() {
  const { state, customer, merchant } = useClient();
  const ids = state.favorites[customer.id] ?? [];
  const favs = state.rewards.filter((r) => ids.includes(r.id));
  const groups = state.merchants
    .map((m) => ({ m, items: favs.filter((r) => r.merchantId === m.id) }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => (a.m.id === merchant.id ? -1 : b.m.id === merchant.id ? 1 : 0));

  return (
    <PageContainer>
      <PageHeader title="Favoritos" subtitle="Los premios que estás mirando" />
      {groups.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-7" />}
          title="No tenés favoritos"
          description="Tocá el corazón en cualquier premio para guardarlo acá."
          action={<ButtonLink to="/app/premios">Explorar premios</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map(({ m, items }) => (
            <section key={m.id} aria-labelledby={`fav-${m.id}`}>
              <div className="mb-3 flex items-center gap-2">
                <MerchantMark merchant={m} size="sm" />
                <h2 id={`fav-${m.id}`} className="text-lg font-bold">
                  {m.name}
                </h2>
                {m.id !== merchant.id && <span className="text-xs text-muted">· otro comercio</span>}
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((r) => (
                  <li key={r.id} className="flex">
                    <RewardCard reward={r} balance={balanceOf(state, m.id, customer.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
