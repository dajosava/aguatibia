/** Fila del catálogo de productos de tienda (tabla store_products) */
export interface StoreProductRow {
  id: string;
  name: string;
  unit_price: number;
  created_at?: string;
  updated_at?: string;
}

export type StoreProductInsert = {
  name: string;
  unit_price: number;
};

export type StoreProductUpdate = {
  name?: string;
  unit_price?: number;
};
