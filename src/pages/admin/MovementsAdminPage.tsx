import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Card, EmptyState } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { MovementRow } from '@/components/points/MovementList';
import { MOVEMENT_LABELS, getCustomer } from '@/domain/selectors';
import type { MovementType } from '@/domain/types';

export function MovementsAdminPage() {
  const { state, merchant } = useAdmin();
  const [type, setType] = useState<'all' | MovementType>('all');
  const [limit, setLimit] = useState(25);
  const list = useMemo(
    () => state.movements.filter((m) => m.merchantId === merchant.id && (type === 'all' || m.type === type)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state, merchant.id, type],
  );
  return (
    <>
      <AdminPageHeader title="Movimientos" subtitle={`Registro completo de operaciones de ${merchant.name}`} />
      <div className="mb-4 max-w-xs">
        <SelectField label="Tipo de movimiento" value={type} onChange={(e) => { setType(e.target.value as 'all' | MovementType); setLimit(25); }}>
          <option value="all">Todos ({state.movements.filter((m) => m.merchantId === merchant.id).length})</option>
          {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => (
            <option key={t} value={t}>
              {MOVEMENT_LABELS[t]}
            </option>
          ))}
        </SelectField>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<List className="size-7" />} title="Sin movimientos" />
      ) : (
        <Card className="px-4">
          <ul className="divide-y divide-line">
            {list.slice(0, limit).map((m) => (
              <MovementRow key={m.id} m={m} extra={getCustomer(state, m.customerId)?.name} />
            ))}
          </ul>
        </Card>
      )}
      {list.length > limit && (
        <Button variant="secondary" full className="mt-3" onClick={() => setLimit((l) => l + 25)}>
          Ver más ({list.length - limit} restantes)
        </Button>
      )}
    </>
  );
}
