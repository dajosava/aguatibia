import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchRentalAgreements } from '../../services/rentalAgreementService';
import { fetchSurfboardInventory } from '../../services/surfboardInventoryService';
import type { RentalAgreementWithStoreItems } from '../../types/rentalAgreement';
import type { SurfboardInventoryRow } from '../../types/surfboardInventory';
import {
  buildMetricsModel,
  filterAgreementsByDateRange,
  filterAgreementsByPeriod,
  type MetricsPeriod,
} from '../../utils/metricsAggregation';

const PERIOD_OPTIONS: { value: MetricsPeriod; label: string }[] = [
  { value: '1d', label: 'Último día' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '365d', label: 'Último año' },
  { value: 'all', label: 'Todo el histórico' },
];

type MetricsTimeSelection = MetricsPeriod | 'custom';

function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PIE_COLORS = ['#0ea5e9', '#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#ec4899'];

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

const METRICS_SURFACE =
  'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900/95';

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={METRICS_SURFACE}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/80">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500 dark:text-white/85">{hint}</p> : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={METRICS_SURFACE}>
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-72 w-full min-w-0">{children}</div>
    </div>
  );
}

export default function AdminMetricsPage() {
  const [timeSelection, setTimeSelection] = useState<MetricsTimeSelection>('90d');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatYmdLocal(d);
  });
  const [customTo, setCustomTo] = useState(() => formatYmdLocal(new Date()));
  const [agreements, setAgreements] = useState<RentalAgreementWithStoreItems[]>([]);
  const [inventory, setInventory] = useState<SurfboardInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [a, inv] = await Promise.all([fetchRentalAgreements(), fetchSurfboardInventory()]);
      setAgreements(a);
      setInventory(inv);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (timeSelection === 'custom') {
      return filterAgreementsByDateRange(agreements, customFrom, customTo);
    }
    return filterAgreementsByPeriod(agreements, timeSelection);
  }, [agreements, timeSelection, customFrom, customTo]);

  const customRangeInvalid =
    timeSelection === 'custom' &&
    customFrom.trim() !== '' &&
    customTo.trim() !== '' &&
    new Date(`${customFrom}T00:00:00`).getTime() > new Date(`${customTo}T00:00:00`).getTime();
  const model = useMemo(() => buildMetricsModel(filtered, inventory), [filtered, inventory]);

  const topBoardsChart = useMemo(
    () =>
      [...model.topBoards]
        .reverse()
        .map((b) => ({
          ...b,
          shortLabel:
            b.displayLabel.length > 28 ? `${b.displayLabel.slice(0, 26)}…` : b.displayLabel,
        })),
    [model.topBoards]
  );

  const topProductsChart = useMemo(
    () =>
      [...model.topStoreProducts]
        .reverse()
        .map((p) => ({
          ...p,
          shortName: p.productName.length > 32 ? `${p.productName.slice(0, 30)}…` : p.productName,
        })),
    [model.topStoreProducts]
  );

  if (loading && agreements.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[40vh] text-gray-600 dark:text-slate-400">
          Cargando métricas…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 dark:bg-cyan-950/60 p-2.5">
            <BarChart3 className="w-6 h-6 text-blue-800 dark:text-cyan-200" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Métricas</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
              Resumen de acuerdos, tablas y ventas en tienda registradas en el sistema.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="metrics-period" className="sr-only">
              Periodo
            </label>
            <select
              id="metrics-period"
              value={timeSelection}
              onChange={(e) => setTimeSelection(e.target.value as MetricsTimeSelection)}
              className="form-input py-2 pl-3 pr-8 text-sm font-medium max-w-[260px]"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value="custom">Rango personalizado…</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Actualizar
            </button>
          </div>
          {timeSelection === 'custom' ? (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3 dark:border-slate-600 dark:bg-slate-800/40 w-full sm:max-w-xl">
              <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Fecha de registro del acuerdo (en tu zona horaria)
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1 min-w-[10rem]">
                  <label htmlFor="metrics-custom-from" className="text-xs text-gray-500 dark:text-slate-500">
                    Desde
                  </label>
                  <input
                    id="metrics-custom-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="form-input py-2 text-sm [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[10rem]">
                  <label htmlFor="metrics-custom-to" className="text-xs text-gray-500 dark:text-slate-500">
                    Hasta
                  </label>
                  <input
                    id="metrics-custom-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="form-input py-2 text-sm [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              {customRangeInvalid ? (
                <p className="text-xs text-amber-800 dark:text-amber-200/90">
                  «Desde» es posterior a «Hasta»; los datos se filtran intercambiando las fechas.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/50 dark:text-white">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Acuerdos (periodo)" value={String(model.kpis.agreementCount)} />
        <KpiCard
          title="Ingresos totales (contratos)"
          value={formatUsd(model.kpis.totalRevenue)}
          hint="Suma del precio total registrado en cada acuerdo."
        />
        <KpiCard title="Ticket medio" value={formatUsd(model.kpis.avgTicket)} />
        <KpiCard
          title="Pagos registrados"
          value={`${model.kpis.paidAgreements} / ${model.kpis.agreementCount}`}
          hint={`Pendientes: ${model.kpis.unpaidAgreements}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Asignaciones de tabla"
          value={String(model.kpis.boardAssignments)}
          hint="Total de filas tabla en acuerdos (una tabla puede aparecer en varios contratos)."
        />
        <KpiCard
          title="Líneas de tienda en acuerdos"
          value={String(model.kpis.storeLineCount)}
          hint={`Acuerdos con al menos una línea: ${model.kpis.agreementsWithStoreLines}`}
        />
        <KpiCard
          title="Ingresos por líneas de tienda"
          value={formatUsd(model.kpis.storeRevenue)}
          hint="Suma de precios de productos añadidos al contrato (extras fuera de la renta base)."
        />
      </div>

      {model.monthly.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-slate-500 py-8">
          No hay acuerdos en el periodo seleccionado.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Acuerdos e ingresos por mes">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={model.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-600 dark:text-white" />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  allowDecimals={false}
                  width={36}
                  className="text-gray-600 dark:text-white"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  tickFormatter={(v) => `$${v}`}
                  width={48}
                  className="text-gray-600 dark:text-white"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                  formatter={(value, name) => {
                    const n = String(name ?? '');
                    const v = value == null ? 0 : Number(value);
                    if (n === 'Ingresos' || n === 'Ingresos contrato') {
                      return [formatUsd(v), 'Ingresos contratos'];
                    }
                    return [v, 'Acuerdos'];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="agreements"
                  name="Acuerdos"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Ingresos contrato"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Estado de los acuerdos">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={model.byStatus}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${String(name ?? '')} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {model.byStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tablas más asignadas en acuerdos">
            {topBoardsChart.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-white/90 flex items-center h-full justify-center">
                Sin datos de tablas en el periodo.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topBoardsChart}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal className="stroke-gray-200 dark:stroke-slate-700" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    width={132}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value ?? 0), 'Asignaciones']}
                    labelFormatter={(_, p) => {
                      const row = p?.[0]?.payload as { displayLabel?: string } | undefined;
                      return row?.displayLabel ?? '';
                    }}
                  />
                  <Bar dataKey="count" name="Veces en contratos" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Productos de tienda más añadidos a contratos">
            {topProductsChart.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-white/90 flex items-center h-full justify-center">
                Sin líneas de tienda en el periodo (extras fuera de la renta de tablas).
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topProductsChart}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal className="stroke-gray-200 dark:stroke-slate-700" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="shortName" width={140} tick={{ fontSize: 10 }} interval={0} />
                  <Tooltip
                    formatter={(value) => [Number(value ?? 0), 'Líneas en acuerdos']}
                    labelFormatter={(_, p) => {
                      const row = p?.[0]?.payload as { productName?: string; revenue?: number } | undefined;
                      const name = row?.productName ?? '';
                      const rev = row?.revenue;
                      return rev != null ? `${name} · ${formatUsd(rev)}` : name;
                    }}
                  />
                  <Bar dataKey="lineCount" name="Líneas" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Combinaciones tipo / duración de renta">
            {model.byRentalCombo.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-white/90 flex items-center h-full justify-center">
                Sin datos.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={model.byRentalCombo} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-700" />
                  <XAxis dataKey="key" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                  <Tooltip />
                  <Bar dataKey="count" name="Acuerdos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-white/85 border-t border-gray-200 dark:border-slate-700 pt-4">
        Los datos provienen de los acuerdos guardados y sus tablas / líneas de tienda. El catálogo de «artículos de
        renta» no está vinculado aún a líneas de contrato; cuando exista ese registro, se podrá ampliar este módulo
        con frecuencia por artículo.
      </p>
    </div>
  );
}
