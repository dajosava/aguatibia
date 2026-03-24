import { supabase } from '../lib/supabase';
import type {
  RentalAgreementInsert,
  RentalAgreementWithStoreItems,
  RentalBoardChangeHistoryRow,
} from '../types/rentalAgreement';

export async function insertRentalAgreementWithStoreItems(
  row: RentalAgreementInsert,
  storeLines: { product_name: string; unit_price: number }[]
): Promise<void> {
  /** UUID generado aquí: tras RLS, anon ya no puede SELECT; .insert().select('id') devolvía 403. */
  const agreementId = row.id ?? crypto.randomUUID();
  const payload: RentalAgreementInsert = { ...row, id: agreementId };

  const { error: errAgreement } = await supabase.from('rental_agreements').insert([payload]);

  if (errAgreement) throw errAgreement;

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
      *,
      rental_agreement_store_items (
        id,
        rental_agreement_id,
        product_name,
        unit_price,
        sort_order,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RentalAgreementWithStoreItems[];
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

/** Cambio de tabla en mitad de la renta: historial + actualización del acuerdo (transacción en BD). */
export async function swapRentalSurfboard(agreementId: string, newBoardNumber: string): Promise<void> {
  const { error } = await supabase.rpc('rental_swap_surfboard', {
    p_agreement_id: agreementId,
    p_new_board_number: newBoardNumber.trim(),
  });
  if (error) throw error;
}

/** Check-out: acuerdo → cerrado; tabla del contrato → Disponible en inventario (RPC SECURITY DEFINER). */
export async function checkoutCloseRentalAgreement(agreementId: string): Promise<void> {
  const { error } = await supabase.rpc('rental_checkout_close', {
    p_agreement_id: agreementId,
  });
  if (error) throw error;
}

/** Actualiza acuerdo y sustituye por completo las líneas de tienda (mismo criterio de precio total que en el alta). La tabla se cambia solo con swapRentalSurfboard. */
export async function updateRentalAgreementWithStoreItems(
  agreementId: string,
  agreementPatch: {
    rental_price: number;
    contract_paid: boolean;
    board_checked_by: string | null;
    pickup: string | null;
    return_time: string | null;
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
      contract_paid: agreementPatch.contract_paid,
      board_checked_by: agreementPatch.board_checked_by,
      pickup: agreementPatch.pickup,
      return_time: agreementPatch.return_time,
    })
    .eq('id', agreementId);

  if (updErr) throw updErr;
}
