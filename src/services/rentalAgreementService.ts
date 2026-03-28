import { supabase } from '../lib/supabase';
import type {
  RentalAgreementInsert,
  RentalAgreementWithStoreItems,
  RentalBoardChangeHistoryRow,
} from '../types/rentalAgreement';

export async function insertRentalAgreementWithStoreItems(
  row: RentalAgreementInsert,
  storeLines: { product_name: string; unit_price: number }[],
  surfboardNumbers: string[]
): Promise<void> {
  /** UUID generado aquí: tras RLS, anon ya no puede SELECT; .insert().select('id') devolvía 403. */
  const agreementId = row.id ?? crypto.randomUUID();
  const boards = surfboardNumbers.map((s) => s.trim()).filter((s) => s.length > 0);
  if (boards.length === 0) {
    throw new Error('Se requiere al menos una tabla');
  }
  const payload: RentalAgreementInsert = {
    ...row,
    id: agreementId,
    surfboard_number: boards[0],
  };

  const { error: errAgreement } = await supabase.from('rental_agreements').insert([payload]);

  if (errAgreement) throw errAgreement;

  const { error: errBoards } = await supabase.from('rental_agreement_surfboards').insert(
    boards.map((board_number, i) => ({
      rental_agreement_id: agreementId,
      board_number,
      sort_order: i,
    }))
  );
  if (errBoards) throw errBoards;

  if (storeLines.length === 0) return;

  const { error: errItems } = await supabase.from('rental_agreement_store_items').insert(
    storeLines.map((line, i) => ({
      rental_agreement_id: agreementId,
      product_name: line.product_name,
      unit_price: line.unit_price,
      sort_order: i,
    }))
  );

  if (errItems) throw errItems;
}

export async function fetchRentalAgreements(): Promise<RentalAgreementWithStoreItems[]> {
  const { data, error } = await supabase
    .from('rental_agreements')
    .select(
      `
      id,
      agreement_number,
      name,
      email,
      phone,
      address,
      pickup,
      return_time,
      surfboard_number,
      board_checked_by,
      rental_type,
      rental_duration,
      rental_price,
      rental_discount_percent,
      payment_method,
      contract_paid,
      customer_notes,
      signature_data,
      agreed_to_terms,
      status,
      created_at,
      rental_agreement_store_items (
        id,
        rental_agreement_id,
        product_name,
        unit_price,
        sort_order,
        created_at
      ),
      rental_agreement_surfboards (
        id,
        rental_agreement_id,
        board_number,
        sort_order,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RentalAgreementWithStoreItems[];
}

/**
 * Sincroniza las tablas del contrato con el inventario (INSERT→Rentada, DELETE→Disponible vía triggers).
 * Mantiene rental_agreements.surfboard_number = primera tabla.
 */
export async function syncRentalAgreementSurfboards(
  agreementId: string,
  orderedBoards: string[]
): Promise<void> {
  const normalized = orderedBoards.map((s) => s.trim()).filter((s) => s.length > 0);
  if (normalized.length === 0) {
    throw new Error('Debe quedar al menos una tabla en el contrato.');
  }
  const lowerSeen = new Set<string>();
  for (const n of normalized) {
    const lk = n.toLowerCase();
    if (lowerSeen.has(lk)) {
      throw new Error('No puedes repetir la misma tabla en el contrato.');
    }
    lowerSeen.add(lk);
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('rental_agreement_surfboards')
    .select('id, board_number')
    .eq('rental_agreement_id', agreementId);
  if (fetchErr) throw fetchErr;
  const rows = existing ?? [];

  const wantLower = new Set(normalized.map((n) => n.toLowerCase()));

  for (const r of rows) {
    const lk = r.board_number.trim().toLowerCase();
    if (!wantLower.has(lk)) {
      const { error: delErr } = await supabase.from('rental_agreement_surfboards').delete().eq('id', r.id);
      if (delErr) throw delErr;
    }
  }

  const { data: afterDel, error: fetch2 } = await supabase
    .from('rental_agreement_surfboards')
    .select('id, board_number')
    .eq('rental_agreement_id', agreementId);
  if (fetch2) throw fetch2;

  const byLower = new Map((afterDel ?? []).map((r) => [r.board_number.trim().toLowerCase(), r]));

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    const lk = n.toLowerCase();
    const row = byLower.get(lk);
    if (row) {
      const { error: upErr } = await supabase
        .from('rental_agreement_surfboards')
        .update({ sort_order: i, board_number: n })
        .eq('id', row.id);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase.from('rental_agreement_surfboards').insert({
        rental_agreement_id: agreementId,
        board_number: n,
        sort_order: i,
      });
      if (insErr) throw insErr;
    }
  }

  const { error: raErr } = await supabase
    .from('rental_agreements')
    .update({ surfboard_number: normalized[0] })
    .eq('id', agreementId);
  if (raErr) throw raErr;
}

export type RentalAgreementStoreLineInput = { product_name: string; unit_price: number };

/** Historial de cambios de tabla (orden: más reciente primero). */
export async function fetchBoardChangeHistory(agreementId: string): Promise<RentalBoardChangeHistoryRow[]> {
  const { data, error } = await supabase
    .from('rental_board_change_history')
    .select('id, rental_agreement_id, previous_board_number, new_board_number, created_at')
    .eq('rental_agreement_id', agreementId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RentalBoardChangeHistoryRow[];
}

/** Cambio de una tabla asignada por otra: historial + inventario (RPC SECURITY DEFINER). */
export async function swapRentalSurfboard(
  agreementId: string,
  oldBoardNumber: string,
  newBoardNumber: string
): Promise<void> {
  const { error } = await supabase.rpc('rental_swap_surfboard', {
    p_agreement_id: agreementId,
    p_old_board_number: oldBoardNumber.trim(),
    p_new_board_number: newBoardNumber.trim(),
  });
  if (error) throw error;
}

/**
 * Check-out sin RPC: misma regla de negocio que `public.rental_checkout_close`.
 * Evita 404 de PostgREST cuando la función existe en Postgres pero no está en la caché del API (PGRST202).
 * RLS: `authenticated` puede actualizar acuerdos e inventario.
 */
async function checkoutCloseRentalAgreementViaRest(agreementId: string): Promise<void> {
  const { data: agr, error: fetchErr } = await supabase
    .from('rental_agreements')
    .select('id, status, contract_paid, surfboard_number')
    .eq('id', agreementId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!agr) throw new Error('Acuerdo no encontrado');
  if (agr.status === 'cerrado') throw new Error('El acuerdo ya está cerrado');
  if (agr.contract_paid !== true) {
    throw new Error('No se puede cerrar el contrato: el pago está pendiente');
  }

  const { data: lines, error: linesErr } = await supabase
    .from('rental_agreement_surfboards')
    .select('board_number')
    .eq('rental_agreement_id', agreementId);

  if (linesErr) throw linesErr;

  const now = new Date().toISOString();

  const releaseBoard = async (raw: string) => {
    const bn = raw.trim();
    if (!bn) return;
    const { error } = await supabase
      .from('surfboard_inventory')
      .update({ status: 'Disponible', updated_at: now })
      .eq('board_number', bn);
    if (error) throw error;
  };

  if (lines && lines.length > 0) {
    for (const row of lines) {
      await releaseBoard(row.board_number);
    }
  } else {
    const legacy = agr.surfboard_number?.trim();
    if (legacy) await releaseBoard(legacy);
  }

  const { error: closeErr } = await supabase
    .from('rental_agreements')
    .update({ status: 'cerrado' })
    .eq('id', agreementId);

  if (closeErr) throw closeErr;
}

/** Check-out: acuerdo → cerrado; tablas → Disponible. Usa REST (misma lógica que la RPC) para evitar 404 de PostgREST si la RPC no está en la caché del API. */
export async function checkoutCloseRentalAgreement(agreementId: string): Promise<void> {
  await checkoutCloseRentalAgreementViaRest(agreementId);
}

/** Actualiza solo comentarios del cliente (útil con contrato cerrado, donde no aplica «Guardar cambios» completo). */
export async function updateRentalAgreementCustomerNotes(
  agreementId: string,
  customerNotes: string | null
): Promise<void> {
  const { error } = await supabase
    .from('rental_agreements')
    .update({ customer_notes: customerNotes })
    .eq('id', agreementId);
  if (error) throw error;
}

/** Estado de pago del contrato: solo desde el panel admin (detalle del acuerdo o modal de edición), no desde el formulario público. */
export async function updateRentalAgreementContractPaid(
  agreementId: string,
  contractPaid: boolean
): Promise<void> {
  const { error } = await supabase
    .from('rental_agreements')
    .update({ contract_paid: contractPaid })
    .eq('id', agreementId);
  if (error) throw error;
}

/** Actualiza acuerdo y sustituye por completo las líneas de tienda (mismo criterio de precio total que en el alta). */
export async function updateRentalAgreementWithStoreItems(
  agreementId: string,
  agreementPatch: {
    rental_price: number;
    rental_discount_percent: number;
    board_checked_by: string | null;
    pickup: string | null;
    return_time: string | null;
    customer_notes: string | null;
  },
  storeLines: RentalAgreementStoreLineInput[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from('rental_agreement_store_items')
    .delete()
    .eq('rental_agreement_id', agreementId);

  if (delErr) throw delErr;

  if (storeLines.length > 0) {
    const { error: insErr } = await supabase.from('rental_agreement_store_items').insert(
      storeLines.map((line, i) => ({
        rental_agreement_id: agreementId,
        product_name: line.product_name,
        unit_price: line.unit_price,
        sort_order: i,
      }))
    );
    if (insErr) throw insErr;
  }

  const { error: updErr } = await supabase
    .from('rental_agreements')
    .update({
      rental_price: agreementPatch.rental_price,
      rental_discount_percent: agreementPatch.rental_discount_percent,
      board_checked_by: agreementPatch.board_checked_by,
      pickup: agreementPatch.pickup,
      return_time: agreementPatch.return_time,
      customer_notes: agreementPatch.customer_notes,
    })
    .eq('id', agreementId);

  if (updErr) throw updErr;
}
