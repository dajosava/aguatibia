export interface SurfboardInventoryRow {
  id: string;
  /** Marca (visible en formulario junto al número) */
  brand: string;
  board_number: string;
  /** Notas solo para admin; no se muestra en el formulario público */
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type SurfboardInventoryInsert = Pick<
  SurfboardInventoryRow,
  'brand' | 'board_number' | 'description'
>;

export type SurfboardInventoryUpdate = Partial<
  Pick<SurfboardInventoryRow, 'brand' | 'board_number' | 'description'>
>;
