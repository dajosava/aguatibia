/*
  Indica si el contrato fue pagado al firmar o si el pago queda pendiente (personal).
*/

ALTER TABLE public.rental_agreements
  ADD COLUMN IF NOT EXISTS contract_paid boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rental_agreements.contract_paid IS
  'true: cliente ya pagó al firmar; false: pago pendiente de cobrar/registrar.';
