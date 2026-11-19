/** Reglas puras de cálculo de puntos. Sin efectos secundarios. */

export const DEFAULT_PESOS_PER_POINT = 100;
export const REFERRAL_BONUS = 100;
export const MAX_POINTS_PER_OPERATION = 1_000_000;
export const MAX_PURCHASE_AMOUNT = 100_000_000;

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** floor(monto / pesosPorPunto). Devuelve null si el monto es inválido. */
export function pointsForPurchase(amount: number, pesosPerPoint = DEFAULT_PESOS_PER_POINT): number | null {
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PURCHASE_AMOUNT) return null;
  if (!isPositiveInteger(pesosPerPoint)) return null;
  return Math.floor(amount / pesosPerPoint);
}

/** Bonificación de una promoción: floor(base * porcentaje / 100). */
export function promoBonus(basePoints: number, bonusPercent: number): number {
  if (!Number.isInteger(basePoints) || basePoints <= 0) return 0;
  if (!Number.isFinite(bonusPercent) || bonusPercent <= 0) return 0;
  return Math.floor((basePoints * bonusPercent) / 100);
}

/** Parsea entradas de texto de formularios ("1.500", "1500") a entero. */
export function parseIntegerInput(raw: string): number | null {
  const clean = raw.trim().replace(/\./g, '').replace(/\s/g, '');
  if (!/^-?\d+$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isSafeInteger(n) ? n : null;
}

/** Parsea montos en pesos ("12.500", "12500,50"). */
export function parseAmountInput(raw: string): number | null {
  const clean = raw.trim().replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
