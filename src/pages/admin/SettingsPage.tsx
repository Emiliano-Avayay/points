import { useAdmin } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { updateMerchant } from '@/domain/operations';
import { MerchantForm } from './MerchantForm';

export function SettingsPage() {
  const { merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  return (
    <>
      <AdminPageHeader title="Configuración del comercio" subtitle={`ID: ${merchant.id}`} />
      <MerchantForm
        key={merchant.id}
        initial={merchant}
        submitLabel="Guardar cambios"
        onSubmit={(input) => {
          const r = store.run((s) => updateMerchant(s, merchant.id, input));
          if (!r.ok) return r.error;
          toast.success('Configuración guardada', r.value.name);
          return null;
        }}
      />
    </>
  );
}
