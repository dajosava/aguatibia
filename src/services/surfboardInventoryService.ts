import { supabase } from '../lib/supabase';
import type { SurfboardInventoryInsert, SurfboardInventoryRow, SurfboardInventoryUpdate } from '../types/surfboardInventory';

const SELECT =
  'id, brand, board_number, description, status, created_at, updated_at';

/** Listado completo para panel admin (authenticated). */
export async function fetchSurfboardInventory(): Promise<SurfboardInventoryRow[]> {
  const { data, error } = await supabase
    .from('surfboard_inventory')
    .select(SELECT)
    .order('brand', { ascending: true })
    .order('board_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SurfboardInventoryRow[];
}

/** Solo tablas disponibles para el formulario público y el cambio de tabla en admin (anon o filtro explícito). */
export async function fetchSurfboardInventoryForRental(): Promise<SurfboardInventoryRow[]> {
  const { data, error } = await supabase
    .from('surfboard_inventory')
    .select(SELECT)
    .eq('status', 'Disponible')
    .order('brand', { ascending: true })
    .order('board_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SurfboardInventoryRow[];
}

export async function insertSurfboard(row: SurfboardInventoryInsert): Promise<SurfboardInventoryRow> {
  const { data, error } = await supabase
    .from('surfboard_inventory')
    .insert({
      brand: row.brand.trim(),
      board_number: row.board_number.trim(),
      description: row.description?.trim() || null,
      status: row.status ?? 'Disponible',
    })
    .select(SELECT)
    .single();

  if (error) throw error;
  return data as SurfboardInventoryRow;
}

export async function updateSurfboard(id: string, patch: SurfboardInventoryUpdate): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.brand !== undefined) payload.brand = patch.brand.trim();
  if (patch.board_number !== undefined) payload.board_number = patch.board_number.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.status !== undefined) payload.status = patch.status;

  const { error } = await supabase.from('surfboard_inventory').update(payload).eq('id', id);

  if (error) throw error;
}

export async function deleteSurfboard(id: string): Promise<void> {
  const { error } = await supabase.from('surfboard_inventory').delete().eq('id', id);

  if (error) throw error;
}
