/*
  Estado operativo de cada tabla en inventario.
  El formulario público (anon) solo debe ver tablas Disponible (RLS + filtro en cliente).
*/

ALTER TABLE public.surfboard_inventory
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Disponible';

ALTER TABLE public.surfboard_inventory
  DROP CONSTRAINT IF EXISTS surfboard_inventory_status_check;

ALTER TABLE public.surfboard_inventory
  ADD CONSTRAINT surfboard_inventory_status_check CHECK (
    status IN (
      'Disponible',
      'Rentada',
      'En mantenimiento',
      'Vendida'
    )
  );

COMMENT ON COLUMN public.surfboard_inventory.status IS
  'Disponible = elegible en formulario de renta; otros estados solo en panel admin.';

DROP POLICY IF EXISTS "Anyone can read surfboard inventory for rental form" ON public.surfboard_inventory;

CREATE POLICY "Anyone can read disponible surfboards for rental form"
  ON public.surfboard_inventory
  FOR SELECT
  TO anon
  USING (status = 'Disponible');
