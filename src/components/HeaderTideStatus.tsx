import { useEffect, useState } from 'react';
import { Waves } from 'lucide-react';
import { useCostaRicaClock } from '../hooks/useCostaRicaClock';
import { fetchTodayTideSummary, type TideDaySummary } from '../services/marineTideService';

const REFRESH_MS = 30 * 60 * 1000;

const headerEmphasis =
  'font-bold text-slate-900 dark:text-white dark:[text-shadow:0_0_10px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.35)]';

export default function HeaderTideStatus() {
  const { now, label } = useCostaRicaClock();
  const [summary, setSummary] = useState<TideDaySummary | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const dateLine = (
    <time dateTime={now.toISOString()} className={`block text-sm tabular-nums max-w-2xl ${headerEmphasis}`}>
      {label}
    </time>
  );

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTodayTideSummary()
        .then((s) => {
          if (!cancelled) {
            setSummary(s);
            setStatus('ready');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSummary(null);
            setStatus('error');
          }
        });
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="mt-1.5 space-y-1">
        <p className={`text-sm flex items-center gap-1.5 ${headerEmphasis}`}>
          <Waves
            className={`w-4 h-4 shrink-0 opacity-60 animate-pulse text-cyan-800 dark:text-white ${headerEmphasis.includes('dark:') ? '' : ''}`}
            aria-hidden
          />
          Loading tides…
        </p>
        {dateLine}
      </div>
    );
  }

  if (status === 'error' || !summary) {
    return (
      <div className="mt-1.5 space-y-1">
        <p className={`text-sm flex items-center gap-1.5 ${headerEmphasis}`} title="Open-Meteo marine">
          <Waves
            className="w-4 h-4 shrink-0 text-cyan-800 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            aria-hidden
          />
          Tide data unavailable
        </p>
        {dateLine}
      </div>
    );
  }

  const fullTitle = `${summary.trendLabel}. ${summary.detailLine}. Approximate model — not for navigation.`;

  return (
    <div className="mt-1.5 space-y-1">
      <p className={`text-sm leading-snug max-w-2xl ${headerEmphasis}`} title={fullTitle}>
        <Waves
          className="inline-block w-4 h-4 mr-1 align-[-0.125rem] shrink-0 text-cyan-800 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          aria-hidden
        />
        <strong
          className={
            summary.trend === 'rising'
              ? 'font-extrabold text-blue-600 dark:text-blue-400'
              : summary.trend === 'falling'
                ? 'font-extrabold text-orange-600 dark:text-orange-400'
                : 'font-extrabold text-cyan-950 dark:text-white'
          }
        >
          {summary.trendLabel}
        </strong>
        <span className="font-extrabold text-slate-800 dark:text-white/90"> · </span>
        <span className="font-extrabold text-slate-900 dark:text-white">{summary.detailLine}</span>
      </p>
      {dateLine}
    </div>
  );
}
