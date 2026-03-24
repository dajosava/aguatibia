/*
  Catálogo de productos de tienda: se va poblando automáticamente cuando un contrato
  guarda líneas en rental_agreement_store_items (trigger).

  Requiere que ya exista la tabla rental_agreement_store_items (migración 20260207120000).

  - name_key: lower(trim(name)) para evitar duplicados por mayúsculas/espacios.
  - Si el producto ya existe, se actualiza unit_price y updated_at.

  Lectura pública (anon) para autocompletado. Escritura solo vía trigger (SECURITY DEFINER).
*/

CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_key text GENERATED ALWAYS AS (lower(trim(name))) STORED,
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_products_name_key_unique UNIQUE (name_key)
);

CREATE INDEX IF NOT EXISTS idx_store_products_name ON public.store_products (name);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read store catalog" ON public.store_products;

CREATE POLICY "Anyone can read store catalog"
  ON public.store_products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.sync_store_product_from_agreement_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_products (name, unit_price)
  VALUES (NEW.product_name, NEW.unit_price)
  ON CONFLICT ON CONSTRAINT store_products_name_key_unique
  DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_product ON public.rental_agreement_store_items;

CREATE TRIGGER trg_sync_store_product
  AFTER INSERT ON public.rental_agreement_store_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_store_product_from_agreement_line();
