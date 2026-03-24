import { supabase } from '../lib/supabase';
import type {
  RentalAgreementInsert,
  RentalAgreementWithStoreItems,
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
