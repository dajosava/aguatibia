/** Intervalo entre refrescos automáticos de datos en el panel admin (ms). */
export const ADMIN_AUTO_REFRESH_INTERVAL_MS = 60_000;

/**
 * Evento de documento: lo emite `AdminLayout` en cada intervalo.
 * Las pantallas admin pueden escucharlo para volver a cargar datos.
 */
export const ADMIN_AUTO_REFRESH_EVENT = 'aguatibia:admin-auto-refresh';
