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
  { value: 'today', label: 'El día de hoy' },
  { value: '7d', label: 'Última semana' },
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
  'rounded-xl border border-slate-600/90 bg-slate-900/95 p-5 shadow-lg text-white';

/** Ejes y números en gráficos (alto contraste sobre fondo oscuro). */
const CHART_TICK = { fill: '#f8fafc', fontSize: 12 };
const CHART_TICK_Y = { fill: '#f8fafc', fontSize: 11 };
const CHART_LEGEND_STYLE = { color: '#f8fafc', fontSize: '12px', paddingTop: '8px' };

const tooltipContentStyle: CSSProperties = {
  borderRadius: 10,
  border: '1px solid #475569',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  fontSize: 13,
};

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
      <p className="text-sm font-semibold uppercase tracking-wide text-white/90">{title}</p>
      <p className="mt-3 text-3xl md:text-4xl font-bold tabular-nums text-white leading-none">{value}</p>
      {hint ? <p className="mt-2 text-base text-white/85 leading-snug">{hint}</p> : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={METRICS_SURFACE}>
      <h3 className="mb-4 text-base md:text-lg font-semibold tracking-tight text-white">{title}</h3>
      <div className="h-72 w-full min-w-0">{children}</div>
    </div>
  );
}

function initialCustomRangeFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return formatYmdLocal(d);
}

export default function AdminMetricsPage() {
  const [timeSelection, setTimeSelection] = useState<MetricsTimeSelection>('90d');
  const [customFromDraft, setCustomFromDraft] = useState(initialCustomRangeFrom);
  const [customToDraft, setCustomToDraft] = useState(() => formatYmdLocal(new Date()));
  /** Rango que aplica al filtro (tras «Aplicar» o al elegir «Rango personalizado»). */
  const [customFromApplied, setCustomFromApplied] = useState(initialCustomRangeFrom);
  const [customToApplied, setCustomToApplied] = useState(() => formatYmdLocal(new Date()));
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
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos de analítica y reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (timeSelection === 'custom') {
      return filterAgreementsByDateRange(agreements, customFromApplied, customToApplied);
    }
    return filterAgreementsByPeriod(agreements, timeSelection);
  }, [agreements, timeSelection, customFromApplied, customToApplied]);

  const customRangeInvalid =
    timeSelection === 'custom' &&
    customFromDraft.trim() !== '' &&
    customToDraft.trim() !== '' &&
    customFromDraft > customToDraft;

  const customRangeDirty =
    timeSelection === 'custom' &&
    (customFromDraft !== customFromApplied || customToDraft !== customToApplied);
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
      <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-8 md:px-6">
        <div className="flex items-center justify-center min-h-[40vh] text-white text-lg md:text-xl font-medium">
          Cargando analítica y reportes…
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 rounded-xl border border-slate-700 bg-slate-950 px-3 py-4 md:px-5 md:py-6 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <BarChart3 className="w-11 h-11 md:w-12 md:h-12 shrink-0 text-cyan-300 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Analítica y reportes
            </h1>
            <p className="text-base md:text-lg text-white/90 leading-snug mt-1">
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
              className="rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2.5 text-base font-medium text-white max-w-[280px] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 [color-scheme:dark]"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                  {o.label}
                </option>
              ))}
              <option value="custom" className="bg-slate-900 text-white">
                Rango personalizado…
              </option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-600 bg-slate-800 px-4 py-2.5 text-base font-semibold text-white hover:bg-slate-750 disabled:opacity-60"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Actualizar
            </button>
          </div>
          {timeSelection === 'custom' ? (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-4 w-full sm:max-w-xl">
              <p className="text-sm md:text-base font-medium text-white">
                Fecha de registro del acuerdo (día en Costa Rica)
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5 min-w-[10rem]">
                  <label htmlFor="metrics-custom-from" className="text-sm text-white/90">
                    Desde
                  </label>
                  <input
                    id="metrics-custom-from"
                    type="date"
                    value={customFromDraft}
                    onChange={(e) => setCustomFromDraft(e.target.value)}
                    className="rounded-lg border-2 border-slate-600 bg-slate-950 px-3 py-2.5 text-base text-white [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1.5 min-w-[10rem]">
                  <label htmlFor="metrics-custom-to" className="text-sm text-white/90">
                    Hasta
                  </label>
                  <input
                    id="metrics-custom-to"
                    type="date"
                    value={customToDraft}
                    onChange={(e) => setCustomToDraft(e.target.value)}
                    className="rounded-lg border-2 border-slate-600 bg-slate-950 px-3 py-2.5 text-base text-white [color-scheme:dark]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomFromApplied(customFromDraft);
                    setCustomToApplied(customToDraft);
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-base font-semibold text-white shadow-md hover:bg-cyan-500"
                >
                  Aplicar rango
                </button>
              </div>
              {customRangeDirty ? (
                <p className="text-sm text-amber-200">
                  Los cambios de fecha no se aplican hasta que pulses «Aplicar rango».
                </p>
              ) : null}
              {customRangeInvalid ? (
                <p className="text-sm text-amber-200">
                  «Desde» es posterior a «Hasta»; al aplicar se usarán las fechas en orden correcto.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-3 text-base text-white">
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
        <p className="text-center text-lg md:text-xl text-white py-10 font-medium">
          No hay acuerdos en el periodo seleccionado.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Acuerdos e ingresos por mes">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={model.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="label" tick={CHART_TICK} tickMargin={8} />
                <YAxis
                  yAxisId="left"
                  tick={CHART_TICK_Y}
                  allowDecimals={false}
                  width={44}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={CHART_TICK_Y}
                  tickFormatter={(v) => `$${v}`}
                  width={56}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={{ color: '#f8fafc', fontSize: 13, fontWeight: 600 }}
                  itemStyle={{ color: '#f8fafc', fontSize: 13 }}
                  formatter={(value, name) => {
                    const n = String(name ?? '');
                    const v = value == null ? 0 : Number(value);
                    if (n === 'Ingresos' || n === 'Ingresos contrato') {
                      return [formatUsd(v), 'Ingresos contratos'];
                    }
                    return [v, 'Acuerdos'];
                  }}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
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
                  labelLine={{ stroke: '#94a3b8' }}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    name,
                    percent,
                  }) => {
                    const RADIAN = Math.PI / 180;
                    const r = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.65;
                    const x = (cx ?? 0) + r * Math.cos(-(midAngle ?? 0) * RADIAN);
                    const y = (cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * RADIAN);
                    const pct = ((percent as number) ?? 0) * 100;
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#f8fafc"
                        textAnchor={x > (cx ?? 0) ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-sm font-semibold"
                        style={{ fontSize: 11 }}
                      >
                        {`${String(name ?? '')} ${pct.toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {model.byStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={{ color: '#f8fafc', fontSize: 13 }}
                  itemStyle={{ color: '#f8fafc', fontSize: 13 }}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tablas más asignadas en acuerdos">
            {topBoardsChart.length === 0 ? (
              <p className="text-base md:text-lg text-white flex items-center h-full justify-center text-center px-4 font-medium">
                Sin datos de tablas en el periodo.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topBoardsChart}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" horizontal />
                  <XAxis type="number" allowDecimals={false} tick={CHART_TICK_Y} />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    width={148}
                    tick={{ fill: '#f8fafc', fontSize: 12 }}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={{ color: '#f8fafc', fontSize: 13 }}
                    itemStyle={{ color: '#f8fafc', fontSize: 13 }}
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
              <p className="text-base md:text-lg text-white flex items-center h-full justify-center text-center px-4 font-medium">
                Sin líneas de tienda en el periodo (extras fuera de la renta de tablas).
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topProductsChart}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" horizontal />
                  <XAxis type="number" allowDecimals={false} tick={CHART_TICK_Y} />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={152}
                    tick={{ fill: '#f8fafc', fontSize: 12 }}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={{ color: '#f8fafc', fontSize: 13 }}
                    itemStyle={{ color: '#f8fafc', fontSize: 13 }}
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
              <p className="text-base md:text-lg text-white flex items-center h-full justify-center font-medium">
                Sin datos.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={model.byRentalCombo} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="key"
                    tick={{ fill: '#f8fafc', fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                    height={72}
                    interval={0}
                  />
                  <YAxis tick={CHART_TICK_Y} allowDecimals={false} width={44} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={{ color: '#f8fafc', fontSize: 13 }}
                    itemStyle={{ color: '#f8fafc', fontSize: 13 }}
                  />
                  <Bar dataKey="count" name="Acuerdos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      <p className="text-sm md:text-base text-white/90 border-t border-slate-600 pt-5 leading-relaxed">
        Los datos provienen de los acuerdos guardados y sus tablas / líneas de tienda. El catálogo de «artículos de
        renta» no está vinculado aún a líneas de contrato; cuando exista ese registro, se podrá ampliar este módulo
        con frecuencia por artículo.
      </p>
    </div>
  );
}
