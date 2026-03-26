import { Minus, Plus } from 'lucide-react';

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** Si se omite, el botón + no tiene tope (la validación puede ir al enviar). */
  max?: number;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function StoreLineQuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  ariaLabel = 'Cantidad',
  disabled = false,
}: Props) {
  const v = Number.isFinite(value) && value >= min ? Math.floor(value) : min;
  const atMin = v <= min;
  const atMax = max != null && v >= max;

  return (
    <div
      className="inline-flex items-center justify-center gap-0.5 rounded-lg border-2 border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-800/80"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled || atMin}
        onClick={() => onChange(Math.max(min, v - 1))}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-l-md text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-[2.25rem] px-1 text-center text-sm font-semibold tabular-nums text-gray-900 dark:text-slate-100">
        {v}
      </span>
      <button
        type="button"
        disabled={disabled || atMax}
        onClick={() => onChange(max != null ? Math.min(max, v + 1) : v + 1)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
