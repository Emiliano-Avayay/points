import { useState } from 'react';
import { CalendarDays, CircleCheck, ClipboardList, MapPin, Ticket, Users } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { Segmented } from '@/components/ui/Chips';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { participate } from '@/domain/operations';
import type { Engagement, EngagementKind } from '@/domain/types';

const dayFmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit' });
const monFmt = new Intl.DateTimeFormat('es-AR', { month: 'short' });
const fullFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

function DateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <span className="inline-flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white" aria-hidden>
      <span className="text-xl font-extrabold leading-none">{dayFmt.format(d)}</span>
      <span className="text-[0.7rem] font-semibold uppercase text-lime">{monFmt.format(d).replace('.', '')}</span>
    </span>
  );
}

export function EngagementsPage() {
  const { state, customer, merchant } = useClient();
  const store = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<EngagementKind>('event');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const list = state.engagements.filter((e) => e.merchantId === merchant.id && e.kind === tab).sort((a, b) => a.date.localeCompare(b.date));
  const mine = (id: string) => state.participations.find((p) => p.engagementId === id && p.customerId === customer.id);
  const count = (id: string) => state.participations.filter((p) => p.engagementId === id).length;

  const join = (e: Engagement, answer?: string) => {
    const r = store.run((s) => participate(s, merchant.id, customer.id, e.id, answer));
    if (!r.ok) return toast.error('No se pudo registrar', r.error);
    const msg = e.kind === 'event' ? '¡Lugar reservado!' : e.kind === 'survey' ? '¡Gracias por tu respuesta!' : '¡Ya estás participando!';
    toast.success(msg, r.value.points > 0 ? `Sumaste ${r.value.points} puntos.` : 'Te avisamos si ganás (simulado).');
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Eventos y actividades" subtitle={`Experiencias exclusivas de ${merchant.name}`} />
      <Segmented
        label="Tipo de actividad"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'event', label: 'Eventos', icon: <CalendarDays className="size-4" aria-hidden /> },
          { value: 'survey', label: 'Encuestas', icon: <ClipboardList className="size-4" aria-hidden /> },
          { value: 'raffle', label: 'Sorteos', icon: <Ticket className="size-4" aria-hidden /> },
        ]}
      />
      <div className="mt-4" role="tabpanel">
        {list.length === 0 ? (
          <EmptyState icon={<CalendarDays className="size-7" />} title="Nada por acá todavía" description="Pronto vas a encontrar nuevas actividades." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((e) => {
              const p = mine(e.id);
              const used = count(e.id);
              const full = e.capacity !== undefined && used >= e.capacity && !p;
              return (
                <li key={e.id}>
                  <Card className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <DateBlock iso={e.date} />
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold leading-snug">{e.title}</h2>
                        <p className="mt-0.5 text-[0.8rem] capitalize text-muted">{e.kind === 'event' ? fullFmt.format(new Date(e.date)) : `Cierra el ${fullFmt.format(new Date(e.date))}`}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-ink-3">{e.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.rewardPoints > 0 && <Badge tone="lime">+{e.rewardPoints} pts</Badge>}
                      {e.prize && <Badge tone="dark">Premio: {e.prize}</Badge>}
                      {e.place && (
                        <Badge tone="neutral" icon={<MapPin className="size-3" aria-hidden />}>
                          {e.place}
                        </Badge>
                      )}
                      {e.capacity !== undefined && (
                        <Badge tone="outline" icon={<Users className="size-3" aria-hidden />}>
                          {Math.max(0, e.capacity - used)} lugares
                        </Badge>
                      )}
                    </div>

                    {e.kind === 'survey' && !p && (
                      <fieldset className="mt-4">
                        <legend className="mb-2 text-sm font-semibold">Elegí una opción</legend>
                        <div className="grid gap-2">
                          {e.options?.map((o) => (
                            <label key={o} className={`flex min-h-11 items-center gap-3 rounded-2xl border-2 px-3 text-sm font-medium transition-colors ${answers[e.id] === o ? 'border-ink bg-lime-wash' : 'border-line hover:bg-surface'}`}>
                              <input type="radio" name={`survey-${e.id}`} value={o} checked={answers[e.id] === o} onChange={() => setAnswers((a) => ({ ...a, [e.id]: o }))} className="size-4 accent-ink" />
                              {o}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    <div className="mt-auto pt-4">
                      {p ? (
                        <p className="flex items-center gap-1.5 rounded-2xl bg-success-soft px-3 py-2.5 text-sm font-semibold text-success">
                          <CircleCheck className="size-4" aria-hidden />
                          {e.kind === 'event' ? 'Tenés tu lugar reservado' : e.kind === 'survey' ? `Respondiste: ${p.answer}` : `Participando · ticket #${p.id.slice(-5).toUpperCase()}`}
                        </p>
                      ) : (
                        <Button full disabled={full || (e.kind === 'survey' && !answers[e.id])} variant={e.kind === 'raffle' ? 'dark' : 'primary'} onClick={() => join(e, answers[e.id])}>
                          {full ? 'Sin lugares' : e.kind === 'event' ? 'Reservar mi lugar' : e.kind === 'survey' ? 'Enviar respuesta' : 'Participar del sorteo'}
                        </Button>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted">Actividades demostrativas: no se realizan reservas ni sorteos reales.</p>
    </PageContainer>
  );
}
