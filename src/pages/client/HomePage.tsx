import { useState, type ComponentType } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Repeat, Zap } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { ArrowDot, ProgressBar } from '@/components/ui/Primitives';
import { CalendarIllustration, GiftBoxArt, GiftIllustration, HandStarIllustration, TrophyIllustration } from '@/components/illustrations/HomeIllustrations';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { MerchantSwitcher } from '@/components/layout/MerchantSwitcher';
import { RewardCard } from '@/components/rewards/RewardCard';
import { bestActivePromotion, rewardsOf } from '@/domain/selectors';
import { tierProgress } from '@/domain/tiers';
import { fmtPoints } from '@/domain/format';

interface Tile {
  to: string;
  title: string;
  text: string;
  Art: ComponentType<{ className?: string }>;
}

const TILES: Tile[] = [
  { to: '/app/premios', title: 'Canjeá tus premios', text: 'Usá tus puntos por productos increíbles.', Art: GiftIllustration },
  { to: '/app/sumar', title: 'Sumá puntos', text: 'Comprá, participá y acumulá más.', Art: HandStarIllustration },
  { to: '/app/desafios', title: 'Desafíos Summa', text: 'Cumplí desafíos y ganá puntos extra.', Art: TrophyIllustration },
  { to: '/app/eventos', title: 'Eventos', text: 'Accedé a promociones exclusivas.', Art: CalendarIllustration },
];

/** Fondos lima en diagonal, como en la referencia. */
function Swooshes() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[760px] w-full" viewBox="0 0 400 760" preserveAspectRatio="none" aria-hidden>
      <path d="M0 0 H150 C110 30 70 70 0 120 Z" fill="var(--color-lime)" />
      <path d="M400 210 C330 290 250 330 170 420 C120 476 60 520 0 560 V640 C90 590 160 540 230 470 C300 400 350 360 400 330 Z" fill="var(--color-lime)" opacity=".9" />
      <path d="M400 360 C340 420 300 470 250 530 L400 470 Z" fill="var(--color-lime-soft)" />
    </svg>
  );
}

export function HomePage() {
  const { state, customer, merchant, stats } = useClient();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const promo = bestActivePromotion(state, merchant.id);
  const featured = rewardsOf(state, merchant.id)
    .slice()
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 4);
  const tp = tierProgress(stats.totalEarned);
  const firstName = customer.name.split(' ')[0];

  return (
    <div className="relative isolate overflow-hidden">
      <Swooshes />
      <div className="relative mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        {/* Comercio activo */}
        <div className="mb-4 flex items-center justify-between gap-3 animate-fade-up">
          <div className="min-w-0">
            <p className="text-sm text-ink-3">Hola, {firstName}</p>
            <h1 className="sr-only">Inicio de SUMMA</h1>
          </div>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 text-left shadow-card hover:bg-surface"
            aria-label={`Comercio activo: ${merchant.name}. Cambiar de comercio`}
          >
            <MerchantMark merchant={merchant} size="sm" className="!rounded-full" />
            <span className="truncate text-sm font-semibold">{merchant.name}</span>
            <Repeat className="size-4 shrink-0 text-ink-3" aria-hidden />
          </button>
        </div>

        {/* Grilla principal */}
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {TILES.map(({ to, title, text, Art }, i) => (
            <li key={to} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <Link
                to={to}
                className="group flex h-full flex-col rounded-card bg-white p-3.5 pt-4 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-float min-[400px]:p-4"
              >
                <Art className="mx-auto mb-2 h-[5.5rem] w-full min-[400px]:h-24 sm:h-28" />
                <h2 className="text-[1.05rem] font-bold leading-[1.15] min-[400px]:text-[1.2rem]">{title}</h2>
                <div className="mt-1.5 flex flex-1 items-end justify-between gap-1.5">
                  <p className="text-[0.75rem] leading-snug text-ink-3 min-[400px]:text-[0.8rem]">{text}</p>
                  <ArrowDot size="sm" className="min-[400px]:size-9" />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Banner */}
        <Link
          to="/app/premios"
          className="group relative mt-3 flex min-h-36 items-center overflow-hidden rounded-card bg-white shadow-card animate-fade-up sm:mt-4 sm:min-h-44"
          style={{ animationDelay: '200ms' }}
        >
          <svg className="absolute inset-y-0 left-0 h-full w-[58%]" viewBox="0 0 200 160" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0 H150 C120 60 110 110 80 160 H0 Z" fill="var(--color-lime)" />
          </svg>
          <GiftBoxArt className="relative -ml-2 w-[46%] max-w-64 shrink-0 drop-shadow-xl sm:ml-2" />
          <div className="relative min-w-0 flex-1 py-4 pr-3 sm:pr-5">
            <p className="text-[1.25rem] font-extrabold leading-none min-[400px]:text-2xl sm:text-3xl">Tu fidelidad</p>
            <p className="mt-1.5 inline-block -rotate-2 whitespace-nowrap rounded-full bg-lime px-2.5 py-1 text-[0.92rem] font-extrabold leading-none min-[400px]:text-lg sm:text-2xl">
              tiene recompensa
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <p className="text-[0.75rem] text-ink-3 min-[400px]:text-sm">Canjeá, acumulá y disfrutá.</p>
              <ArrowDot size="sm" className="min-[400px]:size-9" />
            </div>
          </div>
        </Link>

        {/* Promoción en curso */}
        {promo && (
          <Link
            to="/app/bonificaciones"
            className="mt-4 flex items-center gap-3 rounded-card bg-ink p-4 text-white shadow-card on-dark animate-fade-up"
          >
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-ink" aria-hidden>
              <Zap className="size-5 fill-ink" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-lime">Bonificación activa</span>
              <span className="block truncate font-semibold">{promo.name}</span>
              <span className="block text-sm text-white/75">+{promo.bonusPercent}% de puntos en cada compra</span>
            </span>
            <ChevronRight className="size-5 text-white/70" aria-hidden />
          </Link>
        )}

        {/* Nivel */}
        <Link to="/app/niveles" className="mt-4 block rounded-card bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">Tu nivel en {merchant.name}</p>
              <p className="text-lg font-bold">{tp.current.name}</p>
            </div>
            <span className="shrink-0 text-right text-[0.8rem] leading-snug text-ink-3">
              {tp.next ? (
                <>
                  <strong className="block text-base text-ink tabular">{fmtPoints(tp.pointsToNext)} pts</strong>
                  para {tp.next.name}
                </>
              ) : (
                'Nivel máximo'
              )}
            </span>
          </div>
          <ProgressBar value={tp.ratio} label={`Progreso al nivel ${tp.next?.name ?? tp.current.name}`} className="mt-3" />
        </Link>

        {/* Destacados */}
        {featured.length > 0 && (
          <section className="mt-7" aria-labelledby="destacados">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="destacados" className="text-lg font-bold">
                Premios destacados
              </h2>
              <Link to="/app/premios" className="rounded-full px-2 py-1 text-sm font-semibold underline decoration-lime decoration-[3px] underline-offset-4">
                Ver todos
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {featured.map((r) => (
                <li key={r.id} className="flex">
                  <RewardCard reward={r} balance={stats.balance} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <MerchantSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
