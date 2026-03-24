import { supabase } from '../lib/supabase';
import type { StoreProductRow } from '../types/storeProduct';

/** Catálogo para autocompletado (lectura pública con RLS). */
export async function fetchStoreProducts(): Promise<StoreProductRow[]> {
  const { data, error } = await supabase
    .from('store_products')
    .select('id, name, unit_price, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as StoreProductRow[];
}
