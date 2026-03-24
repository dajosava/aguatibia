/*
  Estado de acuerdo: cerrado (check-out). Libera la tabla en inventario (Disponible).
  rental_swap_surfboard no permite cambios si el acuerdo ya está cerrado.
*/

CREATE OR REPLACE FUNCTION public.rental_checkout_close (p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board text;
  v_status text;
BEGIN
  SELECT surfboard_number, status INTO v_board, v_status
  FROM public.rental_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acuerdo no encontrado';
  END IF;

  IF v_status = 'cerrado' THEN
    RAISE EXCEPTION 'El acuerdo ya está cerrado';
  END IF;

  IF v_board IS NOT NULL AND trim(v_board) <> '' THEN
    UPDATE public.surfboard_inventory
    SET
      status = 'Disponible',
      updated_at = now()
    WHERE trim(board_number) = trim(v_board);
  END IF;

  UPDATE public.rental_agreements
  SET status = 'cerrado'
  WHERE id = p_agreement_id;
END;
$$;

COMMENT ON FUNCTION public.rental_checkout_close (uuid) IS
  'Check-out: acuerdo → cerrado; tabla asignada → Disponible en inventario.';

REVOKE ALL ON FUNCTION public.rental_checkout_close (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_checkout_close (uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rental_swap_surfboard (p_agreement_id uuid, p_new_board_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
  v_status text;
  v_new text := trim(p_new_board_number);
BEGIN
  IF v_new = '' THEN
    RAISE EXCEPTION 'Número de tabla nuevo inválido';
  END IF;

  SELECT surfboard_number, status INTO v_old, v_status
  FROM public.rental_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acuerdo no encontrado';
  END IF;

  IF v_status = 'cerrado' THEN
    RAISE EXCEPTION 'No se puede cambiar la tabla: el acuerdo está cerrado';
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
  'Historial + inventario; rechazado si el acuerdo está cerrado.';

REVOKE ALL ON FUNCTION public.rental_swap_surfboard (uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_swap_surfboard (uuid, text) TO authenticated;
