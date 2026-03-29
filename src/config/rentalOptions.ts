export interface RentalOption {
  id: string;
  label: string;
  price: number;
  type: string;
  duration: string;
}

/** Catálogo de opciones de renta (única fuente de verdad para UI y cálculo de precio en cliente) */
export const RENTAL_OPTIONS: RentalOption[] = [
  { id: 'surfboard_sesh', label: 'Surfboard Session (3hrs)', price: 15, type: 'surfboard', duration: 'sesh' },
  { id: 'boogie_sesh', label: 'Boogie Session (3hrs)', price: 10, type: 'boogie', duration: 'sesh' },
  { id: 'regular_full_day', label: 'Regular Surfboard Full Day', price: 25, type: 'regular', duration: 'full_day' },
  { id: 'premium_full_day', label: 'Premium Surfboard Full Day', price: 30, type: 'premium', duration: 'full_day' },
  { id: 'bodyboard_extra', label: 'Surfboard Regular Extra Day', price: 20, type: 'bodyboard', duration: 'extra_day' },
  { id: 'premium_extra_day', label: 'Premium Surfboard Extra Day', price: 25, type: 'premium', duration: 'extra_day' },
  { id: 'regular_week', label: 'Regular Surfboard Week', price: 145, type: 'regular', duration: 'week' },
  { id: 'premium_week', label: 'Premium Surfboard Week', price: 180, type: 'premium', duration: 'week' },
  /** Sin fecha de retorno en el formulario público; el personal la define en el panel admin. Tablas tier regular (surf). */
  { id: 'open_ended', label: 'Open-Ended Rental', price: 25, type: 'open_ended', duration: 'open_ended' },
];

/** Renta abierta: sin devolución programada en el formulario público. */
export function isOpenEndedRental(rentalType: string, rentalDuration: string): boolean {
  return rentalType === 'open_ended' && rentalDuration === 'open_ended';
}

export function getRentalPriceForSelection(rentalType: string, rentalDuration: string): number {
  const selected = RENTAL_OPTIONS.find(
    (opt) => opt.type === rentalType && opt.duration === rentalDuration
  );
  return selected?.price ?? 0;
}

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

/**
 * Duración del periodo de renta en ms (sesión 3 h, día 24 h, semana 7×24 h).
 * Valores alineados con las etiquetas del catálogo (p. ej. «3hrs», full day, week).
 */
export function getRentalDurationMs(duration: string): number {
  switch (duration) {
    case 'open_ended':
      return 0;
    case 'sesh':
      return 3 * MS_HOUR;
    case 'full_day':
    case 'extra_day':
      return MS_DAY;
    case 'week':
      return 7 * MS_DAY;
    default:
      return 0;
  }
}
