import { useEffect, useRef } from 'react';
import { ADMIN_AUTO_REFRESH_EVENT } from '../config/adminAutoRefresh';

/**
 * Ejecuta `onTick` cada vez que el panel admin dispara el refresco automático (p. ej. cada minuto).
 */
export function useAdminAutoRefresh(onTick: () => void) {
  const ref = useRef(onTick);
  ref.current = onTick;

  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(ADMIN_AUTO_REFRESH_EVENT, handler);
    return () => window.removeEventListener(ADMIN_AUTO_REFRESH_EVENT, handler);
  }, []);
}
