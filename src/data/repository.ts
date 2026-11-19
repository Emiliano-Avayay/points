/**
 * Capa de acceso a datos. La app solo conoce la interfaz `DemoRepository`,
 * por lo que LocalStorage puede reemplazarse por una API real más adelante.
 */
import type { DemoState } from '@/domain/types';
import { SCHEMA_VERSION } from './seed';

export interface DemoRepository {
  load(): DemoState | null;
  save(state: DemoState): void;
  clear(): void;
}

/** Clave única y versionada: el reset no toca datos de otras aplicaciones. */
export const STORAGE_KEY = 'summa-demo:state';

interface Envelope {
  schema: number;
  savedAt: string;
  state: DemoState;
}

const REQUIRED_ARRAYS: (keyof DemoState)[] = [
  'merchants',
  'customers',
  'memberships',
  'rewards',
  'movements',
  'redemptions',
  'promotions',
  'challenges',
  'challengeProgress',
  'referrals',
  'engagements',
  'participations',
  'campaigns',
];

/** Validación estructural mínima: si algo no cuadra, se descarta y se vuelve a la semilla. */
export function isValidState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (s.version !== SCHEMA_VERSION) return false;
  if (!REQUIRED_ARRAYS.every((k) => Array.isArray(s[k]))) return false;
  if (!s.favorites || typeof s.favorites !== 'object') return false;
  const session = s.session as Record<string, unknown> | undefined;
  if (!session || typeof session.customerId !== 'string' || typeof session.merchantId !== 'string') return false;
  const movements = s.movements as unknown[];
  return movements.every((m) => {
    const mv = m as Record<string, unknown>;
    return typeof mv.merchantId === 'string' && typeof mv.customerId === 'string' && Number.isInteger(mv.points);
  });
}

export class LocalStorageRepository implements DemoRepository {
  constructor(
    private readonly storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
    private readonly key = STORAGE_KEY,
  ) {}

  load(): DemoState | null {
    if (!this.storage) return null;
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const env = JSON.parse(raw) as Partial<Envelope>;
      if (env.schema !== SCHEMA_VERSION || !isValidState(env.state)) {
        console.warn('[SUMMA] Datos locales incompatibles: se restablece la demo.');
        return null;
      }
      return env.state;
    } catch {
      console.warn('[SUMMA] Datos locales dañados: se restablece la demo.');
      return null;
    }
  }

  save(state: DemoState): void {
    if (!this.storage) return;
    const env: Envelope = { schema: SCHEMA_VERSION, savedAt: new Date().toISOString(), state };
    try {
      this.storage.setItem(this.key, JSON.stringify(env));
    } catch (e) {
      console.warn('[SUMMA] No se pudo guardar en LocalStorage.', e);
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}
