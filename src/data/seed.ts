/**
 * Datos iniciales de la demo. Determinísticos (PRNG con semilla) y relativos a `now`,
 * para que siempre haya "actividad de los últimos meses".
 * Los saldos NO se cargan: se derivan de los movimientos, por lo que concilian por construcción.
 */
import type {
  Campaign,
  Challenge,
  ChallengeProgress,
  Customer,
  DemoState,
  Engagement,
  Membership,
  Merchant,
  Movement,
  Participation,
  Promotion,
  Redemption,
  Referral,
  Reward,
} from '@/domain/types';
import { DEFAULT_TIER_BENEFITS } from '@/domain/tiers';
import { mulberry32 } from '@/domain/ids';
import { promoBonus } from '@/domain/points';
import { promotionAppliesAt } from '@/domain/selectors';

export const SCHEMA_VERSION = 1;
export const DEFAULT_CUSTOMER_ID = 'c-sofia';
export const DEFAULT_MERCHANT_ID = 'm-cafe';

const DAY = 86_400_000;

export function createSeed(now: Date = new Date()): DemoState {
  const rand = mulberry32(20261119);
  const daysAgo = (d: number, hour = 12, minute = 0) => {
    const t = new Date(now.getTime() - d * DAY);
    t.setHours(hour, minute, 0, 0);
    return t;
  };
  const iso = (d: Date) => d.toISOString();
  const base = iso(daysAgo(200));

  /* ------------------------------ Comercios ------------------------------ */
  const merchants: Merchant[] = [
    {
      id: 'm-cafe',
      name: 'Café Molienda',
      category: 'Cafetería',
      description: 'Café de especialidad, pastelería artesanal y helados de elaboración propia en Palermo.',
      icon: 'coffee',
      accent: '#8A5A3C',
      pesosPerPoint: 100,
      promotionsEnabled: true,
      tierBenefits: {
        bronze: ['Sumás 1 punto cada $100', 'Bonificaciones de los lunes', 'Medialuna de bienvenida'],
        silver: ['Todo lo de Bronce', 'Café de cortesía en tu cumpleaños', 'Acceso anticipado a catas'],
        gold: ['Todo lo de Plata', 'Premios exclusivos Oro', 'Doble puntuación un día al mes', 'Reserva de mesa prioritaria'],
      },
      createdAt: base,
    },
    {
      id: 'm-pets',
      name: 'Patitas Pet Shop',
      category: 'Tienda de mascotas',
      description: 'Alimentos, accesorios y peluquería canina para que tu mascota esté feliz.',
      icon: 'paw',
      accent: '#E0752D',
      pesosPerPoint: 100,
      promotionsEnabled: true,
      tierBenefits: structuredClone(DEFAULT_TIER_BENEFITS),
      createdAt: base,
    },
    {
      id: 'm-tech',
      name: 'Nodo Tecnología',
      category: 'Tienda de tecnología',
      description: 'Insumos de computación, accesorios y gadgets con servicio técnico propio.',
      icon: 'cpu',
      accent: '#2F6F73',
      pesosPerPoint: 200,
      promotionsEnabled: true,
      tierBenefits: {
        bronze: ['Sumás 1 punto cada $200', 'Diagnóstico técnico sin cargo', 'Bonificación Tech Friday'],
        silver: ['Todo lo de Bronce', '10% off en servicio técnico', 'Preventas exclusivas'],
        gold: ['Todo lo de Plata', 'Premios exclusivos Oro', 'Garantía extendida 3 meses', 'Atención prioritaria'],
      },
      createdAt: base,
    },
  ];

  /* ------------------------------ Clientes ------------------------------ */
  const people: [string, string, string, string][] = [
    ['c-sofia', 'Sofía Martínez', 'SOFI580', 'CABA'],
    ['c-martin', 'Martín Gómez', 'MARTIN24', 'CABA'],
    ['c-lucia', 'Lucía Fernández', 'LUCIA11', 'Vicente López'],
    ['c-tomas', 'Tomás Rodríguez', 'TOMI90', 'CABA'],
    ['c-valentina', 'Valentina López', 'VALEN33', 'San Isidro'],
    ['c-joaquin', 'Joaquín Pérez', 'JOACO07', 'CABA'],
    ['c-camila', 'Camila Sánchez', 'CAMI45', 'Avellaneda'],
    ['c-mateo', 'Mateo Romero', 'MATEO19', 'CABA'],
    ['c-agustina', 'Agustina Díaz', 'AGUS52', 'Quilmes'],
    ['c-facundo', 'Facundo Álvarez', 'FACU88', 'CABA'],
    ['c-micaela', 'Micaela Torres', 'MICA27', 'Lanús'],
    ['c-nicolas', 'Nicolás Ruiz', 'NICO63', 'CABA'],
    ['c-florencia', 'Florencia Castro', 'FLOR14', 'Olivos'],
    ['c-julian', 'Julián Herrera', 'JULI71', 'CABA'],
    ['c-milagros', 'Milagros Benítez', 'MILI39', 'Morón'],
    ['c-bruno', 'Bruno Acosta', 'BRUNO05', 'CABA'],
    ['c-carolina', 'Carolina Medina', 'CARO48', 'Tigre'],
    ['c-ignacio', 'Ignacio Suárez', 'NACHO22', 'CABA'],
  ];
  const customers: Customer[] = people.map(([id, name, code, city], i) => {
    const [first, last] = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(' ');
    return {
      id,
      name,
      email: `${first}.${last}@demo.summa`,
      phone: `+54 9 11 5${String(100 + i * 37).padStart(3, '0')}-${String(2000 + i * 413).slice(0, 4)}`,
      city,
      referralCode: code,
      profileCompleted: i % 3 === 1,
      createdAt: iso(daysAgo(190 - i * 3)),
    };
  });

  const membershipPlan: Record<string, string[]> = {
    'm-cafe': ['c-sofia', 'c-martin', 'c-lucia', 'c-tomas', 'c-valentina', 'c-camila', 'c-agustina', 'c-micaela', 'c-florencia', 'c-julian', 'c-bruno'],
    'm-pets': ['c-sofia', 'c-lucia', 'c-joaquin', 'c-mateo', 'c-agustina', 'c-facundo', 'c-nicolas', 'c-milagros', 'c-carolina'],
    'm-tech': ['c-martin', 'c-tomas', 'c-joaquin', 'c-facundo', 'c-nicolas', 'c-julian', 'c-ignacio', 'c-camila', 'c-bruno'],
  };
  const memberships: Membership[] = [];
  Object.entries(membershipPlan).forEach(([merchantId, ids]) =>
    ids.forEach((customerId, i) => memberships.push({ merchantId, customerId, joinedAt: iso(daysAgo(185 - i * 4)) })),
  );

  /* ------------------------------- Premios ------------------------------- */
  const rw = (id: string, merchantId: string, name: string, category: string, cost: number, image: string, description: string, stock: number | null = null): Reward => ({
    id,
    merchantId,
    name,
    category,
    cost,
    image,
    description,
    active: true,
    stock,
    createdAt: base,
  });
  const rewards: Reward[] = [
    rw('rw-cafe-tarta', 'm-cafe', 'Tarta a elección', 'Pastelería', 1500, '/rewards/tarta.jpg', 'Elegí una tarta entera de nuestra vitrina: frutos rojos, lemon pie o manzana. Ideal para compartir.'),
    rw('rw-cafe-torta', 'm-cafe', 'Café + porción de torta', 'Meriendas', 1500, '/rewards/cafe-torta.jpg', 'Un café de especialidad del tamaño que quieras y una porción de la torta del día.'),
    rw('rw-cafe-medialunas', 'm-cafe', 'Café + dos medialunas', 'Desayunos', 1500, '/rewards/cafe-medialunas.jpg', 'El clásico desayuno porteño: café con leche y dos medialunas de manteca recién horneadas.'),
    rw('rw-cafe-helado', 'm-cafe', 'Un kilogramo de helado', 'Helados', 2000, '/rewards/helado.jpg', 'Un kilo de helado artesanal, hasta cuatro gustos. Para llevar.', 25),
    rw('rw-cafe-vaso', 'm-cafe', 'Vaso térmico', 'Accesorios', 2000, '/rewards/vaso-termico.jpg', 'Vaso térmico de acero inoxidable de 350 ml con tapa antiderrame. Mantiene tu café caliente por 4 horas.', 12),
    rw('rw-cafe-desayuno', 'm-cafe', 'Desayuno para dos', 'Desayunos', 2600, '/rewards/desayuno.jpg', 'Dos cafés, jugo de naranja exprimido, tostadas con palta y una porción de budín para compartir.'),
    rw('rw-cafe-grano', 'm-cafe', 'Café en grano 250 g', 'Accesorios', 1200, '/rewards/cafe-grano.jpg', 'Bolsa de 250 g de nuestro blend de la casa, tostado en la semana. Molido a pedido.'),
    rw('rw-pets-alimento', 'm-pets', 'Alimento balanceado para perro', 'Alimentos', 1500, '/rewards/alimento-perro.jpg', 'Bolsa de 3 kg de alimento balanceado premium para perros adultos de todas las razas.', 30),
    rw('rw-pets-descuento', 'm-pets', 'Descuento del 20%', 'Descuentos', 1500, '/rewards/descuento-20.svg', 'Cupón de 20% de descuento en tu próxima compra de accesorios, hasta $30.000 de tope.'),
    rw('rw-pets-juguete', 'm-pets', 'Juguete mordillo', 'Accesorios', 800, '/rewards/juguete-perro.jpg', 'Mordillo de soga de algodón resistente, ideal para perros medianos y grandes.'),
    rw('rw-pets-bano', 'm-pets', 'Baño y corte', 'Servicios', 2500, '/rewards/bano-perro.jpg', 'Sesión completa de peluquería: baño, secado, corte e higiene. Con turno previo.'),
    rw('rw-pets-cama', 'm-pets', 'Cama para mascota', 'Accesorios', 3200, '/rewards/cama-mascota.jpg', 'Cama acolchada lavable de 60 cm, perfecta para perros chicos o gatos.', 6),
    rw('rw-tech-toner', 'm-tech', 'Tóner de color', 'Insumos', 1500, '/rewards/toner.jpg', 'Cartucho de tóner color compatible para impresoras láser de las marcas más comunes. Consultá modelos.', 20),
    rw('rw-tech-auriculares', 'm-tech', 'Auriculares in-ear', 'Audio', 3500, '/rewards/auriculares.jpg', 'Auriculares inalámbricos con estuche de carga, Bluetooth 5.3 y hasta 24 h de batería.', 8),
    rw('rw-tech-mouse', 'm-tech', 'Mouse inalámbrico', 'Periféricos', 2200, '/rewards/mouse.jpg', 'Mouse ergonómico silencioso con receptor USB y batería recargable.'),
    rw('rw-tech-cable', 'm-tech', 'Cable USB‑C reforzado', 'Accesorios', 900, '/rewards/cable-usbc.jpg', 'Cable USB‑C a USB‑C de 1,5 m con mallado de nylon y carga rápida de 60 W.'),
    rw('rw-tech-pendrive', 'm-tech', 'Pendrive 64 GB', 'Almacenamiento', 1300, '/rewards/pendrive.jpg', 'Memoria USB 3.2 de 64 GB, compacta y con llavero.'),
    rw('rw-tech-descuento', 'm-tech', 'Descuento del 20%', 'Descuentos', 1500, '/rewards/descuento-20.svg', 'Cupón de 20% en servicio técnico o accesorios, hasta $50.000 de tope.'),
  ];

  /* ------------------------------ Promociones ------------------------------ */
  const promo = (p: Omit<Promotion, 'active'> & { active?: boolean }): Promotion => ({ active: true, ...p });
  const promotions: Promotion[] = [
    promo({ id: 'pr-cafe-lunes', merchantId: 'm-cafe', name: 'Lunes con 20% extra', description: 'Todos los lunes sumás un 20% más de puntos en cualquier consumo.', schedule: 'Todos los lunes, todo el día', startsAt: iso(daysAgo(180, 0)), endsAt: iso(daysAgo(-120, 23, 59)), bonusPercent: 20, weekdays: [1], hours: null }),
    promo({ id: 'pr-cafe-semana', merchantId: 'm-cafe', name: 'Semana de beneficios', description: 'Durante esta semana cada compra suma un 30% extra. ¡Aprovechala!', schedule: 'Toda la semana', startsAt: iso(daysAgo(2, 0)), endsAt: iso(daysAgo(-5, 23, 59)), bonusPercent: 30, weekdays: null, hours: null }),
    promo({ id: 'pr-cafe-merienda', merchantId: 'm-cafe', name: 'Doble puntuación en la merienda', description: 'De 16 a 19 h duplicás los puntos de tu merienda.', schedule: 'Todos los días de 16 a 19 h', startsAt: iso(daysAgo(-7, 0)), endsAt: iso(daysAgo(-37, 23, 59)), bonusPercent: 100, weekdays: null, hours: [16, 19] }),
    promo({ id: 'pr-pets-sabado', merchantId: 'm-pets', name: 'Sábados Patitas Felices', description: 'Los sábados sumás 25% extra en alimentos y accesorios.', schedule: 'Todos los sábados', startsAt: iso(daysAgo(150, 0)), endsAt: iso(daysAgo(-90, 23, 59)), bonusPercent: 25, weekdays: [6], hours: null }),
    promo({ id: 'pr-pets-manana', merchantId: 'm-pets', name: 'Doble puntuación mañanera', description: 'Martes y jueves de 9 a 12 h, tus compras suman el doble.', schedule: 'Martes y jueves de 9 a 12 h', startsAt: iso(daysAgo(60, 0)), endsAt: iso(daysAgo(-60, 23, 59)), bonusPercent: 100, weekdays: [2, 4], hours: [9, 12] }),
    promo({ id: 'pr-pets-adopcion', merchantId: 'm-pets', name: 'Mes del adoptante', description: '40% extra para familias que adoptaron. Gracias por sumar.', schedule: 'Finalizada', startsAt: iso(daysAgo(120, 0)), endsAt: iso(daysAgo(90, 23, 59)), bonusPercent: 40, weekdays: null, hours: null }),
    promo({ id: 'pr-tech-friday', merchantId: 'm-tech', name: 'Tech Friday', description: 'Todos los viernes, 50% extra en accesorios y periféricos.', schedule: 'Todos los viernes', startsAt: iso(daysAgo(170, 0)), endsAt: iso(daysAgo(-100, 23, 59)), bonusPercent: 50, weekdays: [5], hours: null }),
    promo({ id: 'pr-tech-gamer', merchantId: 'm-tech', name: 'Semana gamer', description: 'Sumá 20% extra en toda la línea gamer.', schedule: 'Del lanzamiento por 7 días', startsAt: iso(daysAgo(-14, 0)), endsAt: iso(daysAgo(-21, 23, 59)), bonusPercent: 20, weekdays: null, hours: null }),
    promo({ id: 'pr-tech-clases', merchantId: 'm-tech', name: 'Vuelta a clases', description: '30% extra en pendrives, mochilas y auriculares.', schedule: 'Finalizada', startsAt: iso(daysAgo(150, 0)), endsAt: iso(daysAgo(130, 23, 59)), bonusPercent: 30, weekdays: null, hours: null }),
  ];

  /* ------------------------- Movimientos y canjes ------------------------- */
  const movements: Movement[] = [];
  const redemptions: Redemption[] = [];
  let seq = 0;
  const mid = () => `mov-s${(++seq).toString(36).padStart(4, '0')}`;
  const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = () => `SUM-${Array.from({ length: 4 }, () => codeChars[Math.floor(rand() * codeChars.length)]).join('')}-${Array.from({ length: 4 }, () => codeChars[Math.floor(rand() * codeChars.length)]).join('')}`;

  const purchaseReasons: Record<string, string[]> = {
    'm-cafe': ['Desayuno en el local', 'Merienda', 'Café para llevar', 'Torta para cumpleaños', 'Almuerzo ejecutivo', 'Helado para llevar'],
    'm-pets': ['Alimento balanceado', 'Accesorios', 'Peluquería canina', 'Piedras sanitarias', 'Antipulgas y salud'],
    'm-tech': ['Insumos de impresión', 'Accesorios de celular', 'Servicio técnico', 'Periféricos', 'Almacenamiento'],
  };

  function addPurchase(merchantId: string, customerId: string, at: Date, amount: number, reason?: string) {
    const m = merchants.find((x) => x.id === merchantId)!;
    const points = Math.floor(amount / m.pesosPerPoint);
    if (points <= 0) return 0;
    const reasons = purchaseReasons[merchantId];
    const parent: Movement = {
      id: mid(),
      merchantId,
      customerId,
      type: 'purchase',
      points,
      amount,
      reason: reason ?? reasons[Math.floor(rand() * reasons.length)],
      createdAt: iso(at),
    };
    movements.push(parent);
    const applicable = promotions.filter((p) => p.merchantId === merchantId && promotionAppliesAt(p, at));
    if (applicable.length) {
      const best = applicable.reduce((a, b) => (b.bonusPercent > a.bonusPercent ? b : a));
      const bonus = promoBonus(points, best.bonusPercent);
      if (bonus > 0) {
        movements.push({ id: mid(), merchantId, customerId, type: 'promo_bonus', points: bonus, reason: best.name, promotionId: best.id, parentId: parent.id, createdAt: iso(new Date(at.getTime() + 1000)) });
        return points + bonus;
      }
    }
    return points;
  }

  function addRedemption(merchantId: string, customerId: string, rewardId: string, at: Date) {
    const r = rewards.find((x) => x.id === rewardId)!;
    const id = `red-s${redemptions.length + 1}`;
    const ageDays = (now.getTime() - at.getTime()) / DAY;
    redemptions.push({
      id,
      merchantId,
      customerId,
      rewardId,
      rewardName: r.name,
      rewardImage: r.image,
      cost: r.cost,
      code: code(),
      status: ageDays > 6 ? 'delivered' : 'pending',
      createdAt: iso(at),
      deliveredAt: ageDays > 6 ? iso(new Date(at.getTime() + 2 * 3600_000)) : undefined,
      requestId: `seed-${id}`,
    });
    movements.push({ id: mid(), merchantId, customerId, type: 'redeem', points: -r.cost, reason: r.name, redemptionId: id, createdAt: iso(at), requestId: `seed-${id}` });
    return r.cost;
  }

  // Cliente destacado: Sofía en Café Molienda termina con exactamente 580 puntos.
  // Compras en días que no coinciden con promociones (se verifica en los tests).
  const sofiaPlan: [number, number][] = [
    [152, 32000],
    [121, 45500],
    [96, 28000],
    [68, 39000],
    [44, 28500],
  ];
  const safeDay = (d: number) => {
    // Evita lunes y la "Semana de beneficios" para que los totales sean exactos.
    let day = d;
    while (daysAgo(day).getDay() === 1 || day <= 3) day += 1;
    return day;
  };
  for (const [d, amount] of sofiaPlan) addPurchase('m-cafe', 'c-sofia', daysAgo(safeDay(d), 9, 30), amount);
  addRedemption('m-cafe', 'c-sofia', 'rw-cafe-medialunas', daysAgo(safeDay(31), 10, 15));
  addPurchase('m-cafe', 'c-sofia', daysAgo(safeDay(11), 17, 10), 35000, 'Torta para cumpleaños');
  // 320 + 455 + 280 + 390 + 285 + 350 = 2080 ganados − 1500 canjeados = 580

  // Cliente con saldo alto: Martín en Café Molienda (nivel Oro).
  const martinPlan: [number, number][] = [
    [170, 120000],
    [140, 185000],
    [112, 96000],
    [83, 210000],
    [57, 150000],
    [26, 113000],
  ];
  for (const [d, amount] of martinPlan) addPurchase('m-cafe', 'c-martin', daysAgo(safeDay(d), 13, 0), amount, 'Catering para la oficina');
  addRedemption('m-cafe', 'c-martin', 'rw-cafe-vaso', daysAgo(safeDay(48), 11, 0));

  // Historial aleatorio (pero determinístico) para el resto de las membresías.
  const amountRanges: Record<string, [number, number]> = {
    'm-cafe': [2500, 22000],
    'm-pets': [6000, 58000],
    'm-tech': [12000, 260000],
  };
  const handCrafted = new Set(['m-cafe|c-sofia', 'm-cafe|c-martin']);
  for (const ms of memberships) {
    if (handCrafted.has(`${ms.merchantId}|${ms.customerId}`)) continue;
    const intensity = 0.25 + rand() * 1.1;
    const count = Math.max(2, Math.round(intensity * 12));
    const [min, max] = amountRanges[ms.merchantId];
    // Algunos clientes se "enfrían" (sin actividad reciente) para que existan inactivos.
    const lastDay = rand() < 0.22 ? 70 + Math.floor(rand() * 40) : 1 + Math.floor(rand() * 20);
    const days: number[] = [];
    for (let i = 0; i < count; i++) days.push(lastDay + Math.floor(rand() * (178 - lastDay)));
    days.sort((a, b) => b - a);
    days[days.length - 1] = lastDay;
    let balance = 0;
    for (const d of days) {
      const at = daysAgo(d, 8 + Math.floor(rand() * 12), Math.floor(rand() * 60));
      const amount = Math.round((min + rand() * (max - min)) / 50) * 50;
      balance += addPurchase(ms.merchantId, ms.customerId, at, amount);
      const options = rewards.filter((r) => r.merchantId === ms.merchantId && r.cost <= balance);
      if (options.length && rand() < 0.3) {
        const pick = options[Math.floor(rand() * options.length)];
        balance -= addRedemption(ms.merchantId, ms.customerId, pick.id, new Date(at.getTime() + 25 * 60_000));
      }
    }
  }

  // Referido histórico: Martín invitó a Bruno al café y recibió 100 puntos con su primera compra.
  const referrals: Referral[] = [];
  const brunoFirst = movements
    .filter((m) => m.merchantId === 'm-cafe' && m.customerId === 'c-bruno' && m.points > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (brunoFirst) {
    referrals.push({ id: 'ref-s1', merchantId: 'm-cafe', inviterId: 'c-martin', inviteeName: 'Bruno Acosta', inviteeId: 'c-bruno', status: 'rewarded', createdAt: iso(new Date(new Date(brunoFirst.createdAt).getTime() - 3 * DAY)), rewardedAt: brunoFirst.createdAt });
    movements.push({ id: mid(), merchantId: 'm-cafe', customerId: 'c-martin', type: 'referral_bonus', points: 100, reason: 'Invitaste a Bruno Acosta', createdAt: brunoFirst.createdAt });
  }

  /* ------------------------------- Desafíos ------------------------------- */
  const challenges: Challenge[] = [];
  for (const m of merchants) {
    const k = m.id.replace('m-', '');
    challenges.push(
      { id: `ch-${k}-compras`, merchantId: m.id, title: 'Realizá tres compras', description: `Comprá tres veces en ${m.name} y sumá puntos extra.`, goal: 3, rewardPoints: 150, icon: 'bag', kind: 'purchases' },
      { id: `ch-${k}-visitas`, merchantId: m.id, title: 'Visitá el negocio dos veces', description: 'Pasá por el local dos veces en el mes y mostrá tu código SUMMA.', goal: 2, rewardPoints: 80, icon: 'store', kind: 'visits' },
      { id: `ch-${k}-perfil`, merchantId: m.id, title: 'Completá tu perfil', description: 'Sumá tus datos para recibir beneficios personalizados.', goal: 1, rewardPoints: 50, icon: 'user', kind: 'profile' },
    );
  }
  const challengeProgress: ChallengeProgress[] = [
    { merchantId: 'm-cafe', customerId: 'c-sofia', challengeId: 'ch-cafe-compras', progress: 1 },
    { merchantId: 'm-pets', customerId: 'c-sofia', challengeId: 'ch-pets-visitas', progress: 1 },
  ];

  /* ------------------------- Eventos, encuestas y sorteos ------------------------- */
  const engagements: Engagement[] = [
    { id: 'en-cafe-cata', merchantId: 'm-cafe', kind: 'event', title: 'Cata de cafés de especialidad', description: 'Probá cuatro orígenes con nuestro barista y aprendé a distinguir notas y tuestes.', date: iso(daysAgo(-9, 18, 30)), place: 'Café Molienda · Palermo', rewardPoints: 100, capacity: 16 },
    { id: 'en-cafe-taller', merchantId: 'm-cafe', kind: 'event', title: 'Taller de latte art', description: 'Una hora para aprender corazones, tulipanes y rosetas. Incluye café ilimitado.', date: iso(daysAgo(-18, 11, 0)), place: 'Café Molienda · Palermo', rewardPoints: 80, capacity: 10 },
    { id: 'en-cafe-encuesta', merchantId: 'm-cafe', kind: 'survey', title: '¿Qué torta sumamos al menú?', description: 'Votá y ganá 30 puntos por participar.', date: iso(daysAgo(-12, 23, 59)), rewardPoints: 30, options: ['Carrot cake', 'Chocotorta', 'Cheesecake de frutos rojos', 'Rogel'] },
    { id: 'en-cafe-sorteo', merchantId: 'm-cafe', kind: 'raffle', title: 'Sorteo: un mes de café gratis', description: 'Participá sin costo. Sorteamos un café diario durante 30 días.', date: iso(daysAgo(-20, 20, 0)), rewardPoints: 0, prize: '30 cafés de especialidad' },
    { id: 'en-pets-adopcion', merchantId: 'm-pets', kind: 'event', title: 'Jornada de adopción responsable', description: 'Junto a refugios de la zona. Traé a tu mascota y sumá puntos.', date: iso(daysAgo(-6, 10, 0)), place: 'Patitas Pet Shop · Caballito', rewardPoints: 60, capacity: 40 },
    { id: 'en-pets-encuesta', merchantId: 'm-pets', kind: 'survey', title: '¿Qué servicio querés que sumemos?', description: 'Contanos y ganá 30 puntos.', date: iso(daysAgo(-15, 23, 59)), rewardPoints: 30, options: ['Guardería de día', 'Paseos grupales', 'Adiestramiento', 'Delivery de alimento'] },
    { id: 'en-pets-sorteo', merchantId: 'm-pets', kind: 'raffle', title: 'Sorteo: kit completo de bienvenida', description: 'Cama, comedero, correa y 3 kg de alimento para tu mascota.', date: iso(daysAgo(-11, 20, 0)), rewardPoints: 0, prize: 'Kit de bienvenida' },
    { id: 'en-tech-charla', merchantId: 'm-tech', kind: 'event', title: 'Charla: cuidá tu notebook', description: 'Consejos de mantenimiento, batería y limpieza con nuestro equipo técnico.', date: iso(daysAgo(-8, 19, 0)), place: 'Nodo Tecnología · Microcentro', rewardPoints: 70, capacity: 25 },
    { id: 'en-tech-encuesta', merchantId: 'm-tech', kind: 'survey', title: '¿Qué categoría ampliamos?', description: 'Tu voto suma 30 puntos.', date: iso(daysAgo(-10, 23, 59)), rewardPoints: 30, options: ['Gaming', 'Smart home', 'Audio', 'Fotografía'] },
    { id: 'en-tech-sorteo', merchantId: 'm-tech', kind: 'raffle', title: 'Sorteo: auriculares con cancelación de ruido', description: 'Participá gratis. El sorteo se hace en vivo en el local.', date: iso(daysAgo(-16, 20, 0)), rewardPoints: 0, prize: 'Auriculares over-ear' },
  ];
  const participations: Participation[] = [
    { id: 'pa-s1', merchantId: 'm-cafe', customerId: 'c-lucia', engagementId: 'en-cafe-cata', createdAt: iso(daysAgo(2)) },
    { id: 'pa-s2', merchantId: 'm-cafe', customerId: 'c-tomas', engagementId: 'en-cafe-cata', createdAt: iso(daysAgo(3)) },
    { id: 'pa-s3', merchantId: 'm-cafe', customerId: 'c-camila', engagementId: 'en-cafe-taller', createdAt: iso(daysAgo(1)) },
  ];

  /* ------------------------------- Campañas ------------------------------- */
  const campaigns: Campaign[] = [
    { id: 'cp-s1', merchantId: 'm-cafe', type: 'reactivation', name: 'Te extrañamos', message: '¡Hola! Hace rato no pasás por Café Molienda. Esta semana tu café suma 30% extra de puntos. ¡Te esperamos!', audienceSize: 3, status: 'simulated', createdAt: iso(daysAgo(20)) },
    { id: 'cp-s2', merchantId: 'm-pets', type: 'temporary_bonus', name: 'Sábados Patitas Felices', message: 'Este sábado sumás 25% extra en alimentos y accesorios. Tu mascota lo va a agradecer.', audienceSize: 9, status: 'simulated', createdAt: iso(daysAgo(12)) },
  ];

  return {
    version: SCHEMA_VERSION,
    seededAt: iso(now),
    merchants,
    customers,
    memberships,
    rewards,
    movements,
    redemptions,
    promotions,
    challenges,
    challengeProgress,
    referrals,
    engagements,
    participations,
    campaigns,
    favorites: { 'c-sofia': ['rw-cafe-tarta', 'rw-pets-alimento'], 'c-martin': ['rw-cafe-desayuno'] },
    session: { role: null, customerId: DEFAULT_CUSTOMER_ID, merchantId: DEFAULT_MERCHANT_ID, adminMerchantId: DEFAULT_MERCHANT_ID },
  };
}
