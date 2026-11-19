import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import type { Reward } from '@/domain/types';
import { RewardImage } from '@/components/ui/RewardImage';
import { PointsPill } from '@/components/ui/Primitives';
import { useStore } from '@/state/StoreProvider';
import { toggleFavorite } from '@/domain/operations';
import { isFavorite } from '@/domain/selectors';
import { useClient } from '@/state/hooks';
import { useToast } from '@/components/ui/Toast';

export function FavoriteButton({ reward, className = '' }: { reward: Reward; className?: string }) {
  const store = useStore();
  const toast = useToast();
  const { state, customer } = useClient();
  const fav = isFavorite(state, customer.id, reward.id);
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? `Quitar ${reward.name} de favoritos` : `Agregar ${reward.name} a favoritos`}
      onClick={() => {
        const r = store.run((s) => toggleFavorite(s, customer.id, reward.id));
        if (r.ok) toast.success(r.value ? 'Agregado a favoritos' : 'Quitado de favoritos', reward.name);
      }}
      className={`inline-flex size-11 items-center justify-center rounded-full bg-white/95 shadow-card transition-transform duration-150 hover:scale-105 active:scale-95 ${className}`}
    >
      <Heart className={`size-5 transition-colors ${fav ? 'fill-ink text-ink' : 'text-ink'}`} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

export function RewardCard({ reward, balance }: { reward: Reward; balance: number }) {
  const missing = reward.cost - balance;
  const soldOut = reward.stock !== null && reward.stock <= 0;
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-card transition-shadow duration-200 hover:shadow-float">
      <Link to={`/app/premios/${reward.id}`} className="flex flex-1 flex-col rounded-[1.5rem] focus-visible:outline-offset-[-3px]">
        <RewardImage src={reward.image} alt={reward.name} className="m-2 mb-0 rounded-[1.1rem]" />
        <div className="flex flex-1 flex-col gap-1 p-3 pt-2.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{reward.category}</p>
          <h3 className="line-clamp-2 text-[0.95rem] font-bold leading-snug">{reward.name}</h3>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-2">
            <PointsPill points={reward.cost} size="sm" label={`${reward.cost} puntos`} />
            {soldOut ? (
              <span className="text-[0.7rem] font-semibold text-danger">Sin stock</span>
            ) : missing > 0 ? (
              <span className="text-[0.7rem] font-medium text-muted">Te faltan {missing.toLocaleString('es-AR')}</span>
            ) : (
              <span className="text-[0.7rem] font-semibold text-success">¡Te alcanza!</span>
            )}
          </div>
        </div>
      </Link>
      <FavoriteButton reward={reward} className="absolute right-4 top-4" />
    </article>
  );
}
