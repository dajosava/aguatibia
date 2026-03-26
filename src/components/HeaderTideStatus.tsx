import { useEffect, useState } from 'react';
import { Waves } from 'lucide-react';
import { fetchTodayTideSummary, type TideDaySummary } from '../services/marineTideService';

const REFRESH_MS = 30 * 60 * 1000;

export default function HeaderTideStatus() {
  const [summary, setSummary] = useState<TideDaySummary | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

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
      <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
        <Waves className="w-4 h-4 shrink-0 opacity-60 animate-pulse" aria-hidden />
        Loading tides…
      </p>
    );
  }

  if (status === 'error' || !summary) {
    return (
      <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1.5" title="Open-Meteo marine">
        <Waves className="w-4 h-4 shrink-0" aria-hidden />
        Tide data unavailable
      </p>
    );
  }

  const fullTitle = `${summary.trendLabel}. ${summary.detailLine}. Approximate model — not for navigation.`;

  return (
    <p
      className="mt-1.5 text-sm text-cyan-900 dark:text-cyan-100/95 leading-snug max-w-2xl"
      title={fullTitle}
    >
      <Waves className="inline-block w-4 h-4 mr-1 align-[-0.125rem] shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden />
      <strong className="font-semibold text-cyan-950 dark:text-cyan-200">{summary.trendLabel}</strong>
      <span className="text-gray-600 dark:text-slate-400"> · </span>
      <span className="text-gray-700 dark:text-slate-300">{summary.detailLine}</span>
    </p>
  );
}
