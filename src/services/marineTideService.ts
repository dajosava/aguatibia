import { getTideCoordinates, TIDE_DISPLAY_TIMEZONE, todayYyyyMmDdInTimezone } from '../lib/tideConfig';

export type TideDaySummary = {
  trendLabel: string;
  detailLine: string;
};

type MarineHourly = {
  time: string[];
  sea_level_height_msl: (number | null)[];
};

type MarineApiResponse = {
  hourly?: MarineHourly;
  error?: boolean;
  reason?: string;
};

/** Hora local Costa Rica comparable con cadenas ISO del API (`2026-03-21T14:30`). */
function currentComparableDateTime(): string {
  const tz = TIDE_DISPLAY_TIMEZONE;
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hh = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') ?? '00';
  return `${dateStr}T${hh}:${mm}`;
}

function formatClockFromApi(apiTime: string): string {
  const m = apiTime.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : apiTime;
}

function hourlyTrend(values: number[], i: number): 'rising' | 'falling' | 'steady' {
  if (i < 0 || i >= values.length - 1) return 'steady';
  const a = values[i];
  const b = values[i + 1];
  if (!Number.isFinite(a!) || !Number.isFinite(b!)) return 'steady';
  const d = b! - a!;
  if (d > 0.002) return 'rising';
  if (d < -0.002) return 'falling';
  return 'steady';
}

/**
 * Nivel del mar con mareas (modelo numérico Open-Meteo). Uso informativo, no navegación.
 */
export async function fetchTodayTideSummary(): Promise<TideDaySummary> {
  const { lat, lon } = getTideCoordinates();
  const day = todayYyyyMmDdInTimezone(TIDE_DISPLAY_TIMEZONE);

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'sea_level_height_msl',
    timezone: TIDE_DISPLAY_TIMEZONE,
    start_date: day,
    end_date: day,
    cell_selection: 'sea',
    length_unit: 'metric',
  });

  const url = `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Tides: HTTP ${res.status}`);
  }

  const data = (await res.json()) as MarineApiResponse;
  if (data.error) {
    throw new Error(data.reason ?? 'Tides: invalid API response');
  }

  const hourly = data.hourly;
  if (!hourly?.time?.length || !hourly.sea_level_height_msl?.length) {
    throw new Error('tides: no hourly data');
  }

  const times = hourly.time;
  const raw = hourly.sea_level_height_msl;
  const values: number[] = raw.map((v) =>
    v != null && Number.isFinite(v) ? v : NaN
  );

  const validIdx = values.map((v, i) => (Number.isFinite(v) ? i : -1)).filter((i) => i >= 0);
  if (validIdx.length < 3) {
    throw new Error('tides: insufficient data');
  }

  const firstValid = validIdx[0]!;
  const lastValid = validIdx[validIdx.length - 1]!;

  const nowCmp = currentComparableDateTime();
  let currentIdx = firstValid;
  for (let i = firstValid; i <= lastValid; i++) {
    if (!Number.isFinite(values[i])) continue;
    if (times[i]! <= nowCmp) currentIdx = i;
  }

  const trendIdx = Math.min(Math.max(currentIdx, firstValid), lastValid - 1);
  const trend = hourlyTrend(values, trendIdx);
  const trendLabel =
    trend === 'rising' ? 'Rising tide' : trend === 'falling' ? 'Falling tide' : 'Steady tide';

  const extrema: { time: string; type: 'high' | 'low' }[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (
      !Number.isFinite(values[i]!) ||
      !Number.isFinite(values[i - 1]!) ||
      !Number.isFinite(values[i + 1]!)
    ) {
      continue;
    }
    const v = values[i]!;
    const prev = values[i - 1]!;
    const next = values[i + 1]!;
    if (v > prev && v > next) extrema.push({ time: times[i]!, type: 'high' });
    if (v < prev && v < next) extrema.push({ time: times[i]!, type: 'low' });
  }

  const nextEvents: string[] = [];
  for (const e of extrema) {
    if (e.time > nowCmp) {
      const label =
        e.type === 'high'
          ? `Pleamar ~${formatClockFromApi(e.time)}`
          : `Bajamar ~${formatClockFromApi(e.time)}`;
      nextEvents.push(label);
      if (nextEvents.length >= 2) break;
    }
  }

  const finite = values.filter((v) => Number.isFinite(v));
  const dayHigh = Math.max(...finite);
  const dayLow = Math.min(...finite);
  const spanLine = `Today's range ≈ ${dayLow.toFixed(2)}–${dayHigh.toFixed(2)} m (model)`;

  const detailLine =
    nextEvents.length > 0
      ? `${nextEvents.join(' · ')} · ${spanLine}`
      : `${spanLine}`;

  return { trendLabel, detailLine };
}
