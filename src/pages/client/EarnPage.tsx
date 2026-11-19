import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays, ChevronRight, ClipboardList, Percent, Trophy, UserPlus, type LucideIcon } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Primitives';
import { TextField } from '@/components/ui/Field';
import { SummaSymbol } from '@/components/brand/Logo';
import { bestActivePromotion } from '@/domain/selectors';
import { parseAmountInput, pointsForPurchase, promoBonus } from '@/domain/points';
import { fmtMoney, fmtPoints } from '@/domain/format';

/** Código QR decorativo y determinístico (no es un QR escaneable real). */
function PseudoQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const out: boolean[] = [];
    for (let i = 0; i < 21 * 21; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      out.push((h >>> 0) % 3 === 0);
    }
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="var(--color-ink)" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="var(--color-ink)" />
    </g>
  );
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  return (
    <svg viewBox="-1 -1 23 23" className="size-full" role="img" aria-label="Código de cliente para mostrar en caja (demostrativo)">
      <rect x="-1" y="-1" width="23" height="23" fill="#fff" />
      {cells.map((on, i) => {
        const x = i % 21;
        const y = Math.floor(i / 21);
        return on && !inFinder(x, y) ? <rect key={i} x={x} y={y} width="1" height="1" fill="var(--color-ink)" /> : null;
      })}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}

const WAYS: { to: string; title: string; text: string; icon: LucideIcon }[] = [
  { to: '/app/bonificaciones', title: 'Bonificaciones', text: 'Comprá en días y horarios con puntos extra.', icon: Percent },
  { to: '/app/desafios', title: 'Desafíos', text: 'Cumplí retos y cobrá recompensas.', icon: Trophy },
  { to: '/app/invitar', title: 'Invitá amigos', text: 'Ganá 100 puntos por cada amigo.', icon: UserPlus },
  { to: '/app/eventos', title: 'Eventos y encuestas', text: 'Participá y sumá puntos.', icon: CalendarDays },
];

export function EarnPage() {
  const { state, customer, merchant } = useClient();
  const [raw, setRaw] = useState('15000');
  const amount = parseAmountInput(raw);
  const base = amount === null ? null : pointsForPurchase(amount, merchant.pesosPerPoint);
  const promo = bestActivePromotion(state, merchant.id);
  const bonus = base && promo ? promoBonus(base, promo.bonusPercent) : 0;

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Sumá puntos" subtitle={`En ${merchant.name} sumás 1 punto cada ${fmtMoney(merchant.pesosPerPoint)}`} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-card bg-ink p-5 text-white on-dark">
          <svg className="absolute -right-16 -top-16 size-56" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="50" fill="var(--color-lime)" opacity=".18" />
          </svg>
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-lg font-extrabold">
              <SummaSymbol className="size-7" /> SUMMA
            </span>
            <span className="text-xs text-white/65">Tarjeta de cliente</span>
          </div>
          <div className="relative mt-5 flex items-center gap-4">
            <div className="size-32 shrink-0 rounded-2xl bg-white p-2">
              <PseudoQr seed={`${customer.id}-${merchant.id}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{customer.name}</p>
              <p className="text-sm text-white/70">{merchant.name}</p>
              <p className="mt-2 font-mono text-sm tracking-wider text-lime">{customer.id.toUpperCase()}</p>
            </div>
          </div>
          <p className="relative mt-4 text-sm text-white/75">Mostrá este código al pagar para que el comercio te acredite los puntos.</p>
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Calculá tus puntos</h2>
          <p className="mb-4 text-sm text-muted">Estimación según la tasa del comercio.</p>
          <TextField
            label="Monto de tu compra"
            inputMode="decimal"
            prefix="$"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            error={amount === null && raw.trim() ? 'Ingresá un monto válido' : null}
          />
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Puntos por la compra</dt>
              <dd className="font-semibold tabular">{base === null ? '—' : fmtPoints(base)}</dd>
            </div>
            {promo && (
              <div className="flex justify-between">
                <dt className="text-muted">
                  {promo.name} (+{promo.bonusPercent}%)
                </dt>
                <dd className="font-semibold tabular text-success">+{fmtPoints(bonus)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between rounded-2xl bg-lime px-4 py-3 text-base">
              <dt className="font-semibold">Sumarías</dt>
              <dd className="text-xl font-extrabold tabular">{base === null ? '—' : `${fmtPoints(base + bonus)} pts`}</dd>
            </div>
          </dl>
          {amount !== null && (
            <p className="mt-2 text-xs text-muted">
              {fmtMoney(amount)} ÷ {fmtMoney(merchant.pesosPerPoint)} = {fmtPoints(base ?? 0)} puntos (sin fracciones).
            </p>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-7 text-lg font-bold">Más formas de sumar</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {WAYS.map(({ to, title, text, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card hover:shadow-float">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-lime" aria-hidden>
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
              <ChevronRight className="size-5 text-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ClipboardList className="size-3.5" aria-hidden /> Los puntos los acredita el comercio desde su panel.
      </p>
    </PageContainer>
  );
}
