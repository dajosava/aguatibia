/** Costa Rica sin DST (UTC−06:00). Se usa para interpretar `datetime-local` como hora local de CR. */
const CR_UTC_OFFSET_HOURS = 6;

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** Instante UTC (ms) a partir de componentes calendario/reloj en Costa Rica. */
function crLocalToUtcMs(y: number, mo: number, d: number, h: number, mi: number): number {
  return Date.UTC(y, mo - 1, d, h + CR_UTC_OFFSET_HOURS, mi, 0, 0);
}

/**
 * Cadena `YYYY-MM-DDTHH:mm` (formato input datetime-local) interpretada como hora en Costa Rica.
 */
export function parseDatetimeLocalAsCostaRicaMs(value: string): number | null {
  const m = DATETIME_LOCAL_RE.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return null;
  return crLocalToUtcMs(y, mo, d, h, mi);
}

/** Formatea un instante para `<input type="datetime-local">` mostrando calendario/reloj en Costa Rica. */
export function formatDatetimeLocalCostaRica(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const g = (type: Intl.DateTimeFormatPart['type']) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const year = g('year');
  const month = g('month');
  const day = g('day');
  const hour = g('hour');
  const minute = g('minute');
  if (!year || !month || !day || hour === '' || minute === '') {
    return '';
  }
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
