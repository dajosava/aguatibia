/** Estados operativos; solo `Disponible` aparece en el formulario público de renta. */
export const SURFBOARD_STATUS_VALUES = [
  'Disponible',
  'Rentada',
  'En mantenimiento',
  'Vendida',
] as const;

export type SurfboardStatus = (typeof SURFBOARD_STATUS_VALUES)[number];

export interface SurfboardInventoryRow {
  id: string;
  /** Marca (visible en formulario junto al número) */
  brand: string;
  board_number: string;
  /** Notas solo para admin; no se muestra en el formulario público */
  description: string | null;
  status: SurfboardStatus;
  created_at: string;
  updated_at: string;
}

export type SurfboardInventoryInsert = Pick<
  SurfboardInventoryRow,
  'brand' | 'board_number' | 'description'
> & { status?: SurfboardStatus };

export type SurfboardInventoryUpdate = Partial<
  Pick<SurfboardInventoryRow, 'brand' | 'board_number' | 'description' | 'status'>
>;
