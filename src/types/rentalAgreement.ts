/** Estados de negocio del acuerdo en base de datos */
export type RentalAgreementStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/** Cambio de tabla registrado durante la vigencia del acuerdo */
export interface RentalBoardChangeHistoryRow {
  id: string;
  rental_agreement_id: string;
  previous_board_number: string;
  new_board_number: string;
  created_at: string;
}

/** Línea de producto de tienda ligada a un acuerdo */
export interface StoreItemRow {
  id: string;
  rental_agreement_id: string;
  product_name: string;
  unit_price: number;
  sort_order: number;
  created_at?: string;
}

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
  /** true si el cliente ya pagó al firmar; false si el pago queda pendiente */
  contract_paid?: boolean;
  signature_data: string | null;
  agreed_to_terms: boolean;
  status: RentalAgreementStatus | string;
  created_at: string;
}

/** Acuerdo con líneas de tienda (respuesta de select anidado) */
export interface RentalAgreementWithStoreItems extends RentalAgreementRow {
  rental_agreement_store_items?: StoreItemRow[] | null;
}

/** Payload de inserción desde el formulario público */
export type RentalAgreementInsert = Omit<RentalAgreementRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
