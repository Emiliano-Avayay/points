import { useNavigate } from 'react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { useClient, useSessionActions } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, PointsPill } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { useToast } from '@/components/ui/Toast';
import { balanceOf, isMember, rewardsOf } from '@/domain/selectors';
import { joinMerchant } from '@/domain/operations';

export function MerchantsPage() {
  const { state, customer, merchant } = useClient();
  const { setClientMerchant } = useSessionActions();
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Comercios adheridos" subtitle="Cada comercio tiene su propio programa y sus propios puntos." />
      <ul className="grid gap-3 md:grid-cols-2">
        {state.merchants.map((m) => {
          const member = isMember(state, m.id, customer.id);
          const active = m.id === merchant.id;
          return (
            <li key={m.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <MerchantMark merchant={m} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold leading-snug">{m.name}</h2>
                    <p className="text-sm text-muted">{m.category}</p>
                  </div>
                  {active ? <Badge tone="lime">Activo</Badge> : member ? <Badge tone="success">Adherido</Badge> : null}
                </div>
                <p className="mt-3 text-sm text-ink-3">{m.description || 'Comercio adherido a SUMMA.'}</p>
                <p className="mt-2 text-xs text-muted">
                  {rewardsOf(state, m.id).length} premios · 1 punto cada ${m.pesosPerPoint}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  {member ? <PointsPill points={balanceOf(state, m.id, customer.id)} size="sm" /> : <span className="text-sm text-muted">Sin puntos todavía</span>}
                  {member ? (
                    <Button
                      size="sm"
                      variant={active ? 'secondary' : 'dark'}
                      disabled={active}
                      icon={<ArrowRight className="size-4" aria-hidden />}
                      onClick={() => {
                        setClientMerchant(m.id);
                        navigate('/app');
                      }}
                    >
                      {active ? 'Estás acá' : 'Ir'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      icon={<Plus className="size-4" aria-hidden />}
                      onClick={() => {
                        const r = store.run((s) => joinMerchant(s, m.id, customer.id));
                        if (!r.ok) return toast.error('No se pudo adherir', r.error);
                        setClientMerchant(m.id);
                        toast.success(`¡Te sumaste a ${m.name}!`, 'Empezás con 0 puntos en este comercio.');
                        navigate('/app');
                      }}
                    >
                      Sumarme
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
}
