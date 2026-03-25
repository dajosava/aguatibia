/*
  Comentarios o sugerencias de clientes en el formulario público de renta.
  Visible en panel admin; editable en el modal de edición.
*/

ALTER TABLE public.rental_agreements
  ADD COLUMN IF NOT EXISTS customer_notes text;

COMMENT ON COLUMN public.rental_agreements.customer_notes IS
  'Texto libre del cliente (comentarios / sugerencias) desde el formulario público; el personal puede corregirlo al editar.';
