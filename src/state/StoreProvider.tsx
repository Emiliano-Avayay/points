import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { DemoStore } from './store';
import type { DemoState } from '@/domain/types';

const StoreContext = createContext<DemoStore | null>(null);

export function StoreProvider({ store, children }: { store: DemoStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): DemoStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return store;
}

export function useDemoState(): DemoState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
