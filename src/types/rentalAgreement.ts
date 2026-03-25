/** Estados de negocio del acuerdo en base de datos */
export type RentalAgreementStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  /** Check-out en panel admin: contrato finalizado y tabla liberada en inventario */
  | 'cerrado';

/** Cambio de tabla registrado durante la vigencia del acuerdo */
export interface RentalBoardChangeHistoryRow {
  id: string;
  rental_agreement_id: string;
  previous_board_number: string;
  new_board_number: string;
  created_at: string;
}

/** Tabla de surf asignada a un acuerdo (varias por contrato) */
export interface RentalAgreementSurfboardRow {
  id: string;
  rental_agreement_id: string;
  board_number: string;
  sort_order: number;
  created_at?: string;
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
  /** true cuando el personal registró el cobro desde el panel admin; el alta público deja false por defecto */
  contract_paid?: boolean;
  /** Comentarios o sugerencias del cliente (formulario público / edición admin) */
  customer_notes?: string | null;
  signature_data: string | null;
  agreed_to_terms: boolean;
  status: RentalAgreementStatus | string;
  created_at: string;
}

/** Acuerdo con líneas de tienda (respuesta de select anidado) */
export interface RentalAgreementWithStoreItems extends RentalAgreementRow {
  rental_agreement_store_items?: StoreItemRow[] | null;
  rental_agreement_surfboards?: RentalAgreementSurfboardRow[] | null;
}

/** Payload de inserción desde el formulario público */
export type RentalAgreementInsert = Omit<RentalAgreementRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
