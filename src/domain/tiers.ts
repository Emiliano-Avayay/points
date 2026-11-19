import type { TierId } from './types';

export interface TierDef {
  id: TierId;
  name: string;
  min: number;
  /** Límite superior inclusivo; null en el último nivel. */
  max: number | null;
}

/** Umbrales fijos basados en puntos históricos ganados en el mismo comercio. */
export const TIERS: TierDef[] = [
  { id: 'bronze', name: 'Bronce', min: 0, max: 999 },
  { id: 'silver', name: 'Plata', min: 1000, max: 4999 },
  { id: 'gold', name: 'Oro', min: 5000, max: null },
];

export function tierFor(totalEarned: number): TierDef {
  const earned = Math.max(0, Math.floor(totalEarned));
  return [...TIERS].reverse().find((t) => earned >= t.min) ?? TIERS[0];
}

export interface TierProgress {
  current: TierDef;
  next: TierDef | null;
  /** 0..1 dentro del nivel actual. */
  ratio: number;
  pointsToNext: number;
}

export function tierProgress(totalEarned: number): TierProgress {
  const current = tierFor(totalEarned);
  const idx = TIERS.findIndex((t) => t.id === current.id);
  const next = TIERS[idx + 1] ?? null;
  if (!next) return { current, next: null, ratio: 1, pointsToNext: 0 };
  const span = next.min - current.min;
  const done = totalEarned - current.min;
  return { current, next, ratio: Math.min(1, Math.max(0, done / span)), pointsToNext: next.min - totalEarned };
}

export const DEFAULT_TIER_BENEFITS: Record<TierId, string[]> = {
  bronze: ['Sumás 1 punto cada $100', 'Acceso a bonificaciones semanales', 'Regalo de bienvenida'],
  silver: ['Todo lo de Bronce', '10% extra en tu cumpleaños', 'Acceso anticipado a eventos'],
  gold: ['Todo lo de Plata', 'Premios exclusivos Oro', 'Doble puntuación un día al mes', 'Atención prioritaria'],
};
