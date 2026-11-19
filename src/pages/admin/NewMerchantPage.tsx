import { useNavigate } from 'react-router';
import { useStore } from '@/state/StoreProvider';
import { useSessionActions } from '@/state/hooks';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { createMerchant } from '@/domain/operations';
import { DEFAULT_PESOS_PER_POINT } from '@/domain/points';
import { MerchantForm, ACCENTS } from './MerchantForm';

export function NewMerchantPage() {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { setAdminMerchant } = useSessionActions();
  return (
    <>
      <AdminPageHeader title="Crear comercio" subtitle="Dalo de alta en la plataforma. Arranca con catálogo, clientes y promociones vacíos." />
      <MerchantForm
        initial={{ name: '', category: '', description: '', icon: 'store', accent: ACCENTS[3], pesosPerPoint: DEFAULT_PESOS_PER_POINT, promotionsEnabled: true }}
        submitLabel="Crear comercio"
        onSubmit={(input) => {
          const r = store.run((s) => createMerchant(s, input));
          if (!r.ok) return r.error;
          setAdminMerchant(r.value.id);
          toast.success('Comercio creado', `${r.value.name} · ID ${r.value.id}`);
          navigate('/admin');
          return null;
        }}
      />
    </>
  );
}
