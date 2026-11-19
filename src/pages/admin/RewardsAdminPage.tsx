import { useMemo, useState, type FormEvent } from 'react';
import { Gift, Pencil, Plus, Search } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState, PointsPill } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch, TextArea, TextField } from '@/components/ui/Field';
import { ChipGroup } from '@/components/ui/Chips';
import { RewardImage } from '@/components/ui/RewardImage';
import { useToast } from '@/components/ui/Toast';
import { createReward, setRewardActive, updateReward, validateReward, type RewardInput } from '@/domain/operations';
import { rewardCategories, rewardsOf } from '@/domain/selectors';
import { parseIntegerInput } from '@/domain/points';
import type { Reward } from '@/domain/types';

const LOCAL_IMAGES = [
  'tarta', 'cafe-torta', 'cafe-medialunas', 'helado', 'vaso-termico', 'desayuno', 'cafe-grano', 'alimento-perro',
  'juguete-perro', 'bano-perro', 'cama-mascota', 'toner', 'auriculares', 'mouse', 'cable-usbc', 'pendrive',
].map((s) => `/rewards/${s}.jpg`).concat('/rewards/descuento-20.svg');

interface FormState {
  name: string;
  description: string;
  category: string;
  cost: string;
  image: string;
  active: boolean;
  stock: string;
}

const empty: FormState = { name: '', description: '', category: '', cost: '', image: LOCAL_IMAGES[0], active: true, stock: '' };

function toForm(r: Reward): FormState {
  return { name: r.name, description: r.description, category: r.category, cost: String(r.cost), image: r.image, active: r.active, stock: r.stock === null ? '' : String(r.stock) };
}

function RewardFormModal({ open, onClose, editing, categories }: { open: boolean; onClose: () => void; editing: Reward | null; categories: string[] }) {
  const { merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(editing ? toForm(editing) : empty);
  const [error, setError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'local' | 'url'>(editing && !editing.image.startsWith('/') ? 'url' : 'local');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cost = parseIntegerInput(form.cost);
    const stock = form.stock.trim() === '' ? null : parseIntegerInput(form.stock);
    if (cost === null) return setError('El costo debe ser un número entero.');
    if (form.stock.trim() !== '' && stock === null) return setError('El stock debe ser un número entero.');
    const input: RewardInput = { name: form.name, description: form.description, category: form.category, cost, image: form.image, active: form.active, stock };
    const v = validateReward(input);
    if (v) return setError(v);
    const r = editing ? store.run((s) => updateReward(s, merchant.id, editing.id, input)) : store.run((s) => createReward(s, merchant.id, input));
    if (!r.ok) return setError(r.error);
    toast.success(editing ? 'Premio actualizado' : 'Premio creado', r.value.name);
    onClose();
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar premio' : 'Nuevo premio'}
      description={`Catálogo de ${merchant.name}`}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="reward-form">
            {editing ? 'Guardar cambios' : 'Crear premio'}
          </Button>
        </div>
      }
    >
      <form id="reward-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} data-autofocus placeholder="Ej: Café + dos medialunas" />
        </div>
        <TextField label="Categoría" value={form.category} onChange={(e) => set('category', e.target.value)} list="reward-categories" placeholder="Ej: Desayunos" />
        <datalist id="reward-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <TextField label="Costo en puntos" inputMode="numeric" value={form.cost} onChange={(e) => set('cost', e.target.value)} suffix="pts" placeholder="1500" />
        <div className="sm:col-span-2">
          <TextArea label="Descripción" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Contale al cliente qué incluye el premio." />
        </div>
        <TextField label="Stock" optional inputMode="numeric" value={form.stock} onChange={(e) => set('stock', e.target.value)} hint="Vacío = ilimitado" />
        <div className="flex items-end pb-2">
          <Switch checked={form.active} onChange={(v) => set('active', v)} label="Visible en la tienda" description={form.active ? 'Los clientes pueden canjearlo' : 'Oculto para los clientes'} />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">Imagen</legend>
          <div className="flex gap-2">
            <button type="button" onClick={() => setImageMode('local')} aria-pressed={imageMode === 'local'} className={`h-10 rounded-full px-4 text-sm font-semibold ${imageMode === 'local' ? 'bg-ink text-white' : 'bg-surface'}`}>
              Galería local
            </button>
            <button type="button" onClick={() => setImageMode('url')} aria-pressed={imageMode === 'url'} className={`h-10 rounded-full px-4 text-sm font-semibold ${imageMode === 'url' ? 'bg-ink text-white' : 'bg-surface'}`}>
              URL externa
            </button>
          </div>
          {imageMode === 'local' ? (
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-9" role="radiogroup" aria-label="Imágenes disponibles">
              {LOCAL_IMAGES.map((src) => (
                <button
                  key={src}
                  type="button"
                  role="radio"
                  aria-checked={form.image === src}
                  aria-label={src.split('/').pop()?.replace(/\.(jpg|svg)$/, '').replace(/-/g, ' ')}
                  onClick={() => set('image', src)}
                  className={`overflow-hidden rounded-xl ring-offset-2 transition ${form.image === src ? 'ring-[3px] ring-ink' : 'opacity-80 hover:opacity-100'}`}
                >
                  <RewardImage src={src} alt="" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_96px] sm:items-end">
              <TextField label="URL de la imagen (https)" type="url" inputMode="url" value={form.image.startsWith('/') ? '' : form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" hint="Si la imagen no carga, se muestra un fallback de SUMMA." />
              <RewardImage src={form.image} alt="Vista previa" className="size-24 rounded-xl" ratio="" />
            </div>
          )}
        </fieldset>
        {error && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger sm:col-span-2" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function RewardsAdminPage() {
  const { state, merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modal, setModal] = useState<{ open: boolean; editing: Reward | null; key: number }>({ open: false, editing: null, key: 0 });
  const all = rewardsOf(state, merchant.id, { includeInactive: true });
  const categories = rewardCategories(all);
  const list = useMemo(
    () =>
      all
        .filter((r) => (filter === 'all' ? true : filter === 'active' ? r.active : !r.active))
        .filter((r) => !q.trim() || `${r.name} ${r.category}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => Number(b.active) - Number(a.active) || a.cost - b.cost),
    [all, filter, q],
  );
  const redeemedCount = (id: string) => state.redemptions.filter((r) => r.rewardId === id).length;

  const openNew = () => setModal((m) => ({ open: true, editing: null, key: m.key + 1 }));

  return (
    <>
      <AdminPageHeader
        title="Catálogo de premios"
        subtitle={`${all.filter((r) => r.active).length} activos de ${all.length} en ${merchant.name}`}
        actions={
          <Button onClick={openNew} icon={<Plus className="size-5" aria-hidden />}>
            Nuevo premio
          </Button>
        }
      />
      {all.length > 0 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <label htmlFor="buscar-premio-admin" className="sr-only">
              Buscar premios
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="buscar-premio-admin"
              type="search"
              placeholder="Buscá un premio"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-12 w-full rounded-full border border-line-strong bg-white pl-12 pr-4 text-base focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/60"
            />
          </div>
          <ChipGroup
            label="Filtrar por estado"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Todos', count: all.length },
              { value: 'active', label: 'Activos', count: all.filter((r) => r.active).length },
              { value: 'inactive', label: 'Inactivos', count: all.filter((r) => !r.active).length },
            ]}
          />
        </div>
      )}

      {all.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<Gift className="size-7" />}
          title="El catálogo está vacío"
          description="Creá el primer premio para que tus clientes puedan canjear sus puntos."
          action={
            <Button onClick={openNew} icon={<Plus className="size-5" aria-hidden />}>
              Crear primer premio
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState className="mt-4" icon={<Search className="size-7" />} title="Sin resultados" />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <li key={r.id}>
              <Card className={`flex h-full gap-3 p-3 ${r.active ? '' : 'opacity-75'}`}>
                <RewardImage src={r.image} alt="" className={`size-24 shrink-0 rounded-2xl ${r.active ? '' : 'grayscale'}`} ratio="" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 font-bold leading-snug">{r.name}</h2>
                    <button
                      type="button"
                      onClick={() => setModal((m) => ({ open: true, editing: r, key: m.key + 1 }))}
                      className="-mr-1 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface"
                      aria-label={`Editar ${r.name}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    {r.category} · {r.stock === null ? 'Stock ilimitado' : `Stock: ${r.stock}`} · {redeemedCount(r.id)} canjes
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <PointsPill points={r.cost} size="sm" />
                    <div className="flex items-center gap-2">
                      <Badge tone={r.active ? 'success' : 'neutral'}>{r.active ? 'Activo' : 'Inactivo'}</Badge>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.active}
                        aria-label={`${r.active ? 'Desactivar' : 'Activar'} ${r.name}`}
                        onClick={() => {
                          const res = store.run((s) => setRewardActive(s, merchant.id, r.id, !r.active));
                          if (res.ok) toast.success(r.active ? 'Premio desactivado' : 'Premio activado', r.name);
                        }}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors ${r.active ? 'border-ink bg-lime' : 'border-line-strong bg-surface'}`}
                      >
                        <span className={`inline-block size-5 rounded-full transition-transform ${r.active ? 'translate-x-5 bg-ink' : 'translate-x-0.5 bg-white shadow'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {modal.open && <RewardFormModal key={modal.key} open={modal.open} editing={modal.editing} categories={categories} onClose={() => setModal((m) => ({ ...m, open: false }))} />}
    </>
  );
}
