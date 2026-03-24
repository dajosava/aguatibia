/*
  Inventario de tablas de surf: número identificador + descripción libre.
  Solo personal autenticado (RLS).
*/

CREATE TABLE IF NOT EXISTS public.surfboard_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_number text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surfboard_inventory_board_number_key UNIQUE (board_number)
);

CREATE INDEX IF NOT EXISTS idx_surfboard_inventory_board_number
  ON public.surfboard_inventory (board_number);

ALTER TABLE public.surfboard_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read surfboard inventory"
  ON public.surfboard_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert surfboard inventory"
  ON public.surfboard_inventory FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update surfboard inventory"
  ON public.surfboard_inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff can delete surfboard inventory"
  ON public.surfboard_inventory FOR DELETE TO authenticated USING (true);
