import { describe, expect, it } from 'vitest';
import { createSeed } from '@/data/seed';
import { LocalStorageRepository, STORAGE_KEY, isValidState } from '@/data/repository';
import { createStore } from '@/state/store';
import {
  adjustPoints,
  advanceChallenge,
  claimChallenge,
  createMerchant,
  createReward,
  creditManual,
  creditPurchase,
  inviteFriend,
  joinMerchant,
  participate,
  redeemReward,
  setRewardActive,
  simulateReferralFirstPurchase,
  toggleFavorite,
  updateReward,
} from './operations';
import {
  balanceOf,
  bestActivePromotion,
  customerStats,
  customersOfMerchant,
  merchantMetrics,
  monthlyActivity,
  promotionAppliesAt,
} from './selectors';
import { parseAmountInput, parseIntegerInput, pointsForPurchase, promoBonus } from './points';
import { tierFor, tierProgress } from './tiers';
import type { DemoState, Result } from './types';

// Fecha fija: un miércoles, fuera de la "Semana de beneficios" del seed (que es relativa a `now`).
const NOW = new Date('2026-11-18T15:00:00.000Z');
const seed = () => createSeed(NOW);
const unwrap = <T,>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error);
  return r;
};

/** Estado sin promociones vigentes, para probar cálculos exactos. */
function noPromos(): DemoState {
  const s = seed();
  return { ...s, promotions: [] };
}

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

describe('Cálculo de puntos', () => {
  it('usa floor(monto / 100) por defecto', () => {
    expect(pointsForPurchase(0)).toBe(0);
    expect(pointsForPurchase(99)).toBe(0);
    expect(pointsForPurchase(100)).toBe(1);
    expect(pointsForPurchase(15_999)).toBe(159);
    expect(pointsForPurchase(200_000)).toBe(2000);
  });
  it('respeta la tasa del comercio y rechaza montos inválidos', () => {
    expect(pointsForPurchase(10_000, 200)).toBe(50);
    expect(pointsForPurchase(-1)).toBeNull();
    expect(pointsForPurchase(Number.NaN)).toBeNull();
    expect(pointsForPurchase(1000, 0)).toBeNull();
  });
  it('calcula bonificaciones enteras', () => {
    expect(promoBonus(155, 20)).toBe(31);
    expect(promoBonus(2000, 30)).toBe(600);
    expect(promoBonus(0, 50)).toBe(0);
  });
  it('parsea entradas de formulario', () => {
    expect(parseAmountInput('12.500')).toBe(12500);
    expect(parseAmountInput('$ 1500,50')).toBe(1500.5);
    expect(parseAmountInput('-3')).toBeNull();
    expect(parseIntegerInput('1.500')).toBe(1500);
    expect(parseIntegerInput('1,5')).toBeNull();
    expect(parseIntegerInput('abc')).toBeNull();
  });
});

describe('Datos iniciales', () => {
  it('cumple los mínimos de la demo', () => {
    const s = seed();
    expect(s.merchants.length).toBeGreaterThanOrEqual(3);
    expect(s.customers.length).toBeGreaterThanOrEqual(15);
    const multi = s.customers.filter((c) => s.memberships.filter((m) => m.customerId === c.id).length > 1);
    expect(multi.length).toBeGreaterThan(0);
    expect(isValidState(s)).toBe(true);
  });
  it('Sofía tiene exactamente 580 puntos en Café Molienda y Martín saldo para varios canjes', () => {
    const s = seed();
    expect(balanceOf(s, 'm-cafe', 'c-sofia')).toBe(580);
    expect(balanceOf(s, 'm-cafe', 'c-martin')).toBeGreaterThanOrEqual(3 * 2000);
  });
  it('ningún saldo es negativo y los canjes concilian con los movimientos', () => {
    const s = seed();
    for (const m of s.memberships) {
      const st = customerStats(s, m.merchantId, m.customerId);
      expect(st.balance).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(st.balance)).toBe(true);
      // Saldo = ganado − canjeado − ajustes en contra
      expect(st.balance).toBe(st.totalEarned - st.totalRedeemed - st.totalAdjustedDown);
    }
    for (const r of s.redemptions) {
      const mov = s.movements.filter((m) => m.redemptionId === r.id);
      expect(mov).toHaveLength(1);
      expect(mov[0].points).toBe(-r.cost);
      expect(mov[0].merchantId).toBe(r.merchantId);
    }
  });
  it('cada movimiento y canje pertenece a una membresía válida', () => {
    const s = seed();
    const key = new Set(s.memberships.map((m) => `${m.merchantId}|${m.customerId}`));
    s.movements.forEach((m) => expect(key.has(`${m.merchantId}|${m.customerId}`)).toBe(true));
    s.redemptions.forEach((r) => {
      expect(key.has(`${r.merchantId}|${r.customerId}`)).toBe(true);
      expect(s.rewards.find((x) => x.id === r.rewardId)?.merchantId).toBe(r.merchantId);
    });
  });
  it('hay distribución entre niveles y actividad de varios meses', () => {
    const s = seed();
    const dist = { bronze: 0, silver: 0, gold: 0 };
    for (const m of s.merchants) {
      const d = merchantMetrics(s, m.id, NOW).tierDistribution;
      dist.bronze += d.bronze;
      dist.silver += d.silver;
      dist.gold += d.gold;
    }
    expect(dist.bronze).toBeGreaterThan(0);
    expect(dist.silver).toBeGreaterThan(0);
    expect(dist.gold).toBeGreaterThan(0);
    const months = monthlyActivity(s, 'm-cafe', 6, NOW).filter((b) => b.issued > 0);
    expect(months.length).toBeGreaterThanOrEqual(4);
    expect(s.redemptions.length).toBeGreaterThan(0);
  });
  it('las bonificaciones históricas coinciden con las promociones vigentes en esa fecha', () => {
    const s = seed();
    for (const b of s.movements.filter((m) => m.type === 'promo_bonus')) {
      const p = s.promotions.find((x) => x.id === b.promotionId)!;
      const parent = s.movements.find((m) => m.id === b.parentId)!;
      expect(promotionAppliesAt(p, new Date(parent.createdAt))).toBe(true);
      expect(b.points).toBe(promoBonus(parent.points, p.bonusPercent));
    }
  });
  it('las métricas del dashboard se derivan de los registros', () => {
    const s = seed();
    const m = merchantMetrics(s, 'm-cafe', NOW);
    const custs = customersOfMerchant(s, 'm-cafe');
    expect(m.customers).toBe(custs.length);
    expect(m.redemptions).toBe(s.redemptions.filter((r) => r.merchantId === 'm-cafe').length);
    const outstanding = custs.reduce((a, c) => a + balanceOf(s, 'm-cafe', c.id), 0);
    expect(m.pointsOutstanding).toBe(outstanding);
    expect(m.pointsIssued - m.pointsRedeemed).toBe(outstanding);
  });
});

describe('Acreditación', () => {
  it('acredita una compra y registra el movimiento', () => {
    const r = unwrap(creditPurchase(noPromos(), { merchantId: 'm-cafe', customerId: 'c-sofia', amount: 25_050 }, { now: NOW }));
    expect(r.value.points).toBe(250);
    expect(balanceOf(r.state, 'm-cafe', 'c-sofia')).toBe(830);
    const last = r.state.movements.at(-1)!;
    expect(last).toMatchObject({ merchantId: 'm-cafe', customerId: 'c-sofia', type: 'purchase', points: 250, amount: 25_050 });
    expect(last.id).toBeTruthy();
    expect(last.createdAt).toBe(NOW.toISOString());
  });
  it('aplica una sola bonificación (la mayor) por compra', () => {
    const s = seed();
    // Semana de beneficios (+30%) está vigente en el seed relativo a NOW.
    const promo = bestActivePromotion(s, 'm-cafe', NOW);
    expect(promo?.bonusPercent).toBe(30);
    const r = unwrap(creditPurchase(s, { merchantId: 'm-cafe', customerId: 'c-sofia', amount: 200_000 }, { now: NOW }));
    expect(r.value).toMatchObject({ points: 2000, bonus: 600 });
    expect(balanceOf(r.state, 'm-cafe', 'c-sofia')).toBe(3180);
    const bonuses = r.state.movements.filter((m) => m.type === 'promo_bonus' && m.parentId === r.state.movements.at(-2)!.id);
    expect(bonuses).toHaveLength(1);
  });
  it('no repite la misma operación (idempotencia)', () => {
    const s1 = unwrap(creditPurchase(noPromos(), { merchantId: 'm-cafe', customerId: 'c-sofia', amount: 1000, requestId: 'req-1' })).state;
    const again = creditPurchase(s1, { merchantId: 'm-cafe', customerId: 'c-sofia', amount: 1000, requestId: 'req-1' });
    expect(again.ok).toBe(false);
  });
  it('rechaza montos insuficientes, negativos y puntos fraccionarios', () => {
    const s = noPromos();
    expect(creditPurchase(s, { merchantId: 'm-cafe', customerId: 'c-sofia', amount: 50 }).ok).toBe(false);
    expect(creditPurchase(s, { merchantId: 'm-cafe', customerId: 'c-sofia', amount: -100 }).ok).toBe(false);
    expect(creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 1.5, reason: 'x' }).ok).toBe(false);
    expect(creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 0, reason: 'x' }).ok).toBe(false);
    expect(creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 10, reason: '  ' }).ok).toBe(false);
  });
  it('no acredita a un cliente no adherido al comercio', () => {
    expect(creditManual(seed(), { merchantId: 'm-tech', customerId: 'c-sofia', points: 100, reason: 'Regalo' }).ok).toBe(false);
  });
});

describe('Ajustes', () => {
  it('suma y descuenta con justificación', () => {
    const add = unwrap(adjustPoints(seed(), { merchantId: 'm-cafe', customerId: 'c-sofia', delta: 20, reason: 'Corrección' }));
    expect(add.value.balance).toBe(600);
    const sub = unwrap(adjustPoints(add.state, { merchantId: 'm-cafe', customerId: 'c-sofia', delta: -100, reason: 'Compra duplicada' }));
    expect(sub.value.balance).toBe(500);
    expect(sub.state.movements.at(-1)!.type).toBe('adjust_sub');
  });
  it('no permite saldo negativo, cero, fracciones ni ajustes sin motivo', () => {
    const s = seed();
    expect(adjustPoints(s, { merchantId: 'm-cafe', customerId: 'c-sofia', delta: -581, reason: 'Prueba' }).ok).toBe(false);
    expect(adjustPoints(s, { merchantId: 'm-cafe', customerId: 'c-sofia', delta: 0, reason: 'Prueba' }).ok).toBe(false);
    expect(adjustPoints(s, { merchantId: 'm-cafe', customerId: 'c-sofia', delta: 2.5, reason: 'Prueba' }).ok).toBe(false);
    expect(adjustPoints(s, { merchantId: 'm-cafe', customerId: 'c-sofia', delta: 10, reason: '' }).ok).toBe(false);
  });
  it('un ajuste a la baja no reduce el nivel histórico', () => {
    const s = unwrap(adjustPoints(seed(), { merchantId: 'm-cafe', customerId: 'c-sofia', delta: -580, reason: 'Corrección' })).state;
    const st = customerStats(s, 'm-cafe', 'c-sofia');
    expect(st.balance).toBe(0);
    expect(st.tier).toBe('silver');
  });
});

describe('Canjes', () => {
  it('rechaza un canje con saldo insuficiente e informa cuánto falta', () => {
    const r = redeemReward(seed(), { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-cafe-tarta', requestId: 'r1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('920');
  });
  it('descuenta una sola vez y crea el registro y el movimiento', () => {
    const s = unwrap(creditManual(seed(), { merchantId: 'm-cafe', customerId: 'c-sofia', points: 2600, reason: 'Demo' })).state;
    const before = s.redemptions.length;
    const r = unwrap(redeemReward(s, { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-cafe-vaso', requestId: 'req-x' }, { now: NOW }));
    expect(balanceOf(r.state, 'm-cafe', 'c-sofia')).toBe(1180);
    expect(r.state.redemptions).toHaveLength(before + 1);
    expect(r.value).toMatchObject({ status: 'pending', cost: 2000, merchantId: 'm-cafe' });
    expect(r.value.code).toMatch(/^SUM-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(r.state.movements.filter((m) => m.redemptionId === r.value.id)).toHaveLength(1);
    // stock descontado
    expect(r.state.rewards.find((x) => x.id === 'rw-cafe-vaso')!.stock).toBe(11);
  });
  it('previene el doble canje accidental con la misma clave', () => {
    const s = unwrap(creditManual(seed(), { merchantId: 'm-cafe', customerId: 'c-martin', points: 10, reason: 'Demo' })).state;
    const first = unwrap(redeemReward(s, { merchantId: 'm-cafe', customerId: 'c-martin', rewardId: 'rw-cafe-tarta', requestId: 'dbl' }));
    const second = redeemReward(first.state, { merchantId: 'm-cafe', customerId: 'c-martin', rewardId: 'rw-cafe-tarta', requestId: 'dbl' });
    expect(second.ok).toBe(false);
    expect(first.state.redemptions.filter((r) => r.requestId === 'dbl')).toHaveLength(1);
  });
  it('previene el doble clic también a nivel store (estado sincrónico)', () => {
    const store = createStore(new LocalStorageRepository(new MemoryStorage()), seed);
    store.run((s) => creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 1500, reason: 'Demo' }));
    const a = store.run((s) => redeemReward(s, { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-cafe-torta', requestId: 'click' }));
    const b = store.run((s) => redeemReward(s, { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-cafe-torta', requestId: 'click' }));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(balanceOf(store.getState(), 'm-cafe', 'c-sofia')).toBe(580);
  });
  it('no permite canjear premios inactivos ni de otro comercio', () => {
    const rich = unwrap(creditManual(seed(), { merchantId: 'm-cafe', customerId: 'c-sofia', points: 5000, reason: 'Demo' })).state;
    const off = unwrap(setRewardActive(rich, 'm-cafe', 'rw-cafe-tarta', false)).state;
    expect(redeemReward(off, { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-cafe-tarta', requestId: 'a' }).ok).toBe(false);
    expect(redeemReward(rich, { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-pets-alimento', requestId: 'b' }).ok).toBe(false);
  });
});

describe('Independencia entre comercios', () => {
  it('los puntos de un comercio no se usan ni se ven en otro', () => {
    const s = seed();
    const petsBefore = balanceOf(s, 'm-pets', 'c-sofia');
    const r = unwrap(creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 10_000, reason: 'Demo' }));
    expect(balanceOf(r.state, 'm-pets', 'c-sofia')).toBe(petsBefore);
    // Con saldo alto en el café no alcanza para un premio de mascotas si el saldo de mascotas no da.
    const pricey = r.state.rewards.find((x) => x.id === 'rw-pets-cama')!;
    if (petsBefore < pricey.cost) {
      expect(redeemReward(r.state, { merchantId: 'm-pets', customerId: 'c-sofia', rewardId: pricey.id, requestId: 'z' }).ok).toBe(false);
    }
    // Las métricas de otro comercio no cambian.
    expect(merchantMetrics(r.state, 'm-pets', NOW)).toEqual(merchantMetrics(s, 'm-pets', NOW));
  });
  it('un comercio nuevo arranca vacío y separado', () => {
    const r = unwrap(
      createMerchant(seed(), { name: 'Librería Papiro', category: 'Librería', description: '', icon: 'book', accent: '#3F5BA9', pesosPerPoint: 100, promotionsEnabled: true }),
    );
    const id = r.value.id;
    expect(id).toBe('m-libreria-papiro');
    expect(r.state.rewards.filter((x) => x.merchantId === id)).toHaveLength(0);
    expect(customersOfMerchant(r.state, id)).toHaveLength(0);
    expect(merchantMetrics(r.state, id, NOW).pointsIssued).toBe(0);
    const joined = unwrap(joinMerchant(r.state, id, 'c-sofia')).state;
    expect(balanceOf(joined, id, 'c-sofia')).toBe(0);
    expect(balanceOf(joined, 'm-cafe', 'c-sofia')).toBe(580);
  });
});

describe('Niveles', () => {
  it('respeta los umbrales Bronce / Plata / Oro', () => {
    expect(tierFor(0).id).toBe('bronze');
    expect(tierFor(999).id).toBe('bronze');
    expect(tierFor(1000).id).toBe('silver');
    expect(tierFor(4999).id).toBe('silver');
    expect(tierFor(5000).id).toBe('gold');
  });
  it('calcula el progreso al siguiente nivel', () => {
    expect(tierProgress(2080)).toMatchObject({ pointsToNext: 2920 });
    expect(tierProgress(500).ratio).toBeCloseTo(0.5005, 3);
    expect(tierProgress(8000)).toMatchObject({ next: null, ratio: 1 });
  });
  it('canjear no baja el nivel', () => {
    const s = unwrap(creditManual(seed(), { merchantId: 'm-cafe', customerId: 'c-sofia', points: 3000, reason: 'Demo' })).state;
    expect(customerStats(s, 'm-cafe', 'c-sofia').tier).toBe('gold');
    const after = unwrap(redeemReward(s, { merchantId: 'm-cafe', customerId: 'c-sofia', rewardId: 'rw-cafe-desayuno', requestId: 'n' })).state;
    expect(customerStats(after, 'm-cafe', 'c-sofia').tier).toBe('gold');
  });
});

describe('Referidos, desafíos y actividades', () => {
  it('recompensa al invitador una sola vez cuando el referido suma sus primeros puntos', () => {
    let s = unwrap(inviteFriend(seed(), 'm-cafe', 'c-sofia', 'Paula Ibarra')).state;
    const ref = s.referrals.at(-1)!;
    s = unwrap(simulateReferralFirstPurchase(s, ref.id)).state;
    expect(balanceOf(s, 'm-cafe', 'c-sofia')).toBe(680);
    expect(s.referrals.find((r) => r.id === ref.id)!.status).toBe('rewarded');
    expect(simulateReferralFirstPurchase(s, ref.id).ok).toBe(false);
    // Una segunda compra del referido no vuelve a premiar al invitador.
    const invitee = s.referrals.find((r) => r.id === ref.id)!.inviteeId!;
    s = unwrap(creditManual(s, { merchantId: 'm-cafe', customerId: invitee, points: 50, reason: 'Otra' })).state;
    expect(balanceOf(s, 'm-cafe', 'c-sofia')).toBe(680);
  });
  it('un desafío se reclama una sola vez', () => {
    let s = seed();
    s = unwrap(advanceChallenge(s, 'm-cafe', 'c-sofia', 'ch-cafe-compras')).state;
    s = unwrap(advanceChallenge(s, 'm-cafe', 'c-sofia', 'ch-cafe-compras')).state;
    expect(advanceChallenge(s, 'm-cafe', 'c-sofia', 'ch-cafe-compras').ok).toBe(false);
    s = unwrap(claimChallenge(s, 'm-cafe', 'c-sofia', 'ch-cafe-compras')).state;
    expect(balanceOf(s, 'm-cafe', 'c-sofia')).toBe(730);
    expect(claimChallenge(s, 'm-cafe', 'c-sofia', 'ch-cafe-compras').ok).toBe(false);
  });
  it('una encuesta suma puntos una sola vez', () => {
    const s = unwrap(participate(seed(), 'm-cafe', 'c-sofia', 'en-cafe-encuesta', 'Rogel')).state;
    expect(balanceOf(s, 'm-cafe', 'c-sofia')).toBe(610);
    expect(participate(s, 'm-cafe', 'c-sofia', 'en-cafe-encuesta', 'Rogel').ok).toBe(false);
  });
});

describe('Catálogo y favoritos', () => {
  it('crea, edita y valida premios', () => {
    const base = { name: 'Muffin', description: 'Arándanos', category: 'Pastelería', cost: 700, image: '/rewards/tarta.jpg', active: true, stock: null };
    const c = unwrap(createReward(seed(), 'm-cafe', base));
    const u = unwrap(updateReward(c.state, 'm-cafe', c.value.id, { ...base, cost: 750 }));
    expect(u.value.cost).toBe(750);
    expect(createReward(seed(), 'm-cafe', { ...base, cost: 0 }).ok).toBe(false);
    expect(createReward(seed(), 'm-cafe', { ...base, image: 'javascript:alert(1)' }).ok).toBe(false);
    expect(updateReward(c.state, 'm-pets', c.value.id, base).ok).toBe(false);
  });
  it('marca y desmarca favoritos', () => {
    const on = unwrap(toggleFavorite(seed(), 'c-sofia', 'rw-cafe-vaso'));
    expect(on.value).toBe(true);
    const off = unwrap(toggleFavorite(on.state, 'c-sofia', 'rw-cafe-vaso'));
    expect(off.value).toBe(false);
    expect(off.state.favorites['c-sofia']).not.toContain('rw-cafe-vaso');
  });
});

describe('Persistencia y restablecimiento', () => {
  it('persiste los cambios y los recupera al recargar', () => {
    const storage = new MemoryStorage();
    const store = createStore(new LocalStorageRepository(storage), seed);
    store.run((s) => creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 100, reason: 'Demo' }));
    const reloaded = createStore(new LocalStorageRepository(storage), seed);
    expect(balanceOf(reloaded.getState(), 'm-cafe', 'c-sofia')).toBe(680);
  });
  it('descarta datos dañados o de otra versión', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{no es json');
    expect(new LocalStorageRepository(storage).load()).toBeNull();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schema: 999, state: {} }));
    expect(new LocalStorageRepository(storage).load()).toBeNull();
    const store = createStore(new LocalStorageRepository(storage), seed);
    expect(balanceOf(store.getState(), 'm-cafe', 'c-sofia')).toBe(580);
  });
  it('el reset vuelve al estado inicial sin tocar otras claves', () => {
    const storage = new MemoryStorage();
    storage.setItem('otra-app', 'intacta');
    const store = createStore(new LocalStorageRepository(storage), seed);
    store.run((s) => creditManual(s, { merchantId: 'm-cafe', customerId: 'c-sofia', points: 999, reason: 'Demo' }));
    store.reset();
    expect(balanceOf(store.getState(), 'm-cafe', 'c-sofia')).toBe(580);
    expect(storage.getItem('otra-app')).toBe('intacta');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).state.movements.length).toBe(seed().movements.length);
  });
});
