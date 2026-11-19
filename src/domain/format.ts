const pointsFmt = new Intl.NumberFormat('es-AR');
const moneyFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'short' });

export const fmtPoints = (n: number) => pointsFmt.format(n);
export const fmtMoney = (n: number) => moneyFmt.format(n);
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso)).replace('.', '');
export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso)).replace('.', '');
export const fmtMonth = (d: Date) => {
  const m = monthFmt.format(d).replace('.', '');
  return m.charAt(0).toUpperCase() + m.slice(1);
};
export const fmtSigned = (n: number) => (n > 0 ? `+${fmtPoints(n)}` : `−${fmtPoints(Math.abs(n))}`);

export function relativeDays(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
