/*
  1) INSERT rental_agreements → trigger marca esa board_number como Rentada en surfboard_inventory.

  2) rental_swap_surfboard (cambio de tabla en un acuerdo ya existente):
     - tabla anterior del contrato → Disponible en inventario
     - tabla nueva asignada → Rentada
     Luego historial + actualización del acuerdo.

  El anon no puede UPDATE inventario; todo va en funciones SECURITY DEFINER.
*/

CREATE OR REPLACE FUNCTION public.mark_surfboard_rented_on_agreement_insert ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.surfboard_number IS NOT NULL AND trim(NEW.surfboard_number) <> '' THEN
    UPDATE public.surfboard_inventory
    SET
      status = 'Rentada',
      updated_at = now()
    WHERE trim(board_number) = trim(NEW.surfboard_number);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.mark_surfboard_rented_on_agreement_insert () IS
  'Tras INSERT en rental_agreements, marca la fila de inventario con ese board_number como Rentada.';

DROP TRIGGER IF EXISTS trg_mark_surfboard_rented_on_rental_insert ON public.rental_agreements;

CREATE TRIGGER trg_mark_surfboard_rented_on_rental_insert
  AFTER INSERT ON public.rental_agreements
  FOR EACH ROW
  EXECUTE PROCEDURE public.mark_surfboard_rented_on_agreement_insert();

CREATE OR REPLACE FUNCTION public.rental_swap_surfboard (p_agreement_id uuid, p_new_board_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
  v_new text := trim(p_new_board_number);
BEGIN
  IF v_new = '' THEN
    RAISE EXCEPTION 'Número de tabla nuevo inválido';
  END IF;

  SELECT surfboard_number INTO v_old
  FROM public.rental_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acuerdo no encontrado';
  END IF;

  IF v_old IS NOT NULL AND trim(v_old) = v_new THEN
    RAISE EXCEPTION 'La nueva tabla debe ser distinta de la actual';
  END IF;

  IF v_old IS NOT NULL AND trim(v_old) <> '' THEN
    UPDATE public.surfboard_inventory
    SET
      status = 'Disponible',
      updated_at = now()
    WHERE trim(board_number) = trim(v_old);
  END IF;

  UPDATE public.surfboard_inventory
  SET
    status = 'Rentada',
    updated_at = now()
  WHERE trim(board_number) = v_new;

  INSERT INTO public.rental_board_change_history (
    rental_agreement_id,
    previous_board_number,
    new_board_number
  )
  VALUES (
    p_agreement_id,
    coalesce(trim(v_old), ''),
    v_new
  );

  UPDATE public.rental_agreements
  SET surfboard_number = v_new
  WHERE id = p_agreement_id;
END;
$$;

COMMENT ON FUNCTION public.rental_swap_surfboard (uuid, text) IS
  'Historial + inventario (liberar tabla anterior, marcar nueva Rentada) + actualización del acuerdo.';
