/**
 * Variables de entorno obligatorias para el cliente Supabase.
 * Falla en arranque con mensaje claro si faltan (mejor que errores opacos en runtime).
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url?.trim() || !anonKey?.trim()) {
    throw new Error(
      'Configuración incompleta: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env'
    );
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}
