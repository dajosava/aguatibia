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
  { id: 'regular_full_day', label: 'Regular Surfboard Full Day', price: 25, type: 'regular', duration: 'full_day' },
  { id: 'premium_full_day', label: 'Premium Surfboard Full Day', price: 30, type: 'premium', duration: 'full_day' },
  { id: 'bodyboard_extra', label: 'Bodyboard Extra Day', price: 10, type: 'bodyboard', duration: 'extra_day' },
  { id: 'regular_week', label: 'Regular Surfboard Week', price: 145, type: 'regular', duration: 'week' },
  { id: 'premium_week', label: 'Premium Surfboard Week', price: 180, type: 'premium', duration: 'week' },
];

export function getRentalPriceForSelection(rentalType: string, rentalDuration: string): number {
  const selected = RENTAL_OPTIONS.find(
    (opt) => opt.type === rentalType && opt.duration === rentalDuration
  );
  return selected?.price ?? 0;
}
