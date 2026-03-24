/*
  Historial de cambios de tabla dentro de un mismo acuerdo de renta.
  El intercambio atómico (registro + actualización de surfboard_number) se hace con rental_swap_surfboard.
*/

CREATE TABLE IF NOT EXISTS public.rental_board_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_agreement_id uuid NOT NULL REFERENCES public.rental_agreements (id) ON DELETE CASCADE,
  previous_board_number text NOT NULL,
  new_board_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_board_change_diff CHECK (
    trim(previous_board_number) IS DISTINCT FROM trim(new_board_number)
  ),
  CONSTRAINT rental_board_change_new_nonempty CHECK (length(trim(new_board_number)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rental_board_change_agreement
  ON public.rental_board_change_history (rental_agreement_id, created_at DESC);

COMMENT ON TABLE public.rental_board_change_history IS
  'Registro de sustituciones de tabla (nº) durante la vigencia del acuerdo; la anterior queda libre para otra renta.';

ALTER TABLE public.rental_board_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read board change history"
  ON public.rental_board_change_history
  FOR SELECT
  TO authenticated
  USING (true);

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
  'Registra el cambio de tabla en el historial y actualiza rental_agreements.surfboard_number en una sola transacción.';

REVOKE ALL ON FUNCTION public.rental_swap_surfboard (uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_swap_surfboard (uuid, text) TO authenticated;
