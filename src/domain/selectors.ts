import type { Customer, DemoState, ID, Merchant, Movement, MovementType, Promotion, Redemption, Reward, TierId } from './types';
import { tierFor } from './tiers';

/** Tipos de movimiento que cuentan como puntos ganados (y definen el nivel). */
export const EARNING_TYPES: MovementType[] = [
  'purchase',
  'manual_credit',
  'adjust_add',
  'promo_bonus',
  'challenge_bonus',
  'referral_bonus',
  'event_bonus',
];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  purchase: 'Compra',
  manual_credit: 'Acreditación',
  adjust_add: 'Ajuste a favor',
  adjust_sub: 'Ajuste en contra',
  redeem: 'Canje',
  promo_bonus: 'Bonificación',
  challenge_bonus: 'Desafío',
  referral_bonus: 'Referido',
  event_bonus: 'Participación',
};

export interface CustomerStats {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  totalAdjustedDown: number;
  tier: TierId;
  lastActivityAt: string | null;
  movementsCount: number;
}

export function movementsFor(state: DemoState, merchantId: ID, customerId: ID): Movement[] {
  return state.movements
    .filter((m) => m.merchantId === merchantId && m.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** El saldo SIEMPRE se deriva de los movimientos: no hay saldos duplicados. */
export function statsFromMovements(movs: Movement[]): CustomerStats {
  let balance = 0;
  let earned = 0;
  let redeemed = 0;
  let adjustedDown = 0;
  let last: string | null = null;
  for (const m of movs) {
    balance += m.points;
    if (EARNING_TYPES.includes(m.type) && m.points > 0) earned += m.points;
    if (m.type === 'redeem') redeemed += -m.points;
    if (m.type === 'adjust_sub') adjustedDown += -m.points;
    if (!last || m.createdAt > last) last = m.createdAt;
  }
  return {
    balance,
    totalEarned: earned,
    totalRedeemed: redeemed,
    totalAdjustedDown: adjustedDown,
    tier: tierFor(earned).id,
    lastActivityAt: last,
    movementsCount: movs.length,
  };
}

export function customerStats(state: DemoState, merchantId: ID, customerId: ID): CustomerStats {
  return statsFromMovements(movementsFor(state, merchantId, customerId));
}

export function balanceOf(state: DemoState, merchantId: ID, customerId: ID): number {
  let b = 0;
  for (const m of state.movements) if (m.merchantId === merchantId && m.customerId === customerId) b += m.points;
  return b;
}

export function getMerchant(state: DemoState, id: ID): Merchant | undefined {
  return state.merchants.find((m) => m.id === id);
}

export function getCustomer(state: DemoState, id: ID): Customer | undefined {
  return state.customers.find((c) => c.id === id);
}

export function getReward(state: DemoState, id: ID): Reward | undefined {
  return state.rewards.find((r) => r.id === id);
}

export function isMember(state: DemoState, merchantId: ID, customerId: ID): boolean {
  return state.memberships.some((m) => m.merchantId === merchantId && m.customerId === customerId);
}

export function merchantsOfCustomer(state: DemoState, customerId: ID): Merchant[] {
  const ids = new Set(state.memberships.filter((m) => m.customerId === customerId).map((m) => m.merchantId));
  return state.merchants.filter((m) => ids.has(m.id));
}

export function customersOfMerchant(state: DemoState, merchantId: ID): Customer[] {
  const ids = new Set(state.memberships.filter((m) => m.merchantId === merchantId).map((m) => m.customerId));
  return state.customers.filter((c) => ids.has(c.id));
}

export function rewardsOf(state: DemoState, merchantId: ID, opts: { includeInactive?: boolean } = {}): Reward[] {
  return state.rewards.filter((r) => r.merchantId === merchantId && (opts.includeInactive || r.active));
}

export function redemptionsOf(state: DemoState, merchantId: ID, customerId?: ID): Redemption[] {
  return state.redemptions
    .filter((r) => r.merchantId === merchantId && (!customerId || r.customerId === customerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function promotionsOf(state: DemoState, merchantId: ID): Promotion[] {
  return state.promotions.filter((p) => p.merchantId === merchantId);
}

/**
 * live: aplica en este momento · active: vigente pero fuera de día/horario ·
 * scheduled: empieza más adelante · ended: finalizada · paused: desactivada.
 */
export type PromotionStatus = 'live' | 'active' | 'scheduled' | 'ended' | 'paused';

/** ¿La promoción aplica en esta fecha y hora (sin considerar el estado de pausa)? */
export function promotionAppliesAt(p: Promotion, at: Date): boolean {
  const t = at.toISOString();
  if (t < p.startsAt || t > p.endsAt) return false;
  if (p.weekdays && !p.weekdays.includes(at.getDay())) return false;
  if (p.hours) {
    const h = at.getHours();
    if (h < p.hours[0] || h >= p.hours[1]) return false;
  }
  return true;
}

export function promotionStatus(p: Promotion, merchant: Merchant | undefined, now = new Date()): PromotionStatus {
  if (!p.active || (merchant && !merchant.promotionsEnabled)) return 'paused';
  const t = now.toISOString();
  if (t < p.startsAt) return 'scheduled';
  if (t > p.endsAt) return 'ended';
  return promotionAppliesAt(p, now) ? 'live' : 'active';
}

/** Mejor promoción aplicable ahora (una sola por compra, nunca acumulables). */
export function bestActivePromotion(state: DemoState, merchantId: ID, now = new Date()): Promotion | null {
  const merchant = getMerchant(state, merchantId);
  const active = promotionsOf(state, merchantId).filter((p) => promotionStatus(p, merchant, now) === 'live');
  if (!active.length) return null;
  return active.reduce((best, p) => (p.bonusPercent > best.bonusPercent ? p : best));
}

/* ---------------------------- Métricas admin ---------------------------- */

export interface MerchantMetrics {
  customers: number;
  activeCustomers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  redemptions: number;
  redeemingCustomers: number;
  redemptionRate: number;
  pointsOutstanding: number;
  tierDistribution: Record<TierId, number>;
}

export const ACTIVE_WINDOW_DAYS = 60;

export function merchantMetrics(state: DemoState, merchantId: ID, now = new Date()): MerchantMetrics {
  const customers = customersOfMerchant(state, merchantId);
  const movs = state.movements.filter((m) => m.merchantId === merchantId);
  const byCustomer = new Map<ID, Movement[]>();
  for (const m of movs) {
    const arr = byCustomer.get(m.customerId);
    if (arr) arr.push(m);
    else byCustomer.set(m.customerId, [m]);
  }
  const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 86_400_000).toISOString();
  const dist: Record<TierId, number> = { bronze: 0, silver: 0, gold: 0 };
  let active = 0;
  let outstanding = 0;
  for (const c of customers) {
    const s = statsFromMovements(byCustomer.get(c.id) ?? []);
    dist[s.tier] += 1;
    outstanding += s.balance;
    if (s.lastActivityAt && s.lastActivityAt >= activeSince) active += 1;
  }
  const reds = state.redemptions.filter((r) => r.merchantId === merchantId);
  const redeemingCustomers = new Set(reds.map((r) => r.customerId)).size;
  return {
    customers: customers.length,
    activeCustomers: active,
    pointsIssued: movs.filter((m) => EARNING_TYPES.includes(m.type) && m.points > 0).reduce((a, m) => a + m.points, 0),
    pointsRedeemed: movs.filter((m) => m.type === 'redeem').reduce((a, m) => a - m.points, 0),
    redemptions: reds.length,
    redeemingCustomers,
    redemptionRate: customers.length ? redeemingCustomers / customers.length : 0,
    pointsOutstanding: outstanding,
    tierDistribution: dist,
  };
}

export interface MonthlyActivity {
  key: string;
  month: Date;
  issued: number;
  redeemed: number;
  redemptions: number;
}

/** Actividad de los últimos N meses, derivada exclusivamente de los registros. */
export function monthlyActivity(state: DemoState, merchantId: ID, months = 6, now = new Date()): MonthlyActivity[] {
  const buckets: MonthlyActivity[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d, issued: 0, redeemed: 0, redemptions: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const m of state.movements) {
    if (m.merchantId !== merchantId) continue;
    const d = new Date(m.createdAt);
    const b = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!b) continue;
    if (EARNING_TYPES.includes(m.type) && m.points > 0) b.issued += m.points;
    if (m.type === 'redeem') {
      b.redeemed += -m.points;
      b.redemptions += 1;
    }
  }
  return buckets;
}

export function recentMovements(state: DemoState, merchantId: ID, limit = 8): Movement[] {
  return state.movements
    .filter((m) => m.merchantId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function isFavorite(state: DemoState, customerId: ID, rewardId: ID): boolean {
  return (state.favorites[customerId] ?? []).includes(rewardId);
}

export function rewardCategories(rewards: Reward[]): string[] {
  return Array.from(new Set(rewards.map((r) => r.category))).sort((a, b) => a.localeCompare(b, 'es'));
}
