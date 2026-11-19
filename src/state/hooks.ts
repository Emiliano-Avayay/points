import { useMemo } from 'react';
import { useDemoState, useStore } from './StoreProvider';
import { customerStats, getCustomer, getMerchant, isMember, merchantsOfCustomer } from '@/domain/selectors';
import type { Customer, DemoState, Merchant, Role } from '@/domain/types';

/** Contexto de la vista cliente: cliente activo, comercio activo y sus estadísticas. */
export function useClient() {
  const state = useDemoState();
  const { customerId, merchantId } = state.session;
  const customer = getCustomer(state, customerId) ?? state.customers[0];
  const myMerchants = useMemo(() => merchantsOfCustomer(state, customer.id), [state, customer.id]);
  const merchant: Merchant = (isMember(state, merchantId, customer.id) ? getMerchant(state, merchantId) : undefined) ?? myMerchants[0] ?? state.merchants[0];
  const stats = useMemo(() => customerStats(state, merchant.id, customer.id), [state, merchant.id, customer.id]);
  return { state, customer, merchant, myMerchants, stats };
}

/** Contexto de la vista administrador: comercio gestionado. */
export function useAdmin() {
  const state = useDemoState();
  const merchant = getMerchant(state, state.session.adminMerchantId) ?? state.merchants[0];
  return { state, merchant };
}

export function useSessionActions() {
  const store = useStore();
  return useMemo(
    () => ({
      setRole: (role: Role | null) => store.update((s: DemoState) => ({ ...s, session: { ...s.session, role } })),
      setClientMerchant: (merchantId: string) => store.update((s) => ({ ...s, session: { ...s.session, merchantId } })),
      setAdminMerchant: (merchantId: string) => store.update((s) => ({ ...s, session: { ...s.session, adminMerchantId: merchantId } })),
      setCustomer: (customer: Customer, merchantId?: string) =>
        store.update((s) => ({ ...s, session: { ...s.session, customerId: customer.id, merchantId: merchantId ?? s.session.merchantId } })),
      viewAsCustomer: (customerId: string, merchantId: string) =>
        store.update((s) => ({ ...s, session: { ...s.session, role: 'customer', customerId, merchantId } })),
    }),
    [store],
  );
}
