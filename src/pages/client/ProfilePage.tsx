import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CircleCheck, LayoutDashboard, Mail, MapPin, Phone, Repeat, Store } from 'lucide-react';
import { useClient, useSessionActions } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Avatar, Badge, Card, PointsPill } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { ResetDemoButton } from '@/components/layout/DemoControls';
import { useToast } from '@/components/ui/Toast';
import { advanceChallenge, updateCustomerProfile } from '@/domain/operations';
import { balanceOf, customerStats } from '@/domain/selectors';
import { tierFor } from '@/domain/tiers';
import { fmtDate } from '@/domain/format';
import { TierMedal } from './LevelsPage';

export function ProfilePage() {
  const { state, customer, merchant, myMerchants, stats } = useClient();
  const { setClientMerchant, setRole } = useSessionActions();
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const completing = params.get('completar') === '1';
  const [editing, setEditing] = useState(completing);
  const [form, setForm] = useState({ name: customer.name, email: customer.email, phone: customer.phone, city: customer.city });
  const [error, setError] = useState<string | null>(null);
  const tier = tierFor(stats.totalEarned);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const r = store.run((s) => updateCustomerProfile(s, customer.id, form));
    if (!r.ok) return setError(r.error);
    setError(null);
    setEditing(false);
    const ch = state.challenges.find((c) => c.merchantId === merchant.id && c.kind === 'profile');
    const prog = ch && state.challengeProgress.find((p) => p.challengeId === ch.id && p.customerId === customer.id);
    if (ch && !(prog && prog.progress >= ch.goal)) {
      const adv = store.run((s) => advanceChallenge(s, merchant.id, customer.id, ch.id));
      if (adv.ok) {
        toast.success('Perfil completo', 'Reclamá tu desafío para sumar puntos.');
        if (completing) navigate('/app/desafios');
        return;
      }
    }
    toast.success('Datos guardados');
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Mi perfil" />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={customer.name} className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold">{customer.name}</h2>
            <p className="text-sm text-muted">Cliente desde {fmtDate(customer.createdAt)}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="lime">Nivel {tier.name}</Badge>
              {customer.profileCompleted ? (
                <Badge tone="success" icon={<CircleCheck className="size-3" aria-hidden />}>
                  Perfil completo
                </Badge>
              ) : (
                <Badge tone="warning">Perfil incompleto</Badge>
              )}
            </div>
          </div>
          <span className="hidden sm:inline">
            <TierMedal tier={tier.id} className="size-14" />
          </span>
        </div>

        {editing ? (
          <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
            {completing && <p className="rounded-2xl bg-lime-wash p-3 text-sm sm:col-span-2">Revisá y guardá tus datos para completar el desafío.</p>}
            <TextField label="Nombre y apellido" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Localidad" autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            {error && (
              <p className="text-sm font-medium text-danger sm:col-span-2" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Guardar datos</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
              <li className="flex items-center gap-2 truncate rounded-2xl bg-surface px-3 py-2.5">
                <Mail className="size-4 shrink-0 text-muted" aria-hidden /> <span className="truncate">{customer.email}</span>
              </li>
              <li className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
                <Phone className="size-4 shrink-0 text-muted" aria-hidden /> {customer.phone}
              </li>
              <li className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
                <MapPin className="size-4 shrink-0 text-muted" aria-hidden /> {customer.city}
              </li>
            </ul>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => setEditing(true)}>
              Editar datos
            </Button>
          </>
        )}
        <p className="mt-4 text-xs text-muted">Datos ficticios de demostración.</p>
      </Card>

      <h2 className="mb-3 mt-7 text-lg font-bold">Mis comercios</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {myMerchants.map((m) => {
          const s = customerStats(state, m.id, customer.id);
          const active = m.id === merchant.id;
          return (
            <li key={m.id}>
              <Card className={`flex items-center gap-3 p-4 ${active ? 'ring-[3px] ring-ink' : ''}`}>
                <MerchantMark merchant={m} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="text-[0.8rem] text-muted">Nivel {tierFor(s.totalEarned).name}</p>
                </div>
                <PointsPill points={balanceOf(state, m.id, customer.id)} size="sm" />
                {!active && (
                  <button type="button" onClick={() => setClientMerchant(m.id)} className="inline-flex size-10 items-center justify-center rounded-full bg-surface hover:bg-line" aria-label={`Cambiar a ${m.name}`}>
                    <Repeat className="size-4" aria-hidden />
                  </button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      <Link to="/app/comercios" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline decoration-lime decoration-[3px] underline-offset-4">
        <Store className="size-4" aria-hidden /> Ver todos los comercios adheridos
      </Link>

      <h2 className="mb-3 mt-7 text-lg font-bold">Navegación de la demo</h2>
      <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap">
        <Button
          variant="dark"
          icon={<LayoutDashboard className="size-5" aria-hidden />}
          onClick={() => {
            setRole('admin');
            navigate('/admin');
          }}
        >
          Cambiar a administrador
        </Button>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Elegir otro cliente
        </Button>
        <ResetDemoButton className="sm:h-12" />
      </Card>
    </PageContainer>
  );
}
