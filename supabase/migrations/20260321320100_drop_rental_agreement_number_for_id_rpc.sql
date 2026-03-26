/*
  Elimina la RPC que solo servía para mostrar agreement_number al cliente.
  agreement_number sigue existiendo en la tabla para uso interno / panel admin.
*/

DROP FUNCTION IF EXISTS public.rental_agreement_number_for_id(uuid);
