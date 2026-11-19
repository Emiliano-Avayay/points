import { CircleCheck, Gift, ShoppingBag, Star, Store, Trophy, UserRound, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useClient } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, EmptyState, ProgressBar } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { advanceChallenge, claimChallenge } from '@/domain/operations';
import type { Challenge } from '@/domain/types';
import { TrophyIllustration } from '@/components/illustrations/HomeIllustrations';

const ICONS: Record<Challenge['icon'], LucideIcon> = { bag: ShoppingBag, store: Store, user: UserRound, star: Star, gift: Gift };
const ACTION: Record<Challenge['kind'], string> = {
  purchases: 'Simular compra',
  visits: 'Registrar visita',
  profile: 'Completar perfil',
  redeem: 'Simular canje',
};

export function ChallengesPage() {
  const { state, customer, merchant } = useClient();
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const list = state.challenges.filter((c) => c.merchantId === merchant.id);
  const progressOf = (id: string) => state.challengeProgress.find((p) => p.merchantId === merchant.id && p.customerId === customer.id && p.challengeId === id);
  const completed = list.filter((c) => progressOf(c.id)?.claimedAt).length;

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Desafíos Summa" subtitle={`Retos de ${merchant.name}`} />
      <div className="mb-5 flex items-center gap-4 rounded-card bg-white p-4 shadow-card">
        <TrophyIllustration className="h-20 w-24 shrink-0" />
        <div>
          <p className="text-2xl font-extrabold tabular">
            {completed}/{list.length}
          </p>
          <p className="text-sm text-muted">desafíos completados. Cumplilos y ganá puntos extra.</p>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted">En esta demo el progreso se simula con el botón de cada desafío.</p>
      {list.length === 0 ? (
        <EmptyState icon={<Trophy className="size-7" />} title="Sin desafíos activos" description="Este comercio todavía no publicó desafíos." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((c) => {
            const p = progressOf(c.id);
            const progress = Math.min(p?.progress ?? 0, c.goal);
            const done = progress >= c.goal;
            const claimed = !!p?.claimedAt;
            const Icon = ICONS[c.icon];
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl ${claimed ? 'bg-ink text-lime' : 'bg-lime'}`} aria-hidden>
                      {claimed ? <CircleCheck className="size-6" /> : <Icon className="size-6" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold leading-snug">{c.title}</h2>
                      <p className="text-sm text-ink-3">{c.description}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold tabular">
                        {progress} de {c.goal}
                      </span>
                      <Badge tone={claimed ? 'dark' : 'lime'}>+{c.rewardPoints} pts</Badge>
                    </div>
                    <ProgressBar value={progress} max={c.goal} label={`Progreso de ${c.title}`} />
                  </div>
                  <div className="mt-4">
                    {claimed ? (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                        <CircleCheck className="size-4" aria-hidden /> Recompensa cobrada
                      </p>
                    ) : done ? (
                      <Button
                        full
                        onClick={() => {
                          const r = store.run((s) => claimChallenge(s, merchant.id, customer.id, c.id));
                          if (r.ok) toast.success(`¡Ganaste ${c.rewardPoints} puntos!`, c.title);
                          else toast.error('No se pudo reclamar', r.error);
                        }}
                      >
                        Reclamar {c.rewardPoints} puntos
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        full
                        onClick={() => {
                          if (c.kind === 'profile' && !customer.profileCompleted) {
                            navigate('/app/perfil?completar=1');
                            return;
                          }
                          const r = store.run((s) => advanceChallenge(s, merchant.id, customer.id, c.id));
                          if (r.ok) toast.info('Progreso registrado', `${Math.min(r.value, c.goal)} de ${c.goal}`);
                          else toast.error('No se pudo avanzar', r.error);
                        }}
                      >
                        {ACTION[c.kind]}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
