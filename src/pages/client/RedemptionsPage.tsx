import { useState } from 'react';
import { Copy, Gift, Ticket } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { ButtonLink } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/Chips';
import { RewardImage } from '@/components/ui/RewardImage';
import { useToast } from '@/components/ui/Toast';
import { redemptionsOf } from '@/domain/selectors';
import { fmtDate, fmtPoints } from '@/domain/format';
import { copyText } from '@/lib/clipboard';

type Filter = 'all' | 'pending' | 'delivered';

export function RedemptionsPage() {
  const { state, customer, merchant } = useClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const all = redemptionsOf(state, merchant.id, customer.id);
  const list = all.filter((r) => filter === 'all' || r.status === filter);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Mis canjes" subtitle={`Historial en ${merchant.name}`} />
      {all.length > 0 && (
        <ChipGroup
          label="Filtrar canjes"
          value={filter}
          onChange={setFilter}
          className="mb-4"
          options={[
            { value: 'all', label: 'Todos', count: all.length },
            { value: 'pending', label: 'Pendientes', count: all.filter((r) => r.status === 'pending').length },
            { value: 'delivered', label: 'Entregados', count: all.filter((r) => r.status === 'delivered').length },
          ]}
        />
      )}
      {all.length === 0 ? (
        <EmptyState
          icon={<Gift className="size-7" />}
          title="Todavía no canjeaste premios"
          description="Elegí tu primer premio en la tienda y usá tus puntos."
          action={<ButtonLink to="/app/premios">Ir a la tienda</ButtonLink>}
        />
      ) : list.length === 0 ? (
        <EmptyState icon={<Ticket className="size-7" />} title="No hay canjes con este estado" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id}>
              <Card className="flex gap-3 p-3">
                <RewardImage src={r.rewardImage} alt="" className="size-20 shrink-0 rounded-2xl sm:size-24" ratio="" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 font-bold leading-snug">{r.rewardName}</h2>
                    <Badge tone={r.status === 'pending' ? 'warning' : 'success'}>{r.status === 'pending' ? 'Pendiente' : 'Entregado'}</Badge>
                  </div>
                  <p className="text-[0.8rem] text-muted">
                    {merchant.name} · {fmtDate(r.createdAt)}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span className="whitespace-nowrap text-sm font-bold tabular">−{fmtPoints(r.cost)} pts</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const okCopy = await copyText(r.code);
                        if (okCopy) toast.success('Código copiado', r.code);
                        else toast.error('No se pudo copiar', 'Copialo manualmente.');
                      }}
                      className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-3 font-mono text-xs font-bold tracking-wider hover:bg-line"
                      aria-label={`Copiar código de canje ${r.code}`}
                    >
                      {r.code}
                      <Copy className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-center text-xs text-muted">Los códigos son ficticios y solo válidos dentro de esta demo.</p>
    </PageContainer>
  );
}
