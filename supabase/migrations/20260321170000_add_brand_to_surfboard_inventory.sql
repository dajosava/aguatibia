/*
  Marca: visible en el formulario público junto al número.
  Descripción: notas internas solo para el panel admin.
*/

ALTER TABLE public.surfboard_inventory
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.surfboard_inventory.brand IS
  'Marca de la tabla; en el formulario público se muestra marca + número.';
COMMENT ON COLUMN public.surfboard_inventory.description IS
  'Notas internas solo para administración (no se muestra en el formulario público).';
