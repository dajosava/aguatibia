/*
  El formulario público de renta (rol anon) debe listar las tablas del inventario
  para el selector; solo lectura.
*/

CREATE POLICY "Anyone can read surfboard inventory for rental form"
  ON public.surfboard_inventory FOR SELECT TO anon USING (true);
