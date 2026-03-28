-- Tipo de tabla en inventario: regular vs premium (alineado con rental_agreements.rental_type premium / resto).

ALTER TABLE public.surfboard_inventory
  ADD COLUMN IF NOT EXISTS board_tier TEXT NOT NULL DEFAULT 'regular';

ALTER TABLE public.surfboard_inventory
  DROP CONSTRAINT IF EXISTS surfboard_inventory_board_tier_check;

ALTER TABLE public.surfboard_inventory
  ADD CONSTRAINT surfboard_inventory_board_tier_check CHECK (
    board_tier IN ('regular', 'premium')
  );

COMMENT ON COLUMN public.surfboard_inventory.board_tier IS
  'regular: inventario para opciones de renta no premium. premium: solo para acuerdos con rental_type=premium '
  '(ej. Premium Surfboard Full Day, Premium Extra Day, Premium Week en catálogo UI).';
