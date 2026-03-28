-- Tipo de equipo en inventario: tabla de surf vs boogie (renta Boogie Session en formulario público).

ALTER TABLE public.surfboard_inventory
ADD COLUMN IF NOT EXISTS equipment_kind text NOT NULL DEFAULT 'surfboard';

ALTER TABLE public.surfboard_inventory
DROP CONSTRAINT IF EXISTS surfboard_inventory_equipment_kind_check;

ALTER TABLE public.surfboard_inventory
ADD CONSTRAINT surfboard_inventory_equipment_kind_check CHECK (
  equipment_kind IN ('surfboard', 'boogie')
);

COMMENT ON COLUMN public.surfboard_inventory.equipment_kind IS
  'surfboard | boogie: en el formulario público, Boogie Session solo lista boogies; el resto solo tablas de surf.';
