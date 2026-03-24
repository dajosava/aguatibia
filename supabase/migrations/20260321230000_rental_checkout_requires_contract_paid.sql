/*
  Check-out solo si contract_paid es true (pago registrado).
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
  v_paid boolean;
BEGIN
  SELECT surfboard_number, status, contract_paid INTO v_board, v_status, v_paid
  FROM public.rental_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acuerdo no encontrado';
  END IF;

  IF v_status = 'cerrado' THEN
    RAISE EXCEPTION 'El acuerdo ya está cerrado';
  END IF;

  IF v_paid IS NOT TRUE THEN
    RAISE EXCEPTION 'No se puede cerrar el contrato: el pago está pendiente';
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
  'Check-out solo con contract_paid true; acuerdo → cerrado; tabla → Disponible.';

REVOKE ALL ON FUNCTION public.rental_checkout_close (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_checkout_close (uuid) TO authenticated;
