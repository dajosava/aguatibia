/*
  Permitir al personal (authenticated) gestionar el catálogo store_products desde el panel.
  La lectura pública (anon) ya existía; el alta solo por trigger queda ampliado con CRUD manual.
*/

CREATE POLICY "Staff can insert store products"
  ON public.store_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update store products"
  ON public.store_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can delete store products"
  ON public.store_products
  FOR DELETE
  TO authenticated
  USING (true);
