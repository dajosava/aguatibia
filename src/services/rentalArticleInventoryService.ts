import { supabase } from '../lib/supabase';
import type {
  RentalArticleInventoryInsert,
  RentalArticleInventoryRow,
  RentalArticleInventoryUpdate,
} from '../types/rentalArticleInventory';

const SELECT =
  'id, name, category, description, unit_price, stock_quantity, sort_order, created_at, updated_at';

export async function fetchRentalArticleInventory(): Promise<RentalArticleInventoryRow[]> {
  const { data, error } = await supabase
    .from('rental_article_inventory')
    .select(SELECT)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as RentalArticleInventoryRow[];
}

export async function insertRentalArticle(row: RentalArticleInventoryInsert): Promise<RentalArticleInventoryRow> {
  const stock = Math.max(0, Math.floor(row.stock_quantity ?? 1));
  const price =
    row.unit_price != null && Number.isFinite(row.unit_price)
      ? Math.max(0, Math.round(Number(row.unit_price) * 100) / 100)
      : 0;
  const { data, error } = await supabase
    .from('rental_article_inventory')
    .insert({
      name: row.name.trim(),
      category: row.category?.trim() || null,
      description: row.description?.trim() || null,
      unit_price: price,
      stock_quantity: stock,
    })
    .select(SELECT)
    .single();

  if (error) throw error;
  return data as RentalArticleInventoryRow;
}

export async function updateRentalArticle(id: string, patch: RentalArticleInventoryUpdate): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.category !== undefined) payload.category = patch.category?.trim() || null;
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.unit_price !== undefined) {
    const p = Number(patch.unit_price);
    payload.unit_price = Number.isFinite(p) ? Math.max(0, Math.round(p * 100) / 100) : 0;
  }
  if (patch.stock_quantity !== undefined) {
    payload.stock_quantity = Math.max(0, Math.floor(patch.stock_quantity));
  }

  const { error } = await supabase.from('rental_article_inventory').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteRentalArticle(id: string): Promise<void> {
  const { error } = await supabase.from('rental_article_inventory').delete().eq('id', id);
  if (error) throw error;
}
