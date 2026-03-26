import { useEffect, useState } from 'react';

const CR_LOCALE = 'es-CR';
const CR_TIMEZONE = 'America/Costa_Rica';

const formatOptions: Intl.DateTimeFormatOptions = {
  timeZone: CR_TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
};

export function useCostaRicaClock(updateEveryMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), updateEveryMs);
    return () => window.clearInterval(id);
  }, [updateEveryMs]);
  const label = now.toLocaleString(CR_LOCALE, formatOptions);
  return { now, label };
}
