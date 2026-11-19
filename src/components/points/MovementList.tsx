import { ArrowDownRight, ArrowUpRight, Gift, Percent, ShoppingBag, SlidersHorizontal, Sparkles, Trophy, UserPlus, type LucideIcon } from 'lucide-react';
import type { Movement, MovementType } from '@/domain/types';
import { MOVEMENT_LABELS } from '@/domain/selectors';
import { fmtDateTime, fmtMoney, fmtSigned } from '@/domain/format';

const ICONS: Record<MovementType, LucideIcon> = {
  purchase: ShoppingBag,
  manual_credit: ArrowUpRight,
  adjust_add: SlidersHorizontal,
  adjust_sub: ArrowDownRight,
  redeem: Gift,
  promo_bonus: Percent,
  challenge_bonus: Trophy,
  referral_bonus: UserPlus,
  event_bonus: Sparkles,
};

export function MovementRow({ m, extra }: { m: Movement; extra?: string }) {
  const Icon = ICONS[m.type];
  const positive = m.points > 0;
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${positive ? 'bg-lime text-ink' : 'bg-ink text-white'}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold leading-snug">{m.reason}</p>
        <p className="line-clamp-2 text-[0.8rem] text-muted">
          {MOVEMENT_LABELS[m.type]} · {fmtDateTime(m.createdAt)}
          {m.amount !== undefined && ` · ${fmtMoney(m.amount)}`}
          {extra && ` · ${extra}`}
        </p>
      </div>
      <span className={`shrink-0 text-right font-bold tabular ${positive ? 'text-success' : 'text-ink'}`} aria-label={`${positive ? 'Suma' : 'Resta'} ${Math.abs(m.points)} puntos`}>
        {fmtSigned(m.points)}
      </span>
    </li>
  );
}

export function MovementList({ movements, extraFor }: { movements: Movement[]; extraFor?: (m: Movement) => string | undefined }) {
  return (
    <ul className="divide-y divide-line">
      {movements.map((m) => (
        <MovementRow key={m.id} m={m} extra={extraFor?.(m)} />
      ))}
    </ul>
  );
}
