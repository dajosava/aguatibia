import { supabase } from '../lib/supabase';
import type {
  StoreProductInsert,
  StoreProductRow,
  StoreProductUpdate,
} from '../types/storeProduct';

const SELECT = 'id, name, unit_price, created_at, updated_at';

/** Catálogo para autocompletado (lectura pública con RLS). */
export async function fetchStoreProducts(): Promise<StoreProductRow[]> {
  const { data, error } = await supabase.from('store_products').select(SELECT).order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as StoreProductRow[];
}

/** Alta desde panel admin (sesión authenticated + RLS). */
export async function insertStoreProduct(row: StoreProductInsert): Promise<StoreProductRow> {
  const { data, error } = await supabase
    .from('store_products')
    .insert({
      name: row.name.trim(),
      unit_price: row.unit_price,
    })
    .select(SELECT)
    .single();

  if (error) throw error;
  return data as StoreProductRow;
}

export async function updateStoreProduct(id: string, patch: StoreProductUpdate): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.unit_price !== undefined) payload.unit_price = patch.unit_price;
  if (Object.keys(payload).length === 0) return;
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase.from('store_products').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteStoreProduct(id: string): Promise<void> {
  const { error } = await supabase.from('store_products').delete().eq('id', id);
  if (error) throw error;
}

