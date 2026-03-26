/*
  Número de formulario consecutivo (1, 2, 3…) para acuerdos de renta.
  - Los existentes se numeran por orden de created_at (el más antiguo = 1).
  - Nuevos INSERT toman el siguiente valor de secuencia (anon y staff sin enviar la columna).
*/

ALTER TABLE public.rental_agreements
  ADD COLUMN IF NOT EXISTS agreement_number integer;

UPDATE public.rental_agreements r
SET agreement_number = numbered.n
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS n
  FROM public.rental_agreements
) AS numbered
WHERE r.id = numbered.id;

CREATE SEQUENCE IF NOT EXISTS public.rental_agreement_number_seq;

GRANT USAGE, SELECT ON SEQUENCE public.rental_agreement_number_seq TO anon, authenticated;

DO $$
DECLARE
  max_n integer;
  row_count bigint;
BEGIN
  SELECT COUNT(*), COALESCE(MAX(agreement_number), 0)
  INTO row_count, max_n
  FROM public.rental_agreements;

  IF row_count = 0 THEN
    PERFORM setval('public.rental_agreement_number_seq', 1, false);
  ELSE
    PERFORM setval('public.rental_agreement_number_seq', max_n, true);
  END IF;
END $$;

ALTER TABLE public.rental_agreements
  ALTER COLUMN agreement_number SET DEFAULT nextval('public.rental_agreement_number_seq');

ALTER SEQUENCE public.rental_agreement_number_seq OWNED BY public.rental_agreements.agreement_number;

ALTER TABLE public.rental_agreements
  ALTER COLUMN agreement_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_agreements_agreement_number
  ON public.rental_agreements (agreement_number);

COMMENT ON COLUMN public.rental_agreements.agreement_number IS
  'Número consecutivo del formulario de renta (visible en admin).';
