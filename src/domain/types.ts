/**
 * Modelo de dominio de SUMMA.
 * Toda entidad ligada a un comercio lleva `merchantId`: los puntos, premios,
 * movimientos y estadísticas nunca se comparten entre comercios.
 */

export type ID = string;
export type ISODate = string;

export type MerchantIconKey = 'coffee' | 'paw' | 'cpu' | 'store' | 'shirt' | 'book' | 'dumbbell' | 'pizza';

export interface Merchant {
  id: ID;
  name: string;
  category: string;
  description: string;
  icon: MerchantIconKey;
  /** Color secundario del comercio. Nunca reemplaza al lima de SUMMA. */
  accent: string;
  /** Pesos argentinos necesarios para sumar 1 punto (por defecto 100). */
  pesosPerPoint: number;
  promotionsEnabled: boolean;
  /** Beneficios editables por nivel (los umbrales son fijos). */
  tierBenefits: Record<TierId, string[]>;
  createdAt: ISODate;
}

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone: string;
  city: string;
  referralCode: string;
  profileCompleted: boolean;
  createdAt: ISODate;
}

/** Relación cliente ↔ comercio. El saldo se deriva de los movimientos. */
export interface Membership {
  merchantId: ID;
  customerId: ID;
  joinedAt: ISODate;
}

export interface Reward {
  id: ID;
  merchantId: ID;
  name: string;
  description: string;
  category: string;
  cost: number;
  /** Ruta local (/rewards/x.jpg) o URL https válida. Siempre con fallback. */
  image: string;
  active: boolean;
  /** null = stock ilimitado */
  stock: number | null;
  createdAt: ISODate;
}

export type MovementType =
  | 'purchase'
  | 'manual_credit'
  | 'adjust_add'
  | 'adjust_sub'
  | 'redeem'
  | 'promo_bonus'
  | 'challenge_bonus'
  | 'referral_bonus'
  | 'event_bonus';

export interface Movement {
  id: ID;
  merchantId: ID;
  customerId: ID;
  type: MovementType;
  /** Entero con signo: positivo suma, negativo resta. */
  points: number;
  reason: string;
  createdAt: ISODate;
  /** Monto de compra en ARS, si corresponde. */
  amount?: number;
  promotionId?: ID;
  redemptionId?: ID;
  /** Movimiento que originó este (ej: compra que generó una bonificación). */
  parentId?: ID;
  /** Clave de idempotencia para evitar operaciones duplicadas. */
  requestId?: string;
}

export type RedemptionStatus = 'pending' | 'delivered';

export interface Redemption {
  id: ID;
  merchantId: ID;
  customerId: ID;
  rewardId: ID;
  rewardName: string;
  rewardImage: string;
  cost: number;
  code: string;
  status: RedemptionStatus;
  createdAt: ISODate;
  deliveredAt?: ISODate;
  requestId: string;
}

export interface Promotion {
  id: ID;
  merchantId: ID;
  name: string;
  description: string;
  /** Texto legible: "Todos los lunes", "Sábados 16 a 19 h". */
  schedule: string;
  startsAt: ISODate;
  endsAt: ISODate;
  /** Porcentaje adicional sobre los puntos de compra (100 = doble). */
  bonusPercent: number;
  /** Días de la semana en que aplica (0 = domingo). null = todos los días. */
  weekdays: number[] | null;
  /** Franja horaria [desde, hasta) en horas. null = todo el día. */
  hours: [number, number] | null;
  active: boolean;
}

export interface Challenge {
  id: ID;
  merchantId: ID;
  title: string;
  description: string;
  goal: number;
  rewardPoints: number;
  icon: 'bag' | 'store' | 'user' | 'star' | 'gift';
  /** Cómo avanza: compras/visitas se simulan; el perfil se completa. */
  kind: 'purchases' | 'visits' | 'profile' | 'redeem';
}

export interface ChallengeProgress {
  merchantId: ID;
  customerId: ID;
  challengeId: ID;
  progress: number;
  claimedAt?: ISODate;
}

export type ReferralStatus = 'invited' | 'rewarded';

export interface Referral {
  id: ID;
  merchantId: ID;
  inviterId: ID;
  inviteeName: string;
  inviteeId?: ID;
  status: ReferralStatus;
  createdAt: ISODate;
  rewardedAt?: ISODate;
}

export type EngagementKind = 'event' | 'survey' | 'raffle';

export interface Engagement {
  id: ID;
  merchantId: ID;
  kind: EngagementKind;
  title: string;
  description: string;
  date: ISODate;
  place?: string;
  /** Puntos que otorga participar (encuestas/eventos). */
  rewardPoints: number;
  /** Para sorteos: premio. */
  prize?: string;
  /** Para encuestas: opciones. */
  options?: string[];
  capacity?: number;
}

export interface Participation {
  id: ID;
  merchantId: ID;
  customerId: ID;
  engagementId: ID;
  answer?: string;
  createdAt: ISODate;
}

export type CampaignType = 'reactivation' | 'temporary_bonus' | 'reward_promo' | 'balance_notice';

export interface Campaign {
  id: ID;
  merchantId: ID;
  type: CampaignType;
  name: string;
  message: string;
  audienceSize: number;
  status: 'draft' | 'simulated';
  createdAt: ISODate;
}

export type Role = 'customer' | 'admin';

export interface Session {
  role: Role | null;
  customerId: ID;
  /** Comercio activo de la vista cliente. */
  merchantId: ID;
  /** Comercio que administra la vista admin. */
  adminMerchantId: ID;
}

export type TierId = 'bronze' | 'silver' | 'gold';

export interface DemoState {
  version: number;
  seededAt: ISODate;
  merchants: Merchant[];
  customers: Customer[];
  memberships: Membership[];
  rewards: Reward[];
  movements: Movement[];
  redemptions: Redemption[];
  promotions: Promotion[];
  challenges: Challenge[];
  challengeProgress: ChallengeProgress[];
  referrals: Referral[];
  engagements: Engagement[];
  participations: Participation[];
  campaigns: Campaign[];
  /** customerId → rewardIds */
  favorites: Record<ID, ID[]>;
  session: Session;
}

export type Result<T> = { ok: true; state: DemoState; value: T } | { ok: false; error: string };
