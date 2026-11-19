import { useState, type FormEvent } from 'react';
import { CircleCheck, Clock, Copy, Share2, UserPlus, Users } from 'lucide-react';
import { useClient } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { inviteFriend, simulateReferralFirstPurchase } from '@/domain/operations';
import { REFERRAL_BONUS } from '@/domain/points';
import { fmtDate } from '@/domain/format';
import { copyText } from '@/lib/clipboard';

export function InvitePage() {
  const { state, customer, merchant } = useClient();
  const store = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const refs = state.referrals.filter((r) => r.merchantId === merchant.id && r.inviterId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rewarded = refs.filter((r) => r.status === 'rewarded').length;
  // Enlace demostrativo: apunta a esta misma demo, no a un registro real.
  const link = `${window.location.origin}/?ref=${customer.referralCode}`;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = store.run((s) => inviteFriend(s, merchant.id, customer.id, name));
    if (!r.ok) return setError(r.error);
    setError(null);
    setName('');
    toast.success('Invitación registrada', 'Es una simulación: no se envió ningún mensaje.');
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Invitá amigos" subtitle={`Programa de referidos de ${merchant.name}`} />

      <div className="relative overflow-hidden rounded-card bg-lime p-5 sm:p-7">
        <svg className="absolute -bottom-12 -right-8 size-48" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="var(--color-ink)" opacity=".07" />
        </svg>
        <p className="relative text-sm font-semibold">Ganá {REFERRAL_BONUS} puntos por cada amigo</p>
        <h2 className="relative mt-1 max-w-md text-2xl font-extrabold leading-tight sm:text-3xl">Compartí tu código y sumen juntos</h2>
        <ol className="relative mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {['Compartí tu código o enlace.', 'Tu amigo se suma y hace su primera compra.', `Recibís ${REFERRAL_BONUS} puntos en ${merchant.name}.`].map((t, i) => (
            <li key={t} className="flex items-start gap-2 rounded-2xl bg-white/70 p-3">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-lime">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>

      <Card className="mt-4 p-5">
        <p className="text-sm text-muted">Tu código de referido</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest">{customer.referralCode}</p>
        <p className="mt-3 break-all rounded-2xl bg-surface px-3 py-2 text-sm text-ink-3">{link}</p>
        <p className="mt-1 text-xs text-muted">Enlace demostrativo: abre esta demo, no crea cuentas reales.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            icon={<Copy className="size-5" aria-hidden />}
            onClick={async () => {
              const okCopy = await copyText(link);
              if (okCopy) toast.success('Enlace copiado');
              else toast.error('No se pudo copiar', 'Copialo manualmente.');
            }}
          >
            Copiar enlace
          </Button>
          <Button
            variant="secondary"
            disabled={!canShare}
            title={canShare ? undefined : 'Tu navegador no permite compartir'}
            icon={<Share2 className="size-5" aria-hidden />}
            onClick={async () => {
              try {
                await navigator.share({ title: 'SUMMA', text: `Sumate a ${merchant.name} con mi código ${customer.referralCode}`, url: link });
              } catch {
                /* el usuario canceló */
              }
            }}
          >
            {canShare ? 'Compartir' : 'Compartir (no disponible)'}
          </Button>
        </div>
      </Card>

      <section className="mt-6" aria-labelledby="sim">
        <h2 id="sim" className="text-lg font-bold">
          Simulá una invitación
        </h2>
        <p className="mb-3 text-sm text-muted">Probá el beneficio sin enviar mensajes reales.</p>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <TextField label="Nombre de tu amigo o amiga" placeholder="Ej: Paula Ibarra" value={name} onChange={(e) => setName(e.target.value)} error={error} autoComplete="off" />
          </div>
          <Button type="submit" variant="dark" className="sm:mt-7" icon={<UserPlus className="size-5" aria-hidden />}>
            Invitar
          </Button>
        </form>
      </section>

      <section className="mt-6" aria-labelledby="invitados">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="invitados" className="text-lg font-bold">
            Tus invitados
          </h2>
          <Badge tone="lime">
            {refs.length} invitados · {rewarded} con premio
          </Badge>
        </div>
        {refs.length === 0 ? (
          <EmptyState icon={<Users className="size-7" />} title="Todavía no invitaste a nadie" description="Cuando invites amigos, vas a ver su estado acá." />
        ) : (
          <ul className="flex flex-col gap-2">
            {refs.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <span className={`inline-flex size-10 items-center justify-center rounded-full ${r.status === 'rewarded' ? 'bg-lime' : 'bg-surface'}`} aria-hidden>
                    {r.status === 'rewarded' ? <CircleCheck className="size-5" /> : <Clock className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.inviteeName}</p>
                    <p className="text-[0.8rem] text-muted">
                      {r.status === 'rewarded' ? `Recompensado el ${fmtDate(r.rewardedAt!)} · +${REFERRAL_BONUS} pts` : `Invitado el ${fmtDate(r.createdAt)} · esperando su primera compra`}
                    </p>
                  </div>
                  {r.status === 'invited' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const res = store.run((s) => simulateReferralFirstPurchase(s, r.id));
                        if (res.ok) toast.success(`¡Sumaste ${res.value.bonus} puntos!`, `${r.inviteeName} hizo su primera compra (simulada).`);
                        else toast.error('No se pudo simular', res.error);
                      }}
                    >
                      Simular primera compra
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
