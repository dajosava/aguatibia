/*
  Precio de renta de referencia por artículo (artículos de playa / renta).
*/

ALTER TABLE public.rental_article_inventory
  ADD COLUMN IF NOT EXISTS unit_price decimal(10, 2) NOT NULL DEFAULT 0
    CONSTRAINT rental_article_unit_price_nonneg CHECK (unit_price >= 0);

COMMENT ON COLUMN public.rental_article_inventory.unit_price IS
  'Precio de renta del artículo en USD (referencia para el equipo / futuros contratos).';
