import type { RentalAgreementRow } from '../types/rentalAgreement';

/** Parsea pickup/return guardados como datetime-local (ISO sin Z). */
export function parseDateTimeMs(value: string | null): number | null {
  if (!value || !String(value).trim()) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return t;
}

/** @deprecated usar parseDateTimeMs */
export const parseReturnDateMs = parseDateTimeMs;

/**
 * Reserva por adelantado: la fecha/hora de inicio (pickup) aún no llegó.
 */
export function isPendingPickup(agreement: Pick<RentalAgreementRow, 'status' | 'pickup'>): boolean {
  if (agreement.status === 'cancelled' || agreement.status === 'cerrado') return false;
  const pickup = parseDateTimeMs(agreement.pickup);
  if (pickup === null) return false;
  return pickup > Date.now();
}

/**
 * Renta vigente: ya comenzó el periodo (pickup ya pasó o hoy) y la fecha de retorno no ha pasado.
 */
export function isRentalOngoing(
  agreement: Pick<RentalAgreementRow, 'status' | 'pickup' | 'return_time'>
): boolean {
  if (agreement.status === 'cancelled' || agreement.status === 'cerrado') return false;
  if (isPendingPickup(agreement)) return false;

  const ret = parseDateTimeMs(agreement.return_time);
  if (ret === null) return false;
  return ret >= Date.now();
}

export function isReturnInPast(agreement: Pick<RentalAgreementRow, 'status' | 'return_time' | 'pickup'>): boolean {
  if (agreement.status === 'cancelled' || agreement.status === 'cerrado') return false;
  const ret = parseDateTimeMs(agreement.return_time);
  if (ret === null) return false;
  return ret < Date.now();
}

export type StatusBadge = {
  label: string;
  colorClass: string;
};

const DB_LABEL_ES: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
  cerrado: 'Cerrado',
};

export function getAdminStatusBadge(agreement: RentalAgreementRow): StatusBadge {
  if (agreement.status === 'cerrado') {
    return {
      label: 'Cerrado',
      colorClass:
        'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-200',
    };
  }

  if (agreement.status === 'cancelled') {
    return {
      label: 'Cancelado',
      colorClass:
        'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    };
  }

  if (isPendingPickup(agreement)) {
    return {
      label: 'Pendiente de retirar',
      colorClass:
        'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
    };
  }

  if (isRentalOngoing(agreement)) {
    return {
      label: 'Activo',
      colorClass:
        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    };
  }

  if (isReturnInPast(agreement)) {
    return {
      label: 'Vencido',
      colorClass:
        'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
    };
  }

  const raw = agreement.status?.toLowerCase() ?? '';
  const label = DB_LABEL_ES[raw] ?? agreement.status;
  const colorClass = getDbStatusColor(raw);

  return { label, colorClass };
}

function getDbStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'cerrado':
      return 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
  }
}
