/*
  Varias tablas por contrato (familia, grupo).
  - Tabla hija rental_agreement_surfboards (board_number + sort_order).
  - rental_agreements.surfboard_number se mantiene como primera tabla (compatibilidad / búsquedas).
  - Backfill desde surfboard_number existente.
  - Trigger: cada fila insertada marca inventario Rentada.
  - checkout: libera todas las tablas del acuerdo.
  - rental_swap_surfboard: ahora (acuerdo, tabla_anterior, tabla_nueva).
*/

CREATE TABLE IF NOT EXISTS public.rental_agreement_surfboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  rental_agreement_id uuid NOT NULL REFERENCES public.rental_agreements (id) ON DELETE CASCADE,
  board_number text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_agreement_surfboards_board_nonempty CHECK (length(trim(board_number)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_agreement_surfboards_agreement_board ON public.rental_agreement_surfboards (
  rental_agreement_id,
  trim(lower(board_number))
);

CREATE INDEX IF NOT EXISTS idx_rental_agreement_surfboards_agreement ON public.rental_agreement_surfboards (rental_agreement_id, sort_order);

COMMENT ON TABLE public.rental_agreement_surfboards IS
  'Tablas asignadas a un mismo acuerdo de renta (varias por contrato).';

-- Backfill: una fila por acuerdo que ya tenía surfboard_number (idempotente)
INSERT INTO public.rental_agreement_surfboards (rental_agreement_id, board_number, sort_order)
SELECT
  ra.id,
  trim(ra.surfboard_number),
  0
FROM public.rental_agreements ra
WHERE
  ra.surfboard_number IS NOT NULL
  AND trim(ra.surfboard_number) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.rental_agreement_surfboards s
    WHERE
      s.rental_agreement_id = ra.id
      AND trim(lower(s.board_number)) = trim(lower(ra.surfboard_number))
  );

ALTER TABLE public.rental_agreement_surfboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert surfboards for rental agreements"
  ON public.rental_agreement_surfboards
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view rental agreement surfboards"
  ON public.rental_agreement_surfboards
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update rental agreement surfboards"
  ON public.rental_agreement_surfboards
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rental agreement surfboards"
  ON public.rental_agreement_surfboards
  FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.mark_surfboard_rented_on_surfboard_line ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.surfboard_inventory
  SET
    status = 'Rentada',
    updated_at = now()
  WHERE
    trim(board_number) = trim(NEW.board_number);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.mark_surfboard_rented_on_surfboard_line () IS
  'Tras INSERT de una línea de tabla en el acuerdo, marca esa tabla como Rentada en inventario.';

DROP TRIGGER IF EXISTS trg_mark_surfboard_rented_on_surfboard_line ON public.rental_agreement_surfboards;

CREATE TRIGGER trg_mark_surfboard_rented_on_surfboard_line
  AFTER INSERT ON public.rental_agreement_surfboards
  FOR EACH ROW
  EXECUTE PROCEDURE public.mark_surfboard_rented_on_surfboard_line ();

-- Check-out: todas las tablas → Disponible; contract_paid obligatorio
CREATE OR REPLACE FUNCTION public.rental_checkout_close (p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_paid boolean;
  r text;
BEGIN
  SELECT status, contract_paid INTO v_status, v_paid
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

  FOR r IN (
    SELECT
      trim(board_number) AS bn
    FROM
      public.rental_agreement_surfboards
    WHERE
      rental_agreement_id = p_agreement_id
  )
  LOOP
    IF r.bn IS NOT NULL AND r.bn <> '' THEN
      UPDATE public.surfboard_inventory
      SET
        status = 'Disponible',
        updated_at = now()
      WHERE
        trim(board_number) = r.bn;
    END IF;
  END LOOP;

  -- Legacy: acuerdos sin filas en la tabla hija
  IF NOT EXISTS (
    SELECT 1
    FROM public.rental_agreement_surfboards
    WHERE
      rental_agreement_id = p_agreement_id
  ) THEN
    UPDATE public.surfboard_inventory si
    SET
      status = 'Disponible',
      updated_at = now()
    FROM public.rental_agreements ra
    WHERE
      ra.id = p_agreement_id
      AND ra.surfboard_number IS NOT NULL
      AND trim(ra.surfboard_number) <> ''
      AND trim(si.board_number) = trim(ra.surfboard_number);
  END IF;

  UPDATE public.rental_agreements
  SET status = 'cerrado'
  WHERE id = p_agreement_id;
END;
$$;

COMMENT ON FUNCTION public.rental_checkout_close (uuid) IS
  'Check-out con pago OK: libera todas las tablas del acuerdo en inventario; acuerdo → cerrado.';

REVOKE ALL ON FUNCTION public.rental_checkout_close (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_checkout_close (uuid) TO authenticated;

-- Cambio de tabla: indica cuál de las asignadas se sustituye
CREATE OR REPLACE FUNCTION public.rental_swap_surfboard (
  p_agreement_id uuid,
  p_old_board_number text,
  p_new_board_number text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text := trim(p_old_board_number);
  v_new text := trim(p_new_board_number);
  v_status text;
  v_found boolean;
BEGIN
  IF v_new = '' THEN
    RAISE EXCEPTION 'Número de tabla nuevo inválido';
  END IF;

  IF v_old = '' THEN
    RAISE EXCEPTION 'Indica la tabla a sustituir';
  END IF;

  SELECT status INTO v_status
  FROM public.rental_agreements
  WHERE id = p_agreement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acuerdo no encontrado';
  END IF;

  IF v_status = 'cerrado' THEN
    RAISE EXCEPTION 'No se puede cambiar la tabla: el acuerdo está cerrado';
  END IF;

  IF v_old = v_new THEN
    RAISE EXCEPTION 'La nueva tabla debe ser distinta de la actual';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.rental_agreement_surfboards
    WHERE
      rental_agreement_id = p_agreement_id
      AND trim(lower(board_number)) = lower(v_new)
      AND trim(lower(board_number)) IS DISTINCT FROM lower(v_old)
  ) THEN
    RAISE EXCEPTION 'La nueva tabla ya está asignada a este acuerdo';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rental_agreement_surfboards
    WHERE
      rental_agreement_id = p_agreement_id
      AND trim(lower(board_number)) = lower(v_old)
  )
  INTO v_found;

  IF NOT v_found THEN
    -- Legacy: solo columna en rental_agreements
    IF (
      SELECT trim(coalesce(surfboard_number, ''))
      FROM public.rental_agreements
      WHERE
        id = p_agreement_id
    ) <> v_old THEN
      RAISE EXCEPTION 'Esa tabla no está asignada a este acuerdo';
    END IF;

    INSERT INTO public.rental_agreement_surfboards (rental_agreement_id, board_number, sort_order)
    VALUES (p_agreement_id, v_old, 0);
  END IF;

  UPDATE public.surfboard_inventory
  SET
    status = 'Disponible',
    updated_at = now()
  WHERE
    trim(board_number) = v_old;

  UPDATE public.surfboard_inventory
  SET
    status = 'Rentada',
    updated_at = now()
  WHERE
    trim(board_number) = v_new;

  INSERT INTO public.rental_board_change_history (
    rental_agreement_id,
    previous_board_number,
    new_board_number
  )
  VALUES (p_agreement_id, v_old, v_new);

  UPDATE public.rental_agreement_surfboards
  SET board_number = v_new
  WHERE
    rental_agreement_id = p_agreement_id
    AND trim(lower(board_number)) = lower(v_old);

  UPDATE public.rental_agreements
  SET
    surfboard_number = (
      SELECT
        board_number
      FROM
        public.rental_agreement_surfboards
      WHERE
        rental_agreement_id = p_agreement_id
      ORDER BY
        sort_order ASC,
        id ASC
      LIMIT 1
    )
  WHERE id = p_agreement_id;
END;
$$;

COMMENT ON FUNCTION public.rental_swap_surfboard (uuid, text, text) IS
  'Sustituye una tabla asignada por otra; inventario + historial; sincroniza surfboard_number.';

REVOKE ALL ON FUNCTION public.rental_swap_surfboard (uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rental_swap_surfboard (uuid, text, text) TO authenticated;

-- Eliminar firma antigua de dos argumentos (evitar ambigüedad)
DROP FUNCTION IF EXISTS public.rental_swap_surfboard (uuid, text);
