import { supabase } from '../lib/supabase';
import type { RentalAgreementInsert, RentalAgreementRow } from '../types/rentalAgreement';

export async function insertRentalAgreement(row: RentalAgreementInsert): Promise<void> {
  const { error } = await supabase.from('rental_agreements').insert([row]);
  if (error) throw error;
}

export async function fetchRentalAgreements(): Promise<RentalAgreementRow[]> {
  const { data, error } = await supabase
    .from('rental_agreements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RentalAgreementRow[];
}
