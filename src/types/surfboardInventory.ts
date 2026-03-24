export interface SurfboardInventoryRow {
  id: string;
  board_number: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type SurfboardInventoryInsert = Pick<SurfboardInventoryRow, 'board_number' | 'description'>;

export type SurfboardInventoryUpdate = Partial<Pick<SurfboardInventoryRow, 'board_number' | 'description'>>;
