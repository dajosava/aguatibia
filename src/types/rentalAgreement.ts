/** Estados de negocio del acuerdo en base de datos */
export type RentalAgreementStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/** Fila tal como viene de Supabase */
export interface RentalAgreementRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  pickup: string | null;
  return_time: string | null;
  surfboard_number: string | null;
  board_checked_by: string | null;
  rental_type: string;
  rental_duration: string;
  rental_price: number;
  payment_method: string;
  signature_data: string | null;
  agreed_to_terms: boolean;
  status: RentalAgreementStatus | string;
  created_at: string;
}

/** Payload de inserción desde el formulario público */
export type RentalAgreementInsert = Omit<RentalAgreementRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
