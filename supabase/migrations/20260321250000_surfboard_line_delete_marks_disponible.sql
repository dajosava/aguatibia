/*
  Al quitar una fila de rental_agreement_surfboards, la tabla vuelve a Disponible en inventario.
*/

CREATE OR REPLACE FUNCTION public.mark_surfboard_disponible_on_surfboard_line_delete ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.surfboard_inventory
  SET
    status = 'Disponible',
    updated_at = now()
  WHERE
    trim(board_number) = trim(OLD.board_number);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_surfboard_disponible_on_surfboard_line_delete ON public.rental_agreement_surfboards;

CREATE TRIGGER trg_mark_surfboard_disponible_on_surfboard_line_delete
  AFTER DELETE ON public.rental_agreement_surfboards
  FOR EACH ROW
  EXECUTE PROCEDURE public.mark_surfboard_disponible_on_surfboard_line_delete ();

COMMENT ON FUNCTION public.mark_surfboard_disponible_on_surfboard_line_delete () IS
  'Tras DELETE de una línea de tabla del acuerdo, marca esa tabla como Disponible en inventario.';
