/**
 * Operaciones de negocio de SUMMA.
 * Funciones puras: reciben el estado y devuelven un nuevo estado o un error.
 * La UI nunca modifica el estado directamente: siempre pasa por acá.
 */
import type {
  Campaign,
  CampaignType,
  Challenge,
  DemoState,
  ID,
  Merchant,
  MerchantIconKey,
  Movement,
  MovementType,
  Promotion,
  Redemption,
  RedemptionStatus,
  Result,
  Reward,
  TierId,
} from './types';
import { MAX_POINTS_PER_OPERATION, REFERRAL_BONUS, isPositiveInteger, pointsForPurchase, promoBonus } from './points';
import { balanceOf, bestActivePromotion, getCustomer, getMerchant, getReward, isMember } from './selectors';
import { DEFAULT_TIER_BENEFITS } from './tiers';
import { redemptionCode, slugify, uid } from './ids';

const fail = <T>(error: string): Result<T> => ({ ok: false, error });
const ok = <T>(state: DemoState, value: T): Result<T> => ({ ok: true, state, value });
const nowIso = (now?: Date) => (now ?? new Date()).toISOString();

interface Ctx {
  now?: Date;
}

function makeMovement(
  data: Omit<Movement, 'id' | 'createdAt'> & { createdAt?: string },
  now?: Date,
): Movement {
  return { id: uid('mov'), createdAt: data.createdAt ?? nowIso(now), ...data };
}

function requireMembership(state: DemoState, merchantId: ID, customerId: ID): string | null {
  if (!getMerchant(state, merchantId)) return 'El comercio no existe.';
  if (!getCustomer(state, customerId)) return 'El cliente no existe.';
  if (!isMember(state, merchantId, customerId)) return 'El cliente no está adherido a este comercio.';
  return null;
}

function alreadyProcessed(state: DemoState, requestId?: string): boolean {
  if (!requestId) return false;
  return state.movements.some((m) => m.requestId === requestId) || state.redemptions.some((r) => r.requestId === requestId);
}

/* ------------------------------ Membresías ------------------------------ */

export function joinMerchant(state: DemoState, merchantId: ID, customerId: ID, ctx: Ctx = {}): Result<null> {
  if (!getMerchant(state, merchantId)) return fail('El comercio no existe.');
  if (!getCustomer(state, customerId)) return fail('El cliente no existe.');
  if (isMember(state, merchantId, customerId)) return ok(state, null);
  return ok({ ...state, memberships: [...state.memberships, { merchantId, customerId, joinedAt: nowIso(ctx.now) }] }, null);
}

/* ------------------------------ Acreditación ------------------------------ */

export interface PurchaseInput {
  merchantId: ID;
  customerId: ID;
  amount: number;
  reason?: string;
  requestId?: string;
  applyPromotion?: boolean;
}

export interface CreditResult {
  points: number;
  bonus: number;
  promotion: Promotion | null;
  referralRewarded: boolean;
}

/** Acredita una compra: floor(monto / tasa) + bonificación vigente (una sola vez). */
export function creditPurchase(state: DemoState, input: PurchaseInput, ctx: Ctx = {}): Result<CreditResult> {
  const err = requireMembership(state, input.merchantId, input.customerId);
  if (err) return fail(err);
  if (alreadyProcessed(state, input.requestId)) return fail('Esta operación ya fue registrada.');
  const merchant = getMerchant(state, input.merchantId)!;
  const points = pointsForPurchase(input.amount, merchant.pesosPerPoint);
  if (points === null) return fail('Ingresá un monto válido.');
  if (points === 0) return fail(`El monto no alcanza para sumar puntos (mínimo $${merchant.pesosPerPoint}).`);

  const base = makeMovement(
    {
      merchantId: input.merchantId,
      customerId: input.customerId,
      type: 'purchase',
      points,
      amount: input.amount,
      reason: input.reason?.trim() || 'Compra en el local',
      requestId: input.requestId,
    },
    ctx.now,
  );
  const movements: Movement[] = [base];
  let bonus = 0;
  const promo = input.applyPromotion === false ? null : bestActivePromotion(state, input.merchantId, ctx.now);
  if (promo) {
    bonus = promoBonus(points, promo.bonusPercent);
    if (bonus > 0) {
      movements.push(
        makeMovement(
          {
            merchantId: input.merchantId,
            customerId: input.customerId,
            type: 'promo_bonus',
            points: bonus,
            reason: promo.name,
            promotionId: promo.id,
            parentId: base.id,
          },
          ctx.now,
        ),
      );
    }
  }
  let next: DemoState = { ...state, movements: [...state.movements, ...movements] };
  const ref = rewardReferralIfFirstPoints(next, state, input.merchantId, input.customerId, ctx);
  next = ref.state;
  return ok(next, { points, bonus: promo && bonus > 0 ? bonus : 0, promotion: bonus > 0 ? promo : null, referralRewarded: ref.rewarded });
}

export interface ManualCreditInput {
  merchantId: ID;
  customerId: ID;
  points: number;
  reason: string;
  requestId?: string;
}

/** Acreditación manual de puntos enteros positivos. */
export function creditManual(state: DemoState, input: ManualCreditInput, ctx: Ctx = {}): Result<{ points: number }> {
  const err = requireMembership(state, input.merchantId, input.customerId);
  if (err) return fail(err);
  if (alreadyProcessed(state, input.requestId)) return fail('Esta operación ya fue registrada.');
  if (!isPositiveInteger(input.points)) return fail('Los puntos deben ser un número entero mayor a cero.');
  if (input.points > MAX_POINTS_PER_OPERATION) return fail('La cantidad supera el máximo permitido por operación.');
  if (!input.reason.trim()) return fail('Indicá un motivo.');
  const mov = makeMovement(
    { merchantId: input.merchantId, customerId: input.customerId, type: 'manual_credit', points: input.points, reason: input.reason.trim(), requestId: input.requestId },
    ctx.now,
  );
  let next: DemoState = { ...state, movements: [...state.movements, mov] };
  next = rewardReferralIfFirstPoints(next, state, input.merchantId, input.customerId, ctx).state;
  return ok(next, { points: input.points });
}

export interface AdjustInput {
  merchantId: ID;
  customerId: ID;
  /** Positivo suma, negativo descuenta. Nunca cero ni fraccionario. */
  delta: number;
  reason: string;
  requestId?: string;
}

/** Ajuste administrativo justificado. Nunca deja saldo negativo. */
export function adjustPoints(state: DemoState, input: AdjustInput, ctx: Ctx = {}): Result<{ balance: number }> {
  const err = requireMembership(state, input.merchantId, input.customerId);
  if (err) return fail(err);
  if (alreadyProcessed(state, input.requestId)) return fail('Esta operación ya fue registrada.');
  if (!Number.isInteger(input.delta) || input.delta === 0) return fail('El ajuste debe ser un número entero distinto de cero.');
  if (Math.abs(input.delta) > MAX_POINTS_PER_OPERATION) return fail('La cantidad supera el máximo permitido por operación.');
  if (input.reason.trim().length < 3) return fail('Justificá el ajuste con un motivo.');
  const balance = balanceOf(state, input.merchantId, input.customerId);
  if (balance + input.delta < 0) return fail(`No se puede descontar más que el saldo disponible (${balance} pts).`);
  const type: MovementType = input.delta > 0 ? 'adjust_add' : 'adjust_sub';
  const mov = makeMovement(
    { merchantId: input.merchantId, customerId: input.customerId, type, points: input.delta, reason: input.reason.trim(), requestId: input.requestId },
    ctx.now,
  );
  return ok({ ...state, movements: [...state.movements, mov] }, { balance: balance + input.delta });
}

/* -------------------------------- Canjes -------------------------------- */

export interface RedeemInput {
  merchantId: ID;
  customerId: ID;
  rewardId: ID;
  /** Clave de idempotencia: un doble clic con la misma clave no duplica el canje. */
  requestId: string;
}

export function redeemReward(state: DemoState, input: RedeemInput, ctx: Ctx = {}): Result<Redemption> {
  // 1. Comercio y adhesión
  const err = requireMembership(state, input.merchantId, input.customerId);
  if (err) return fail(err);
  // Idempotencia
  if (alreadyProcessed(state, input.requestId)) return fail('Este canje ya fue procesado.');
  // 2. Existencia y disponibilidad del premio, del mismo comercio
  const reward = getReward(state, input.rewardId);
  if (!reward || reward.merchantId !== input.merchantId) return fail('El premio no pertenece a este comercio.');
  if (!reward.active) return fail('El premio no está disponible.');
  if (reward.stock !== null && reward.stock <= 0) return fail('El premio no tiene stock.');
  // 3. Saldo suficiente
  const balance = balanceOf(state, input.merchantId, input.customerId);
  if (balance < reward.cost) return fail(`Te faltan ${reward.cost - balance} puntos para este premio.`);
  // 4-7. Registro de canje + movimiento único
  const now = nowIso(ctx.now);
  const redemption: Redemption = {
    id: uid('red'),
    merchantId: input.merchantId,
    customerId: input.customerId,
    rewardId: reward.id,
    rewardName: reward.name,
    rewardImage: reward.image,
    cost: reward.cost,
    code: redemptionCode(),
    status: 'pending',
    createdAt: now,
    requestId: input.requestId,
  };
  const mov = makeMovement(
    {
      merchantId: input.merchantId,
      customerId: input.customerId,
      type: 'redeem',
      points: -reward.cost,
      reason: reward.name,
      redemptionId: redemption.id,
      requestId: input.requestId,
      createdAt: now,
    },
    ctx.now,
  );
  const rewards = reward.stock === null ? state.rewards : state.rewards.map((r) => (r.id === reward.id ? { ...r, stock: (r.stock ?? 1) - 1 } : r));
  return ok({ ...state, rewards, redemptions: [...state.redemptions, redemption], movements: [...state.movements, mov] }, redemption);
}

export function setRedemptionStatus(state: DemoState, merchantId: ID, redemptionId: ID, status: RedemptionStatus, ctx: Ctx = {}): Result<null> {
  const red = state.redemptions.find((r) => r.id === redemptionId);
  if (!red || red.merchantId !== merchantId) return fail('El canje no pertenece a este comercio.');
  return ok(
    {
      ...state,
      redemptions: state.redemptions.map((r) =>
        r.id === redemptionId ? { ...r, status, deliveredAt: status === 'delivered' ? nowIso(ctx.now) : undefined } : r,
      ),
    },
    null,
  );
}

/* ------------------------------- Favoritos ------------------------------- */

export function toggleFavorite(state: DemoState, customerId: ID, rewardId: ID): Result<boolean> {
  if (!getReward(state, rewardId)) return fail('El premio no existe.');
  const list = state.favorites[customerId] ?? [];
  const has = list.includes(rewardId);
  const nextList = has ? list.filter((id) => id !== rewardId) : [...list, rewardId];
  return ok({ ...state, favorites: { ...state.favorites, [customerId]: nextList } }, !has);
}

/* ------------------------------- Catálogo ------------------------------- */

export interface RewardInput {
  name: string;
  description: string;
  category: string;
  cost: number;
  image: string;
  active: boolean;
  stock: number | null;
}

export function validateReward(input: RewardInput): string | null {
  if (input.name.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!input.category.trim()) return 'Elegí una categoría.';
  if (!isPositiveInteger(input.cost)) return 'El costo debe ser un número entero mayor a cero.';
  if (input.cost > MAX_POINTS_PER_OPERATION) return 'El costo es demasiado alto.';
  if (input.stock !== null && (!Number.isInteger(input.stock) || input.stock < 0)) return 'El stock debe ser un entero no negativo.';
  if (input.image && !isValidImageRef(input.image)) return 'La imagen debe ser un recurso local o una URL https válida.';
  return null;
}

export function isValidImageRef(src: string): boolean {
  if (src.startsWith('/')) return !src.startsWith('//');
  try {
    const u = new URL(src);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createReward(state: DemoState, merchantId: ID, input: RewardInput, ctx: Ctx = {}): Result<Reward> {
  if (!getMerchant(state, merchantId)) return fail('El comercio no existe.');
  const err = validateReward(input);
  if (err) return fail(err);
  const reward: Reward = {
    id: uid('rw'),
    merchantId,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    cost: input.cost,
    image: input.image.trim(),
    active: input.active,
    stock: input.stock,
    createdAt: nowIso(ctx.now),
  };
  return ok({ ...state, rewards: [...state.rewards, reward] }, reward);
}

export function updateReward(state: DemoState, merchantId: ID, rewardId: ID, input: RewardInput): Result<Reward> {
  const current = getReward(state, rewardId);
  if (!current || current.merchantId !== merchantId) return fail('El premio no pertenece a este comercio.');
  const err = validateReward(input);
  if (err) return fail(err);
  const updated: Reward = {
    ...current,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    cost: input.cost,
    image: input.image.trim(),
    active: input.active,
    stock: input.stock,
  };
  return ok({ ...state, rewards: state.rewards.map((r) => (r.id === rewardId ? updated : r)) }, updated);
}

export function setRewardActive(state: DemoState, merchantId: ID, rewardId: ID, active: boolean): Result<null> {
  const current = getReward(state, rewardId);
  if (!current || current.merchantId !== merchantId) return fail('El premio no pertenece a este comercio.');
  return ok({ ...state, rewards: state.rewards.map((r) => (r.id === rewardId ? { ...r, active } : r)) }, null);
}

/* ------------------------------- Comercios ------------------------------- */

export interface MerchantInput {
  name: string;
  category: string;
  description: string;
  icon: MerchantIconKey;
  accent: string;
  pesosPerPoint: number;
  promotionsEnabled: boolean;
}

export function validateMerchant(input: MerchantInput): string | null {
  if (input.name.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (!input.category.trim()) return 'Indicá el rubro.';
  if (!isPositiveInteger(input.pesosPerPoint) || input.pesosPerPoint > 100_000) return 'La tasa debe ser un entero entre 1 y 100.000 pesos por punto.';
  if (!/^#[0-9a-fA-F]{6}$/.test(input.accent)) return 'El color debe tener formato #RRGGBB.';
  return null;
}

export function createMerchant(state: DemoState, input: MerchantInput, ctx: Ctx = {}): Result<Merchant> {
  const err = validateMerchant(input);
  if (err) return fail(err);
  let id = `m-${slugify(input.name) || 'comercio'}`;
  if (state.merchants.some((m) => m.id === id)) id = `${id}-${uid('x').slice(2, 6)}`;
  const merchant: Merchant = {
    id,
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    icon: input.icon,
    accent: input.accent,
    pesosPerPoint: input.pesosPerPoint,
    promotionsEnabled: input.promotionsEnabled,
    tierBenefits: structuredClone(DEFAULT_TIER_BENEFITS),
    createdAt: nowIso(ctx.now),
  };
  return ok({ ...state, merchants: [...state.merchants, merchant] }, merchant);
}

export function updateMerchant(state: DemoState, merchantId: ID, input: MerchantInput): Result<Merchant> {
  const current = getMerchant(state, merchantId);
  if (!current) return fail('El comercio no existe.');
  const err = validateMerchant(input);
  if (err) return fail(err);
  const updated: Merchant = { ...current, ...input, name: input.name.trim(), category: input.category.trim(), description: input.description.trim() };
  return ok({ ...state, merchants: state.merchants.map((m) => (m.id === merchantId ? updated : m)) }, updated);
}

export function updateTierBenefits(state: DemoState, merchantId: ID, tier: TierId, benefits: string[]): Result<null> {
  const current = getMerchant(state, merchantId);
  if (!current) return fail('El comercio no existe.');
  const clean = benefits.map((b) => b.trim()).filter(Boolean);
  if (!clean.length) return fail('Cargá al menos un beneficio.');
  return ok(
    { ...state, merchants: state.merchants.map((m) => (m.id === merchantId ? { ...m, tierBenefits: { ...m.tierBenefits, [tier]: clean } } : m)) },
    null,
  );
}

/* ------------------------------ Promociones ------------------------------ */

export type PromotionInput = Omit<Promotion, 'id' | 'merchantId'>;

export function validatePromotion(input: PromotionInput): string | null {
  if (input.name.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!isPositiveInteger(input.bonusPercent) || input.bonusPercent > 300) return 'El porcentaje extra debe ser un entero entre 1 y 300.';
  if (!input.startsAt || !input.endsAt || input.endsAt < input.startsAt) return 'La fecha de fin debe ser posterior al inicio.';
  return null;
}

export function upsertPromotion(state: DemoState, merchantId: ID, input: PromotionInput, promotionId?: ID): Result<Promotion> {
  if (!getMerchant(state, merchantId)) return fail('El comercio no existe.');
  const err = validatePromotion(input);
  if (err) return fail(err);
  if (promotionId) {
    const cur = state.promotions.find((p) => p.id === promotionId);
    if (!cur || cur.merchantId !== merchantId) return fail('La promoción no pertenece a este comercio.');
    const updated = { ...cur, ...input };
    return ok({ ...state, promotions: state.promotions.map((p) => (p.id === promotionId ? updated : p)) }, updated);
  }
  const created: Promotion = { id: uid('pr'), merchantId, ...input };
  return ok({ ...state, promotions: [...state.promotions, created] }, created);
}

/* ------------------------------- Desafíos ------------------------------- */

function progressOf(state: DemoState, merchantId: ID, customerId: ID, challengeId: ID) {
  return state.challengeProgress.find((p) => p.merchantId === merchantId && p.customerId === customerId && p.challengeId === challengeId);
}

/** Simula un paso de progreso (compra/visita registrada, perfil completado). */
export function advanceChallenge(state: DemoState, merchantId: ID, customerId: ID, challengeId: ID): Result<number> {
  const err = requireMembership(state, merchantId, customerId);
  if (err) return fail(err);
  const ch = state.challenges.find((c) => c.id === challengeId);
  if (!ch || ch.merchantId !== merchantId) return fail('El desafío no pertenece a este comercio.');
  const cur = progressOf(state, merchantId, customerId, challengeId);
  if (cur?.claimedAt) return fail('Ya reclamaste este desafío.');
  const current = cur?.progress ?? 0;
  if (current >= ch.goal) return fail('El desafío ya está completo. Reclamá tu recompensa.');
  const progress = ch.kind === 'profile' ? ch.goal : current + 1;
  const list = cur
    ? state.challengeProgress.map((p) => (p === cur ? { ...p, progress } : p))
    : [...state.challengeProgress, { merchantId, customerId, challengeId, progress }];
  let next: DemoState = { ...state, challengeProgress: list };
  if (ch.kind === 'profile') {
    next = { ...next, customers: next.customers.map((c) => (c.id === customerId ? { ...c, profileCompleted: true } : c)) };
  }
  return ok(next, progress);
}

export function claimChallenge(state: DemoState, merchantId: ID, customerId: ID, challengeId: ID, ctx: Ctx = {}): Result<Challenge> {
  const err = requireMembership(state, merchantId, customerId);
  if (err) return fail(err);
  const ch = state.challenges.find((c) => c.id === challengeId);
  if (!ch || ch.merchantId !== merchantId) return fail('El desafío no pertenece a este comercio.');
  const cur = progressOf(state, merchantId, customerId, challengeId);
  if (!cur || cur.progress < ch.goal) return fail('Todavía no completaste el desafío.');
  if (cur.claimedAt) return fail('Ya reclamaste este desafío.');
  const at = nowIso(ctx.now);
  const mov = makeMovement({ merchantId, customerId, type: 'challenge_bonus', points: ch.rewardPoints, reason: `Desafío: ${ch.title}` }, ctx.now);
  return ok(
    {
      ...state,
      movements: [...state.movements, mov],
      challengeProgress: state.challengeProgress.map((p) => (p === cur ? { ...p, claimedAt: at } : p)),
    },
    ch,
  );
}

/* ------------------------------- Referidos ------------------------------- */

export function inviteFriend(state: DemoState, merchantId: ID, inviterId: ID, inviteeName: string, ctx: Ctx = {}): Result<null> {
  const err = requireMembership(state, merchantId, inviterId);
  if (err) return fail(err);
  const name = inviteeName.trim();
  if (name.length < 2) return fail('Ingresá el nombre de tu amigo o amiga.');
  const pending = state.referrals.filter((r) => r.merchantId === merchantId && r.inviterId === inviterId && r.status === 'invited');
  if (pending.length >= 10) return fail('Tenés demasiadas invitaciones pendientes.');
  return ok(
    { ...state, referrals: [...state.referrals, { id: uid('ref'), merchantId, inviterId, inviteeName: name, status: 'invited', createdAt: nowIso(ctx.now) }] },
    null,
  );
}

/**
 * Simula la primera compra del invitado: lo da de alta como cliente ficticio,
 * le acredita sus primeros puntos y, por eso, el invitador recibe la recompensa una única vez.
 */
export function simulateReferralFirstPurchase(state: DemoState, referralId: ID, ctx: Ctx = {}): Result<{ bonus: number }> {
  const ref = state.referrals.find((r) => r.id === referralId);
  if (!ref) return fail('La invitación no existe.');
  if (ref.status === 'rewarded') return fail('Esta invitación ya fue recompensada.');
  const at = nowIso(ctx.now);
  const inviteeId = uid('c');
  const code = `${slugify(ref.inviteeName).replace(/-/g, '').slice(0, 5).toUpperCase() || 'AMIGO'}${Math.floor(Math.random() * 90 + 10)}`;
  let next: DemoState = {
    ...state,
    customers: [
      ...state.customers,
      { id: inviteeId, name: ref.inviteeName, email: `${slugify(ref.inviteeName) || 'amigo'}@demo.summa`, phone: '+54 9 11 0000-0000', city: 'CABA', referralCode: code, profileCompleted: false, createdAt: at },
    ],
    memberships: [...state.memberships, { merchantId: ref.merchantId, customerId: inviteeId, joinedAt: at }],
    referrals: state.referrals.map((r) => (r.id === referralId ? { ...r, inviteeId } : r)),
  };
  const purchase = creditPurchase(next, { merchantId: ref.merchantId, customerId: inviteeId, amount: 4500, reason: 'Primera compra (simulada)', applyPromotion: false }, ctx);
  if (!purchase.ok) return fail(purchase.error);
  next = purchase.state;
  const rewarded = next.referrals.find((r) => r.id === referralId);
  if (rewarded?.status !== 'rewarded') return fail('No se pudo aplicar la recompensa del referido.');
  return ok(next, { bonus: REFERRAL_BONUS });
}

/** Si el cliente recibe sus primeros puntos y fue invitado, recompensa al invitador una sola vez. */
function rewardReferralIfFirstPoints(next: DemoState, prev: DemoState, merchantId: ID, customerId: ID, ctx: Ctx): { state: DemoState; rewarded: boolean } {
  const hadPoints = prev.movements.some((m) => m.merchantId === merchantId && m.customerId === customerId && m.points > 0);
  if (hadPoints) return { state: next, rewarded: false };
  const ref = next.referrals.find((r) => r.merchantId === merchantId && r.inviteeId === customerId && r.status === 'invited');
  if (!ref) return { state: next, rewarded: false };
  const mov = makeMovement(
    { merchantId, customerId: ref.inviterId, type: 'referral_bonus', points: REFERRAL_BONUS, reason: `Invitaste a ${ref.inviteeName}` },
    ctx.now,
  );
  return {
    state: {
      ...next,
      movements: [...next.movements, mov],
      referrals: next.referrals.map((r) => (r.id === ref.id ? { ...r, status: 'rewarded', rewardedAt: nowIso(ctx.now) } : r)),
    },
    rewarded: true,
  };
}

/* ------------------------ Eventos, encuestas, sorteos ------------------------ */

export function participate(state: DemoState, merchantId: ID, customerId: ID, engagementId: ID, answer?: string, ctx: Ctx = {}): Result<{ points: number }> {
  const err = requireMembership(state, merchantId, customerId);
  if (err) return fail(err);
  const eng = state.engagements.find((e) => e.id === engagementId);
  if (!eng || eng.merchantId !== merchantId) return fail('La actividad no pertenece a este comercio.');
  if (state.participations.some((p) => p.engagementId === engagementId && p.customerId === customerId)) return fail('Ya estás participando.');
  if (eng.kind === 'survey' && !answer) return fail('Elegí una respuesta.');
  if (eng.capacity) {
    const used = state.participations.filter((p) => p.engagementId === engagementId).length;
    if (used >= eng.capacity) return fail('No quedan lugares disponibles.');
  }
  const at = nowIso(ctx.now);
  let next: DemoState = {
    ...state,
    participations: [...state.participations, { id: uid('pa'), merchantId, customerId, engagementId, answer, createdAt: at }],
  };
  if (eng.rewardPoints > 0) {
    const label = eng.kind === 'survey' ? 'Encuesta' : eng.kind === 'event' ? 'Evento' : 'Sorteo';
    next = {
      ...next,
      movements: [...next.movements, makeMovement({ merchantId, customerId, type: 'event_bonus', points: eng.rewardPoints, reason: `${label}: ${eng.title}` }, ctx.now)],
    };
  }
  return ok(next, { points: eng.rewardPoints });
}

/* ------------------------------- Campañas ------------------------------- */

export function saveCampaign(
  state: DemoState,
  merchantId: ID,
  input: { type: CampaignType; name: string; message: string; audienceSize: number },
  ctx: Ctx = {},
): Result<Campaign> {
  if (!getMerchant(state, merchantId)) return fail('El comercio no existe.');
  if (input.name.trim().length < 3) return fail('Poné un nombre a la campaña.');
  if (input.message.trim().length < 10) return fail('El mensaje es demasiado corto.');
  if (input.message.length > 700) return fail('El mensaje supera los 700 caracteres.');
  const c: Campaign = {
    id: uid('cp'),
    merchantId,
    type: input.type,
    name: input.name.trim(),
    message: input.message.trim(),
    audienceSize: input.audienceSize,
    status: 'simulated',
    createdAt: nowIso(ctx.now),
  };
  return ok({ ...state, campaigns: [...state.campaigns, c] }, c);
}

/* ------------------------------- Perfil ------------------------------- */

export function updateCustomerProfile(state: DemoState, customerId: ID, data: { name: string; email: string; phone: string; city: string }): Result<null> {
  if (!getCustomer(state, customerId)) return fail('El cliente no existe.');
  if (data.name.trim().length < 3) return fail('Ingresá tu nombre completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return fail('Ingresá un email válido.');
  return ok(
    {
      ...state,
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim(), city: data.city.trim() } : c,
      ),
    },
    null,
  );
}
