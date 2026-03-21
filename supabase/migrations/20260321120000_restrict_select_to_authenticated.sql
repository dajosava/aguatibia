/*
  Producción: revierte el acceso de lectura anónimo a rental_agreements.

  Contexto: la migración 20251125223930 abría SELECT a anon para pruebas, lo que
  exponía datos personales y firmas a cualquiera con la URL y la anon key.

  Tras esta migración:
  - INSERT sigue permitido para anon (formulario público).
  - SELECT solo para usuarios autenticados (panel tras login con Supabase Auth).
  - UPDATE solo para authenticated (política existente).

  Requisito: crear usuarios staff en Supabase Auth y usar login en la app.
*/

DROP POLICY IF EXISTS "Anyone can view rental agreements" ON rental_agreements;

CREATE POLICY "Authenticated users can view all agreements"
  ON rental_agreements
  FOR SELECT
  TO authenticated
  USING (true);
