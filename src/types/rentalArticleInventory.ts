export interface RentalArticleInventoryRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  stock_quantity: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RentalArticleInventoryInsert = Pick<RentalArticleInventoryRow, 'name'> & {
  category?: string | null;
  description?: string | null;
  stock_quantity?: number;
  sort_order?: number;
};

export type RentalArticleInventoryUpdate = Partial<
  Pick<RentalArticleInventoryRow, 'name' | 'category' | 'description' | 'stock_quantity' | 'sort_order'>
>;
