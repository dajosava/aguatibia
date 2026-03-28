/** Estados operativos; solo `Disponible` aparece en el formulario público de renta. */
export const SURFBOARD_STATUS_VALUES = [
  'Disponible',
  'Rentada',
  'En mantenimiento',
  'Vendida',
] as const;

export type SurfboardStatus = (typeof SURFBOARD_STATUS_VALUES)[number];

/** Alineado con `rental_agreements.rental_type`: `premium` vs el resto (regular, surfboard, boogie, bodyboard). */
export const SURFBOARD_TIER_VALUES = ['regular', 'premium'] as const;

export type SurfboardTier = (typeof SURFBOARD_TIER_VALUES)[number];

export const SURFBOARD_EQUIPMENT_KIND_VALUES = ['surfboard', 'boogie'] as const;

export type EquipmentKind = (typeof SURFBOARD_EQUIPMENT_KIND_VALUES)[number];

export interface SurfboardInventoryRow {
  id: string;
  /** Marca (visible en formulario junto al número) */
  brand: string;
  board_number: string;
  /** Tabla de surf o boogie; alquiler «Boogie Session» solo lista boogies. */
  equipment_kind: EquipmentKind;
  /** Regular o premium: filtra el formulario público según la opción de renta elegida (solo tablas de surf). */
  board_tier: SurfboardTier;
  /** Notas solo para admin; no se muestra en el formulario público */
  description: string | null;
  status: SurfboardStatus;
  created_at: string;
  updated_at: string;
}

export type SurfboardInventoryInsert = Pick<
  SurfboardInventoryRow,
  'brand' | 'board_number' | 'description'
> & { status?: SurfboardStatus; board_tier?: SurfboardTier; equipment_kind?: EquipmentKind };

export type SurfboardInventoryUpdate = Partial<
  Pick<
    SurfboardInventoryRow,
    'brand' | 'board_number' | 'description' | 'status' | 'board_tier' | 'equipment_kind'
  >
>;
