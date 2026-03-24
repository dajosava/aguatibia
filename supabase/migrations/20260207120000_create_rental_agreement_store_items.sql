/*
  Líneas de productos de tienda asociadas a un acuerdo de renta.

  Por qué tabla nueva y no columnas en rental_agreements:
  - Cada contrato puede tener 0..N productos (nombre + precio).
  - Normalización: evita JSON opaco y facilita informes y futuras ediciones.
  - rental_agreements.rental_price almacena el TOTAL del contrato (renta + suma tienda).
*/

CREATE TABLE IF NOT EXISTS rental_agreement_store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_agreement_id uuid NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_agreement_store_items_agreement_id
  ON rental_agreement_store_items(rental_agreement_id);

ALTER TABLE rental_agreement_store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert store items for rental agreements"
  ON rental_agreement_store_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view store items"
  ON rental_agreement_store_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update store items"
  ON rental_agreement_store_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete store items"
  ON rental_agreement_store_items
  FOR DELETE
  TO authenticated
  USING (true);
