import { supabase } from '../lib/supabase';
import type { SurfboardInventoryInsert, SurfboardInventoryRow, SurfboardInventoryUpdate } from '../types/surfboardInventory';

/** Listado para panel admin y formulario público (RLS: anon + authenticated SELECT). */
export async function fetchSurfboardInventory(): Promise<SurfboardInventoryRow[]> {
  const { data, error } = await supabase
    .from('surfboard_inventory')
    .select('id, board_number, description, created_at, updated_at')
    .order('board_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SurfboardInventoryRow[];
}

export async function insertSurfboard(row: SurfboardInventoryInsert): Promise<SurfboardInventoryRow> {
  const { data, error } = await supabase
    .from('surfboard_inventory')
    .insert({
      board_number: row.board_number.trim(),
      description: row.description?.trim() || null,
    })
    .select('id, board_number, description, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as SurfboardInventoryRow;
}

export async function updateSurfboard(id: string, patch: SurfboardInventoryUpdate): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.board_number !== undefined) payload.board_number = patch.board_number.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;

  const { error } = await supabase.from('surfboard_inventory').update(payload).eq('id', id);

  if (error) throw error;
}

export async function deleteSurfboard(id: string): Promise<void> {
  const { error } = await supabase.from('surfboard_inventory').delete().eq('id', id);

  if (error) throw error;
}
