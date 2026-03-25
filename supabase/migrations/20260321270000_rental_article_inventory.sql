/*
  Inventario de artículos de playa / renta que no son tablas (toldos, sillas, sombrillas, etc.).
  CRUD desde panel admin; de momento sin enlace al contrato de renta en el formulario público.
*/

CREATE TABLE IF NOT EXISTS public.rental_article_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  stock_quantity integer NOT NULL DEFAULT 1
    CONSTRAINT rental_article_stock_nonneg CHECK (stock_quantity >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_article_inventory_category ON public.rental_article_inventory (category);
CREATE INDEX IF NOT EXISTS idx_rental_article_inventory_sort ON public.rental_article_inventory (sort_order, name);

COMMENT ON TABLE public.rental_article_inventory IS
  'Artículos reutilizables para renta (sombrilla, silla, toldo); no son tablas de surf.';

ALTER TABLE public.rental_article_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read rental article inventory"
  ON public.rental_article_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert rental article inventory"
  ON public.rental_article_inventory FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update rental article inventory"
  ON public.rental_article_inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff can delete rental article inventory"
  ON public.rental_article_inventory FOR DELETE TO authenticated USING (true);
