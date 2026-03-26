/** Fila del catálogo de productos de tienda (tabla store_products) */
export interface StoreProductRow {
  id: string;
  name: string;
  unit_price: number;
  /** Unidades en inventario; las ventas en acuerdos restan 1 por línea. */
  stock_quantity: number;
  created_at?: string;
  updated_at?: string;
}

export type StoreProductInsert = {
  name: string;
  unit_price: number;
  /** Stock inicial al dar de alta en el panel (por defecto 0). */
  stock_quantity?: number;
};

export type StoreProductUpdate = {
  name?: string;
  unit_price?: number;
  stock_quantity?: number;
};
