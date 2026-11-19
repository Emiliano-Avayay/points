/**
 * Store mínimo y sincrónico. Cada operación se aplica sobre el estado más reciente,
 * de modo que un doble clic nunca procesa dos veces la misma solicitud.
 */
import type { DemoState, Result } from '@/domain/types';
import type { DemoRepository } from '@/data/repository';
import { STORAGE_KEY } from '@/data/repository';
import { createSeed } from '@/data/seed';

type Listener = () => void;

export interface DemoStore {
  getState(): DemoState;
  subscribe(listener: Listener): () => void;
  /** Aplica una operación de dominio y persiste si fue exitosa. */
  run<T>(op: (state: DemoState) => Result<T>): Result<T>;
  /** Actualización directa (sesión, preferencias). */
  update(fn: (state: DemoState) => DemoState): void;
  reset(): void;
}

export function createStore(repo: DemoRepository, seed: () => DemoState = () => createSeed()): DemoStore {
  let state = repo.load() ?? seed();
  repo.save(state);
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());
  const commit = (next: DemoState) => {
    state = next;
    repo.save(state);
    emit();
  };

  if (typeof window !== 'undefined') {
    // Sincroniza pestañas del mismo navegador.
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const loaded = repo.load();
      if (loaded) {
        state = loaded;
        emit();
      }
    });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    run(op) {
      const result = op(state);
      if (result.ok) commit(result.state);
      return result;
    },
    update(fn) {
      commit(fn(state));
    },
    reset() {
      repo.clear();
      const fresh = seed();
      commit(fresh);
    },
  };
}
