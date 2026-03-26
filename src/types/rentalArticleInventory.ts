export interface RentalArticleInventoryRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  /** Precio de renta en USD (referencia). */
  unit_price: number;
  stock_quantity: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RentalArticleInventoryInsert = Pick<RentalArticleInventoryRow, 'name'> & {
  category?: string | null;
  description?: string | null;
  unit_price?: number;
  stock_quantity?: number;
};

export type RentalArticleInventoryUpdate = Partial<
  Pick<RentalArticleInventoryRow, 'name' | 'category' | 'description' | 'unit_price' | 'stock_quantity'>
>;
