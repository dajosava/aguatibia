/*
  Inventario de tienda: stock por producto (store_products.stock_quantity).
  - Cada línea vendida en rental_agreement_store_items resta 1 unidad (mismo criterio name_key).
  - Al eliminar una línea del acuerdo, se repone 1 unidad.
  - Los valores pueden ser negativos si se vendió sin stock previo (producto creado solo por venta).
*/

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.store_products.stock_quantity IS
  'Unidades disponibles. Se decrementa al añadir línea de venta al acuerdo y se incrementa al quitarla o al ajustar en admin.';

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

  UPDATE public.store_products
  SET stock_quantity = stock_quantity - 1
  WHERE name_key = lower(trim(NEW.product_name));

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_store_stock_on_agreement_line_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.store_products
  SET stock_quantity = stock_quantity + 1
  WHERE name_key = lower(trim(OLD.product_name));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_store_stock_on_agreement_line_delete ON public.rental_agreement_store_items;

CREATE TRIGGER trg_restore_store_stock_on_agreement_line_delete
  AFTER DELETE ON public.rental_agreement_store_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.restore_store_stock_on_agreement_line_delete();
