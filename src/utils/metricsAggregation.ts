import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';
import { formatSurfboardPublicLabel } from './surfboardDisplay';

export type MetricsPeriod = '1d' | '30d' | '90d' | '365d' | 'all';

export function periodStartMs(period: MetricsPeriod): number | null {
  if (period === 'all') return null;
  const d = new Date();
  const days =
    period === '1d' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function filterAgreementsByPeriod(
  rows: RentalAgreementWithStoreItems[],
  period: MetricsPeriod
): RentalAgreementWithStoreItems[] {
  const start = periodStartMs(period);
  if (start === null) return rows;
  return rows.filter((r) => new Date(r.created_at).getTime() >= start);
}

/** Fechas locales `YYYY-MM-DD`; incluye todo el día final hasta 23:59:59.999. Filtra por `created_at` del acuerdo. */
export function filterAgreementsByDateRange(
  rows: RentalAgreementWithStoreItems[],
  fromYmd: string,
  toYmd: string
): RentalAgreementWithStoreItems[] {
  const fromRaw = (fromYmd ?? '').trim();
  const toRaw = (toYmd ?? '').trim();
  if (!fromRaw || !toRaw) return rows;
  const from = new Date(`${fromRaw}T00:00:00`);
  const to = new Date(`${toRaw}T23:59:59.999`);
  let fromMs = from.getTime();
  let toMs = to.getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return rows;
  if (fromMs > toMs) {
    const t = fromMs;
    fromMs = toMs;
    toMs = t;
  }
  return rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= fromMs && t <= toMs;
  });
}

const MONTH_FMT = new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric' });

function monthKeyFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return MONTH_FMT.format(d);
}

export function statusLabelEs(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    active: 'Activo',
    completed: 'Completado',
    cancelled: 'Cancelado',
    cerrado: 'Cerrado',
  };
  return map[status] ?? status;
}

export interface MonthlySeriesPoint {
  key: string;
  label: string;
  agreements: number;
  revenue: number;
}

export interface TopBoardRow {
  boardNumber: string;
  displayLabel: string;
  count: number;
}

export interface TopStoreProductRow {
  productName: string;
  lineCount: number;
  revenue: number;
}

export interface StatusSlice {
  status: string;
  label: string;
  count: number;
}

export interface RentalComboSlice {
  key: string;
  count: number;
}

export interface MetricsModel {
  kpis: {
    agreementCount: number;
    totalRevenue: number;
    avgTicket: number;
    storeLineCount: number;
    storeRevenue: number;
    boardAssignments: number;
    paidAgreements: number;
    unpaidAgreements: number;
    agreementsWithStoreLines: number;
  };
  monthly: MonthlySeriesPoint[];
  topBoards: TopBoardRow[];
  topStoreProducts: TopStoreProductRow[];
  byStatus: StatusSlice[];
  byRentalCombo: RentalComboSlice[];
}

function surfboardDisplayForNumber(
  raw: string,
  byNumber: Map<string, SurfboardInventoryRow>
): string {
  const t = raw.trim();
  if (!t) return raw;
  const row = byNumber.get(t.toLowerCase());
  if (row) return formatSurfboardPublicLabel(row);
  return t;
}

export function buildMetricsModel(
  rows: RentalAgreementWithStoreItems[],
  inventory: SurfboardInventoryRow[]
): MetricsModel {
  const byNumber = new Map<string, SurfboardInventoryRow>();
  for (const r of inventory) {
    byNumber.set(r.board_number.trim().toLowerCase(), r);
  }

  let storeLineCount = 0;
  let storeRevenue = 0;
  let boardAssignments = 0;
  let paidAgreements = 0;
  let unpaidAgreements = 0;
  let agreementsWithStoreLines = 0;

  const monthMap = new Map<string, { agreements: number; revenue: number }>();
  const boardCount = new Map<string, number>();
  const storeProductMap = new Map<string, { lineCount: number; revenue: number }>();
  const statusCount = new Map<string, number>();
  const comboCount = new Map<string, number>();

  for (const a of rows) {
    const rev = Number(a.rental_price) || 0;

    if (a.contract_paid === true) paidAgreements += 1;
    else unpaidAgreements += 1;

    const mk = monthKeyFromIso(a.created_at);
    const m = monthMap.get(mk) ?? { agreements: 0, revenue: 0 };
    m.agreements += 1;
    m.revenue += rev;
    monthMap.set(mk, m);

    const st = String(a.status || 'unknown');
    statusCount.set(st, (statusCount.get(st) ?? 0) + 1);

    const comboKey = `${a.rental_type || '—'} · ${a.rental_duration || '—'}`;
    comboCount.set(comboKey, (comboCount.get(comboKey) ?? 0) + 1);

    const boards = a.rental_agreement_surfboards ?? [];
    if (boards.length > 0) {
      for (const b of boards) {
        const num = (b.board_number ?? '').trim();
        if (!num) continue;
        const lk = num.toLowerCase();
        boardAssignments += 1;
        boardCount.set(lk, (boardCount.get(lk) ?? 0) + 1);
      }
    } else {
      const legacy = (a.surfboard_number ?? '').trim();
      if (legacy) {
        const lk = legacy.toLowerCase();
        boardAssignments += 1;
        boardCount.set(lk, (boardCount.get(lk) ?? 0) + 1);
      }
    }

    const items = a.rental_agreement_store_items ?? [];
    let agreementStoreLines = 0;
    for (const it of items) {
      const name = (it.product_name ?? '').trim();
      if (!name) continue;
      agreementStoreLines += 1;
      storeLineCount += 1;
      const lineRev = Number(it.unit_price) || 0;
      storeRevenue += lineRev;
      const agg = storeProductMap.get(name) ?? { lineCount: 0, revenue: 0 };
      agg.lineCount += 1;
      agg.revenue += lineRev;
      storeProductMap.set(name, agg);
    }
    if (agreementStoreLines > 0) agreementsWithStoreLines += 1;
  }

  const agreementCount = rows.length;
  const totalRevenue = rows.reduce((s, a) => s + (Number(a.rental_price) || 0), 0);
  const avgTicket = agreementCount > 0 ? totalRevenue / agreementCount : 0;

  const monthlyKeys = [...monthMap.keys()].sort();
  const monthly: MonthlySeriesPoint[] = monthlyKeys.map((key) => {
    const v = monthMap.get(key)!;
    return {
      key,
      label: monthLabel(key),
      agreements: v.agreements,
      revenue: v.revenue,
    };
  });

  const topBoards: TopBoardRow[] = [...boardCount.entries()]
    .map(([lk, count]) => {
      const displayNum = inventory.find((r) => r.board_number.trim().toLowerCase() === lk)?.board_number ?? lk;
      return {
        boardNumber: displayNum,
        displayLabel: surfboardDisplayForNumber(displayNum, byNumber),
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const topStoreProducts: TopStoreProductRow[] = [...storeProductMap.entries()]
    .map(([productName, v]) => ({
      productName,
      lineCount: v.lineCount,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 12);

  const byStatus: StatusSlice[] = [...statusCount.entries()]
    .map(([status, count]) => ({
      status,
      label: statusLabelEs(status),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const byRentalCombo: RentalComboSlice[] = [...comboCount.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    kpis: {
      agreementCount,
      totalRevenue,
      avgTicket,
      storeLineCount,
      storeRevenue,
      boardAssignments,
      paidAgreements,
      unpaidAgreements,
      agreementsWithStoreLines,
    },
    monthly,
    topBoards,
    topStoreProducts,
    byStatus,
    byRentalCombo,
  };
}
