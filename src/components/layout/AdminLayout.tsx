import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ArrowLeftRight,
  ChartPie,
  Gift,
  LayoutDashboard,
  List,
  Megaphone,
  Menu,
  Percent,
  Plus,
  PlusCircle,
  Settings,
  Smartphone,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { SummaLogo } from '@/components/brand/Logo';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { Badge } from '@/components/ui/Primitives';
import { IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ResetDemoButton } from './DemoControls';
import { useAdmin, useSessionActions } from '@/state/hooks';
import { useToast } from '@/components/ui/Toast';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/acreditar', label: 'Acreditar puntos', icon: PlusCircle },
  { to: '/admin/premios', label: 'Catálogo de premios', icon: Gift },
  { to: '/admin/canjes', label: 'Canjes', icon: Ticket },
  { to: '/admin/movimientos', label: 'Movimientos', icon: List },
  { to: '/admin/promociones', label: 'Promociones y niveles', icon: Percent },
  { to: '/admin/campanas', label: 'Campañas', icon: Megaphone },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

function MerchantPicker({ dark }: { dark?: boolean }) {
  const { state, merchant } = useAdmin();
  const { setAdminMerchant } = useSessionActions();
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-white/8 ring-1 ring-white/10' : 'bg-surface'}`}>
      <label htmlFor={dark ? 'admin-merchant-d' : 'admin-merchant-m'} className={`text-xs font-medium ${dark ? 'text-white/65' : 'text-muted'}`}>
        Comercio que administrás
      </label>
      <div className="mt-1.5 flex items-center gap-2.5">
        <MerchantMark merchant={merchant} size="sm" />
        <select
          id={dark ? 'admin-merchant-d' : 'admin-merchant-m'}
          value={merchant.id}
          onChange={(e) => {
            if (e.target.value === '__new') {
              navigate('/admin/comercios/nuevo');
              return;
            }
            setAdminMerchant(e.target.value);
            const m = state.merchants.find((x) => x.id === e.target.value);
            toast.info(`Administrando ${m?.name ?? ''}`);
          }}
          className={`h-10 min-w-0 flex-1 truncate rounded-xl border-0 bg-transparent pr-2 text-sm font-semibold focus:ring-2 focus:ring-lime ${dark ? 'text-white [&>option]:text-ink' : 'text-ink'}`}
        >
          {state.merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          <option value="__new">+ Crear comercio…</option>
        </select>
      </div>
    </div>
  );
}

function NavList({ dark, onNavigate }: { dark?: boolean; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-lime font-semibold text-ink' : dark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'hover:bg-surface'
              }`
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function DemoBox({ dark, onDone }: { dark?: boolean; onDone?: () => void }) {
  const { merchant } = useAdmin();
  const { setRole } = useSessionActions();
  const navigate = useNavigate();
  return (
    <div className={`flex flex-col gap-2 rounded-2xl p-3 ${dark ? 'bg-white/8 ring-1 ring-white/10' : 'border border-line'}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold ${dark ? 'text-white/70' : 'text-muted'}`}>Modo demostración</p>
        <Badge tone="lime">Demo</Badge>
      </div>
      <button
        type="button"
        onClick={() => {
          setRole('customer');
          onDone?.();
          navigate('/app');
        }}
        className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${dark ? 'bg-white text-ink hover:bg-lime' : 'bg-ink text-white hover:bg-ink-2'}`}
      >
        <Smartphone className="size-4" aria-hidden /> Cambiar a vista cliente
      </button>
      <Link
        to="/admin/comercios/nuevo"
        onClick={onDone}
        className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${dark ? 'text-white hover:bg-white/10' : 'hover:bg-surface'}`}
      >
        <Plus className="size-4" aria-hidden /> Crear comercio
      </Link>
      <Link to="/" onClick={onDone} className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${dark ? 'text-white hover:bg-white/10' : 'hover:bg-surface'}`}>
        <ArrowLeftRight className="size-4" aria-hidden /> Pantalla de acceso
      </Link>
      <ResetDemoButton variant={dark ? 'dark' : 'ghost'} full className={dark ? 'ring-1 ring-white/20' : ''} />
      <span className="sr-only">Comercio actual: {merchant.name}</span>
    </div>
  );
}

export function AdminLayout() {
  const { state, merchant } = useAdmin();
  const { setRole } = useSessionActions();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (state.session.role !== 'admin') setRole('admin');
  }, [state.session.role, setRole]);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const bottom: NavItem[] = [
    { to: '/admin', label: 'Inicio', icon: ChartPie, end: true },
    { to: '/admin/clientes', label: 'Clientes', icon: Users },
  ];
  const bottomRight: NavItem[] = [
    { to: '/admin/premios', label: 'Premios', icon: Gift },
    { to: '/admin/canjes', label: 'Canjes', icon: Ticket },
  ];
  const renderBottom = ({ to, label, icon: Icon, end }: NavItem) => (
    <li key={to} className="flex-1">
      <NavLink to={to} end={end} className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl">
        {({ isActive }) => (
          <>
            <Icon className={`size-6 ${isActive ? 'fill-lime text-ink' : 'text-ink-3'}`} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
            <span className={`whitespace-nowrap text-[0.66rem] min-[380px]:text-[0.7rem] ${isActive ? 'font-bold' : 'font-medium text-ink-3'}`}>{label}</span>
            <span aria-hidden className={`h-1 w-7 rounded-full ${isActive ? 'bg-lime' : 'bg-transparent'}`} />
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col gap-5 overflow-y-auto bg-ink p-5 text-white on-dark lg:flex" aria-label="Panel administrativo">
        <div className="flex items-center justify-between">
          <SummaLogo size="sm" tone="white" />
          <Badge tone="lime">Admin</Badge>
        </div>
        <MerchantPicker dark />
        <nav aria-label="Secciones del panel">
          <NavList dark />
        </nav>
        <div className="mt-auto">
          <DemoBox dark />
        </div>
      </aside>

      {/* Header móvil/tablet */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 pt-safe backdrop-blur lg:hidden">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
          <IconButton label="Abrir menú del panel" onClick={() => setMenuOpen(true)} aria-haspopup="dialog">
            <Menu className="size-7" strokeWidth={2.6} aria-hidden />
          </IconButton>
          <Link to="/admin" className="flex items-center gap-2 rounded-xl" aria-label="SUMMA Admin, ir al dashboard">
            <SummaLogo size="sm" />
          </Link>
          <span className="hidden min-[360px]:inline">
            <Badge tone="dark">Admin</Badge>
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="ml-auto flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-sm font-semibold"
            aria-label={`Comercio: ${merchant.name}. Cambiar`}
          >
            <MerchantMark merchant={merchant} size="sm" className="!rounded-full" />
            <span className="hidden max-w-36 truncate sm:inline">{merchant.name}</span>
          </button>
        </div>
      </header>

      <main id="admin-main" className="pb-nav lg:pb-12 lg:pl-72">
        <div className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Navegación inferior móvil */}
      <nav aria-label="Navegación del panel" className="fixed inset-x-0 bottom-0 z-40 lg:hidden md:bottom-4 md:px-4">
        <div className="relative mx-auto max-w-xl rounded-t-[1.75rem] bg-white pb-safe shadow-[0_-8px_30px_-12px_rgb(11_11_13/0.18)] md:rounded-[1.75rem] md:pb-0 md:shadow-float">
          <ul className="flex items-stretch px-1.5 pt-1">
            {bottom.map(renderBottom)}
            <li className="flex w-16 shrink-0 justify-center min-[380px]:w-20">
              <NavLink
                to="/admin/acreditar"
                aria-label="Acreditar puntos"
                className={({ isActive }) =>
                  `-mt-8 flex size-[4.5rem] items-center justify-center rounded-full border-[5px] border-white bg-lime shadow-lime transition-transform duration-200 hover:scale-105 active:scale-95 ${isActive ? 'ring-2 ring-ink' : ''}`
                }
              >
                <Plus className="size-9" strokeWidth={3} aria-hidden />
              </NavLink>
            </li>
            {bottomRight.map(renderBottom)}
          </ul>
        </div>
      </nav>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menú del panel" variant="side" hideTitle>
        <div className="-mt-2 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <SummaLogo size="sm" />
            <Badge tone="dark">Admin</Badge>
          </div>
          <MerchantPicker />
          <nav aria-label="Secciones del panel">
            <NavList onNavigate={() => setMenuOpen(false)} />
          </nav>
          <DemoBox onDone={() => setMenuOpen(false)} />
        </div>
      </Modal>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
