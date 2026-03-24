/*
  INSERT del formulario público debe aplicar a anon y a authenticated.

  Motivos:
  - Staff con sesión Supabase activa envía como authenticated; la política solo anon → 403.
  - Coherencia con líneas de tienda (mismo criterio).

  El SELECT restringido a authenticated no afecta al INSERT.
*/

DROP POLICY IF EXISTS "Anyone can submit rental agreements" ON public.rental_agreements;

CREATE POLICY "Anyone can submit rental agreements"
  ON public.rental_agreements
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert store items for rental agreements" ON public.rental_agreement_store_items;

CREATE POLICY "Anyone can insert store items for rental agreements"
  ON public.rental_agreement_store_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
