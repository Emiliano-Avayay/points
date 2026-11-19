import { Book, Coffee, Cpu, Dumbbell, PawPrint, Pizza, Shirt, Store, type LucideIcon } from 'lucide-react';
import type { Merchant, MerchantIconKey } from '@/domain/types';

export const MERCHANT_ICONS: Record<MerchantIconKey, { icon: LucideIcon; label: string }> = {
  coffee: { icon: Coffee, label: 'Café' },
  paw: { icon: PawPrint, label: 'Mascotas' },
  cpu: { icon: Cpu, label: 'Tecnología' },
  store: { icon: Store, label: 'Comercio' },
  shirt: { icon: Shirt, label: 'Indumentaria' },
  book: { icon: Book, label: 'Librería' },
  dumbbell: { icon: Dumbbell, label: 'Deportes' },
  pizza: { icon: Pizza, label: 'Gastronomía' },
};

/** Marca del comercio: ícono sobre su color secundario. La marca SUMMA se mantiene aparte. */
export function MerchantMark({ merchant, size = 'md', className = '' }: { merchant: Pick<Merchant, 'icon' | 'accent' | 'name'>; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = MERCHANT_ICONS[merchant.icon]?.icon ?? Store;
  const s = size === 'lg' ? 'size-14 rounded-2xl' : size === 'sm' ? 'size-8 rounded-xl' : 'size-11 rounded-2xl';
  const i = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5';
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center text-white ${s} ${className}`} style={{ backgroundColor: merchant.accent }}>
      <Icon className={i} strokeWidth={2.2} />
    </span>
  );
}
