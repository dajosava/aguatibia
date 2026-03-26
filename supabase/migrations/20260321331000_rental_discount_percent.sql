/*
  Descuento % aplicado solo al subtotal de renta de tablas (panel admin).
  Valores permitidos: 0, 5, 10, 15, 20.
*/

ALTER TABLE public.rental_agreements
  ADD COLUMN IF NOT EXISTS rental_discount_percent integer NOT NULL DEFAULT 0;

ALTER TABLE public.rental_agreements
  DROP CONSTRAINT IF EXISTS rental_agreements_rental_discount_percent_check;

ALTER TABLE public.rental_agreements
  ADD CONSTRAINT rental_agreements_rental_discount_percent_check
  CHECK (rental_discount_percent IN (0, 5, 10, 15, 20));

COMMENT ON COLUMN public.rental_agreements.rental_discount_percent IS
  'Descuento % sobre el subtotal de renta de tablas; productos de tienda sin descuento.';
