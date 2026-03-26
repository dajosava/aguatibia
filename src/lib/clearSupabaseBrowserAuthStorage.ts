import { getSupabaseEnv } from './env';

/** Quita del localStorage las claves de sesión del cliente browser (`sb-<projectRef>-…`). */
export function clearSupabaseBrowserAuthStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const { url } = getSupabaseEnv();
    const ref = new URL(url).hostname.split('.')[0];
    const prefix = `sb-${ref}`;
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  } catch {
    /* URL / env inválidos: no romper signOut */
  }
}
