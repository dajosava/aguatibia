/** Zona horaria para fechas de mareas en el encabezado (Costa Rica). */
export const TIDE_DISPLAY_TIMEZONE = 'America/Costa_Rica';

/** Coordenadas costeras por defecto (Guiones / Nosara). Sobreescribibles con VITE_TIDE_LAT / VITE_TIDE_LON. */
export function getTideCoordinates(): { lat: number; lon: number } {
  const rawLat = import.meta.env.VITE_TIDE_LAT as string | undefined;
  const rawLon = import.meta.env.VITE_TIDE_LON as string | undefined;
  const lat = rawLat != null && rawLat.trim() !== '' ? Number.parseFloat(rawLat) : 9.976;
  const lon = rawLon != null && rawLon.trim() !== '' ? Number.parseFloat(rawLon) : -85.653;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { lat: 9.976, lon: -85.653 };
  }
  return { lat, lon };
}

export function todayYyyyMmDdInTimezone(tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) {
    return new Date().toISOString().slice(0, 10);
  }
  return `${y}-${m}-${d}`;
}
