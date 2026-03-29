import type { SurfboardInventoryRow } from '../types/surfboardInventory';

/**
 * En `rentalOptions.ts`, las rentas premium comparten `type: 'premium'`:
 * - premium_full_day (día completo premium)
 * - premium_extra_day (día extra premium)
 * - premium_week (semana premium)
 * Opción `type: 'boogie'` (Boogie Session): solo filas con `equipment_kind === 'boogie'`.
 * El resto de opciones: solo tablas de surf (`equipment_kind !== 'boogie'`) y según tier regular/premium.
 */
export function rentalTypeRequiresPremiumBoards(rentalType: string): boolean {
  return rentalType === 'premium';
}

/** Inventario elegible en el formulario público (excluye Rentada, mantenimiento, etc.). */
export function inventoryRowIsDisponible(row: SurfboardInventoryRow): boolean {
  return (row.status ?? 'Disponible') === 'Disponible';
}

/**
 * Formulario público de renta: solo filas Disponible que encajan con el tipo de renta (surf/boogie + tier).
 * No usar en validaciones de administración donde una tabla ya asignada puede seguir en Rentada.
 */
export function surfboardEligibleForPublicRental(row: SurfboardInventoryRow, rentalType: string): boolean {
  return inventoryRowIsDisponible(row) && surfboardMatchesRentalTier(row, rentalType);
}

export function surfboardMatchesRentalTier(row: SurfboardInventoryRow, rentalType: string): boolean {
  const kind = row.equipment_kind ?? 'surfboard';
  if (rentalType === 'boogie') {
    return kind === 'boogie';
  }
  if (kind === 'boogie') {
    return false;
  }
  const tier = row.board_tier ?? 'regular';
  if (rentalType === 'open_ended') {
    return tier === 'regular';
  }
  if (rentalTypeRequiresPremiumBoards(rentalType)) return tier === 'premium';
  return tier === 'regular';
}
