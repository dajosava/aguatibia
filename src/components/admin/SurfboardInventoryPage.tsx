import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type {
  EquipmentKind,
  SurfboardInventoryRow,
  SurfboardStatus,
  SurfboardTier,
} from '../../types/surfboardInventory';
import {
  SURFBOARD_EQUIPMENT_KIND_VALUES,
  SURFBOARD_STATUS_VALUES,
  SURFBOARD_TIER_VALUES,
} from '../../types/surfboardInventory';
import {
  deleteSurfboard,
  fetchSurfboardInventory,
  insertSurfboard,
  updateSurfboard,
} from '../../services/surfboardInventoryService';
import { useAdminAutoRefresh } from '../../hooks/useAdminAutoRefresh';
import { formatSurfboardPublicLabel } from '../../utils/surfboardDisplay';
import { ADMIN_TABLE_THEAD_STICKY, adminDataTableWrapperClass } from '../../utils/adminDataTableScroll';

type InventoryStatusFilter = 'all' | 'Disponible' | 'Rentada' | 'En mantenimiento' | 'otras';

function rowMatchesInventoryFilter(row: SurfboardInventoryRow, filter: InventoryStatusFilter): boolean {
  if (filter === 'all') return true;
  const s = row.status ?? 'Disponible';
  if (filter === 'otras') return s !== 'Disponible' && s !== 'Rentada' && s !== 'En mantenimiento';
  return s === filter;
}

function rowIsBoogie(row: SurfboardInventoryRow): boolean {
  return (row.equipment_kind ?? 'surfboard') === 'boogie';
}

function rowMatchesBrandOrNumberSearch(row: SurfboardInventoryRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const brand = (row.brand ?? '').trim().toLowerCase();
  const numRaw = (row.board_number ?? '').trim().toLowerCase();
  const numNoHash = numRaw.replace(/^#+/, '');
  const qNoHash = q.replace(/^#+/, '');
  if (brand.includes(q)) return true;
  if (numRaw.includes(q) || numNoHash.includes(qNoHash)) return true;
  return false;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Disponible':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'Rentada':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'En mantenimiento':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
    case 'Vendida':
      return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
  }
}

export default function SurfboardInventoryPage() {
  const [rows, setRows] = useState<SurfboardInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState<SurfboardStatus>('Disponible');
  const [newEquipmentKind, setNewEquipmentKind] = useState<EquipmentKind>('surfboard');
  const [newTier, setNewTier] = useState<SurfboardTier>('regular');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SurfboardInventoryRow | null>(null);
  const [editBrand, setEditBrand] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<SurfboardStatus>('Disponible');
  const [editEquipmentKind, setEditEquipmentKind] = useState<EquipmentKind>('surfboard');
  const [editTier, setEditTier] = useState<SurfboardTier>('regular');
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('all');
  /** Si es true, la tabla solo muestra filas catalogadas como boogie (combinable con filtro por estado). */
  const [boogieOnlyFilter, setBoogieOnlyFilter] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  /** Formulario de alta: colapsado por defecto para dar espacio a la tabla. */
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  /** Filtro por texto en marca o número de tabla (tras filtros de estado / boogie). */
  const [brandOrNumberSearch, setBrandOrNumberSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchSurfboardInventory();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el inventario');
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAdminAutoRefresh(() => {
    void load();
  });

  const statusCounts = useMemo(() => {
    let disponible = 0;
    let rentada = 0;
    let mantenimiento = 0;
    let otras = 0;
    for (const r of rows) {
      const s = r.status ?? 'Disponible';
      if (s === 'Disponible') disponible++;
      else if (s === 'Rentada') rentada++;
      else if (s === 'En mantenimiento') mantenimiento++;
      else otras++;
    }
    const boogies = rows.filter(rowIsBoogie).length;
    return { disponible, rentada, mantenimiento, otras, total: rows.length, boogies };
  }, [rows]);

  const rowsMatchingStatusAndBoogie = useMemo(
    () =>
      rows
        .filter((r) => rowMatchesInventoryFilter(r, statusFilter))
        .filter((r) => !boogieOnlyFilter || rowIsBoogie(r)),
    [rows, statusFilter, boogieOnlyFilter]
  );

  const filteredRows = useMemo(
    () => rowsMatchingStatusAndBoogie.filter((r) => rowMatchesBrandOrNumberSearch(r, brandOrNumberSearch)),
    [rowsMatchingStatusAndBoogie, brandOrNumberSearch]
  );

  useEffect(() => {
    if (statusFilter === 'otras' && statusCounts.otras === 0) {
      setStatusFilter('all');
    }
  }, [statusFilter, statusCounts.otras]);

  useEffect(() => {
    if (boogieOnlyFilter && statusCounts.boogies === 0) {
      setBoogieOnlyFilter(false);
    }
  }, [boogieOnlyFilter, statusCounts.boogies]);

  const pickFilter = (f: InventoryStatusFilter) => {
    setBoogieOnlyFilter(false);
    setStatusFilter((prev) => (prev === f ? 'all' : f));
  };

  const clearStatusToAll = () => {
    setBoogieOnlyFilter(false);
    setStatusFilter('all');
  };

  const toggleBoogieOnlyFilter = () => {
    setBoogieOnlyFilter((prev) => !prev);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const brand = newBrand.trim();
    const num = newNumber.trim();
    if (!brand) {
      setError('Indica la marca de la tabla.');
      return;
    }
    if (!num) {
      setError('Indica el número de tabla.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await insertSurfboard({
        brand,
        board_number: num,
        description: newDesc.trim() || null,
        status: newStatus,
        equipment_kind: newEquipmentKind,
        board_tier: newEquipmentKind === 'boogie' ? 'regular' : newTier,
      });
      setNewBrand('');
      setNewNumber('');
      setNewDesc('');
      setNewStatus('Disponible');
      setNewEquipmentKind('surfboard');
      setNewTier('regular');
      await load();
      setAddPanelOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: SurfboardInventoryRow) => {
    setEditing(row);
    setEditBrand(row.brand ?? '');
    setEditNumber(row.board_number);
    setEditDesc(row.description ?? '');
    setEditStatus((row.status ?? 'Disponible') as SurfboardStatus);
    setEditEquipmentKind((row.equipment_kind ?? 'surfboard') as EquipmentKind);
    setEditTier((row.board_tier ?? 'regular') as SurfboardTier);
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const brand = editBrand.trim();
    const num = editNumber.trim();
    if (!brand) {
      setError('La marca no puede estar vacía.');
      return;
    }
    if (!num) {
      setError('El número de tabla no puede estar vacío.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSurfboard(editing.id, {
        brand,
        board_number: num,
        description: editDesc.trim() || null,
        status: editStatus,
        equipment_kind: editEquipmentKind,
        board_tier: editEquipmentKind === 'boogie' ? 'regular' : editTier,
      });
      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: SurfboardInventoryRow) => {
    const label = formatSurfboardPublicLabel(row);
    if (!window.confirm(`¿Eliminar "${label}" del inventario? (p. ej. vendida o desechada)`)) {
      return;
    }
    setError(null);
    void (async () => {
      try {
        await deleteSurfboard(row.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar');
      }
    })();
  };

  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <p className="text-gray-600 dark:text-slate-400">Cargando inventario…</p>
      </div>
    );
  }

  const inventoryDataRowCount = rows.length === 0 || filteredRows.length === 0 ? 0 : filteredRows.length;
  const inventoryTableWrapperClass = adminDataTableWrapperClass(inventoryDataRowCount);

  return (
    <div className="px-2 py-1 md:px-3 md:py-2">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 mb-0.5">
          Inventario de tablas y boogies
        </h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 leading-snug mt-0.5 mb-6 md:mb-7">
          Primero elige <strong className="text-gray-800 dark:text-slate-200">tabla de surf o boogie</strong>. Marca y
          número los verá el cliente (solo ítems{' '}
          <strong className="text-gray-800 dark:text-slate-200">Disponible</strong>). En tablas de surf, Regular/Premium
          filtra el formulario público; «Boogie Session» solo lista boogies. La descripción es solo interna.
        </p>

        <div className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg mb-8 overflow-hidden">
          <button
            type="button"
            id="inv-add-panel-toggle"
            onClick={() => setAddPanelOpen((v) => !v)}
            aria-expanded={addPanelOpen}
            aria-controls="inv-add-panel"
            className="w-full flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-4 text-left transition hover:bg-gray-50/90 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset dark:focus-visible:ring-cyan-500"
          >
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-gray-800 dark:text-slate-100">
                Nuevo equipo
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 leading-snug">
                {addPanelOpen
                  ? 'Ocultar formulario de alta'
                  : 'Expandir para añadir tablas o boogies al inventario'}
              </p>
            </div>
            <ChevronDown
              className={`w-6 h-6 shrink-0 text-gray-500 dark:text-slate-400 transition-transform duration-200 ${
                addPanelOpen ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </button>

          {addPanelOpen ? (
          <div id="inv-add-panel" className="px-4 pb-6 sm:px-6 border-t border-gray-200 dark:border-slate-600">
        <form onSubmit={handleAdd} className="pt-4">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="inv-equipment-kind">
                Tipo de equipo *
              </label>
              <select
                id="inv-equipment-kind"
                value={newEquipmentKind}
                onChange={(e) => {
                  const k = e.target.value as EquipmentKind;
                  setNewEquipmentKind(k);
                  if (k === 'boogie') setNewTier('regular');
                }}
                className="form-input max-w-md"
              >
                {SURFBOARD_EQUIPMENT_KIND_VALUES.map((k) => (
                  <option key={k} value={k}>
                    {k === 'boogie' ? 'Boogie' : 'Tabla de surf'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1.5">
                Obligatorio: distingue inventario de surf del de boogie en el formulario de renta.
              </p>
            </div>
            <div>
              <label className="form-label" htmlFor="inv-brand">
                Marca *
              </label>
              <input
                id="inv-brand"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                className="form-input"
                placeholder="Ej: Firewire, Pyzel…"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="inv-board-number">
                Nº de tabla *
              </label>
              <input
                id="inv-board-number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="form-input"
                placeholder="Ej: #12 o 12"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="inv-status">
                Estado
              </label>
              <select
                id="inv-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SurfboardStatus)}
                className="form-input"
              >
                {SURFBOARD_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {newEquipmentKind === 'surfboard' ? (
              <div>
                <label className="form-label" htmlFor="inv-tier">
                  Renta (tabla) *
                </label>
                <select
                  id="inv-tier"
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as SurfboardTier)}
                  className="form-input"
                  aria-describedby="inv-tier-hint"
                >
                  {SURFBOARD_TIER_VALUES.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier === 'premium' ? 'Premium' : 'Regular'}
                    </option>
                  ))}
                </select>
                <p id="inv-tier-hint" className="text-xs text-gray-500 dark:text-slate-500 mt-1.5 leading-snug">
                  Premium: solo contratos con opción premium. Regular: resto de rentas de tabla.
                </p>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-500 leading-snug sm:col-span-2">
                Boogie: no aplica Regular/Premium; se usará en «Boogie Session» del formulario público.
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="inv-desc">
                Descripción (solo interno)
              </label>
              <textarea
                id="inv-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="form-input min-h-[88px]"
                placeholder="Modelo exacto, medidas, estado, notas para el personal…"
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-cyan-700 dark:hover:bg-cyan-600 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Añadir equipo
          </button>
        </form>
          </div>
          ) : null}
        </div>

        <div className="mb-5 max-w-xl">
          <label className="form-label mb-1.5 block" htmlFor="inv-search-brand-number">
            Buscar por marca o n.º de tabla
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none"
              aria-hidden
            />
            <input
              id="inv-search-brand-number"
              type="search"
              value={brandOrNumberSearch}
              onChange={(e) => setBrandOrNumberSearch(e.target.value)}
              placeholder="Ej. Firewire, 12, #12…"
              className="form-input pl-9 w-full"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1.5">
            Se aplica sobre el listado ya filtrado por estado y boogie (si los usas).
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900/90 dark:border dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-4 sm:px-5 border-b border-gray-200 dark:border-slate-600 bg-gray-50/90 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
              Resumen por estado · pulsa para filtrar la tabla
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-3">
              Pulsa de nuevo el mismo filtro de estado para ver todos los estados. El botón Boogies se quita pulsándolo
              otra vez.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleBoogieOnlyFilter}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition shadow-sm ${
                  boogieOnlyFilter
                    ? 'border-fuchsia-500 bg-fuchsia-50 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 dark:border-fuchsia-400 dark:bg-fuchsia-950/45 dark:ring-cyan-400 dark:ring-offset-slate-800'
                    : 'border-fuchsia-200 bg-fuchsia-50/80 hover:brightness-95 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30 dark:hover:bg-fuchsia-950/45'
                }`}
              >
                <span className="text-sm font-medium text-fuchsia-900 dark:text-fuchsia-200">Boogies</span>
                <span className="text-xl font-bold tabular-nums text-fuchsia-800 dark:text-fuchsia-100">
                  {statusCounts.boogies}
                </span>
              </button>
              <button
                type="button"
                onClick={clearStatusToAll}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition shadow-sm ${
                  statusFilter === 'all'
                    ? 'border-gray-500 bg-gray-200 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 dark:border-slate-400 dark:bg-slate-700 dark:ring-cyan-400 dark:ring-offset-slate-800'
                    : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-900/80 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200">Todas</span>
                <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-slate-100">
                  {statusCounts.total}
                </span>
              </button>
              <button
                type="button"
                onClick={() => pickFilter('Disponible')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition shadow-sm ${
                  statusFilter === 'Disponible'
                    ? 'border-emerald-400 bg-emerald-50 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 dark:border-emerald-600 dark:bg-emerald-950/50 dark:ring-cyan-400 dark:ring-offset-slate-800'
                    : 'border-emerald-200 bg-emerald-50 hover:brightness-95 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/50'
                }`}
              >
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Disponibles</span>
                <span className="text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-100">
                  {statusCounts.disponible}
                </span>
              </button>
              <button
                type="button"
                onClick={() => pickFilter('Rentada')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition shadow-sm ${
                  statusFilter === 'Rentada'
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 dark:border-blue-600 dark:bg-blue-950/50 dark:ring-cyan-400 dark:ring-offset-slate-800'
                    : 'border-blue-200 bg-blue-50 hover:brightness-95 dark:border-blue-900/50 dark:bg-blue-950/40 dark:hover:bg-blue-950/55'
                }`}
              >
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Rentadas</span>
                <span className="text-xl font-bold tabular-nums text-blue-800 dark:text-blue-100">
                  {statusCounts.rentada}
                </span>
              </button>
              <button
                type="button"
                onClick={() => pickFilter('En mantenimiento')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition shadow-sm ${
                  statusFilter === 'En mantenimiento'
                    ? 'border-amber-400 bg-amber-50 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 dark:border-amber-600 dark:bg-amber-950/50 dark:ring-cyan-400 dark:ring-offset-slate-800'
                    : 'border-amber-200 bg-amber-50 hover:brightness-95 dark:border-amber-900/50 dark:bg-amber-950/35 dark:hover:bg-amber-950/50'
                }`}
              >
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">En mantenimiento</span>
                <span className="text-xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
                  {statusCounts.mantenimiento}
                </span>
              </button>
              {statusCounts.otras > 0 ? (
                <button
                  type="button"
                  onClick={() => pickFilter('otras')}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition shadow-sm ${
                    statusFilter === 'otras'
                      ? 'border-slate-400 bg-slate-100 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:ring-cyan-400 dark:ring-offset-slate-800'
                      : 'border-slate-200 bg-slate-100 hover:brightness-95 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Otras (p. ej. vendida)</span>
                  <span className="text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {statusCounts.otras}
                  </span>
                </button>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-3">
              {statusFilter === 'all' && !boogieOnlyFilter ? (
                <>
                  Total en inventario:{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{statusCounts.total}</strong>
                  {statusCounts.boogies > 0 ? (
                    <>
                      {' '}
                      (<strong className="text-gray-800 dark:text-slate-200">{statusCounts.boogies}</strong> boogies)
                    </>
                  ) : null}
                  {brandOrNumberSearch.trim() ? (
                    <>
                      {' · '}
                      En pantalla:{' '}
                      <strong className="text-gray-800 dark:text-slate-200">{filteredRows.length}</strong> con la
                      búsqueda actual
                    </>
                  ) : null}
                </>
              ) : boogieOnlyFilter ? (
                <>
                  Solo boogies:{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{filteredRows.length}</strong> de{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{rowsMatchingStatusAndBoogie.length}</strong>
                  {statusFilter === 'all' ? ' equipos en inventario' : ' con este estado'}
                  {brandOrNumberSearch.trim()
                    ? ` (búsqueda «${brandOrNumberSearch.trim()}»)`
                    : ''}
                </>
              ) : (
                <>
                  Mostrando <strong className="text-gray-800 dark:text-slate-200">{filteredRows.length}</strong> de{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{rowsMatchingStatusAndBoogie.length}</strong>{' '}
                  equipos
                  {statusFilter !== 'all' ? ' con este estado' : ''}
                  {brandOrNumberSearch.trim()
                    ? ` (búsqueda «${brandOrNumberSearch.trim()}»)`
                    : ''}
                </>
              )}
            </p>
          </div>
          <div className={inventoryTableWrapperClass}>
            <table className="w-full text-sm">
              <thead className={ADMIN_TABLE_THEAD_STICKY}>
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Marca</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Nº</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Equipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Renta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">
                    Descripción (interno)
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-32">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      No hay equipos registrados. Añade el primero arriba.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      {brandOrNumberSearch.trim()
                        ? 'Ningún equipo coincide con la búsqueda por marca o número. Prueba otro texto o borra el campo de búsqueda.'
                        : 'Ningún equipo coincide con este filtro. Pulsa «Todas» o el mismo contador otra vez para ver todo el inventario.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                        {(row.brand ?? '').trim() || '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-cyan-400">{row.board_number}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-slate-200">
                        {(row.equipment_kind ?? 'surfboard') === 'boogie' ? 'Boogie' : 'Tabla de surf'}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-slate-200">
                        {(row.equipment_kind ?? 'surfboard') === 'boogie'
                          ? '—'
                          : (row.board_tier ?? 'regular') === 'premium'
                            ? 'Premium'
                            : 'Regular'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(row.status ?? 'Disponible')}`}
                        >
                          {row.status ?? 'Disponible'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-pre-wrap text-xs">
                        {row.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-cyan-400 dark:hover:bg-slate-800"
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 ml-1"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-inv-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-slate-600 p-6 max-h-[90vh] overflow-y-auto">
            <h2 id="edit-inv-title" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-slate-100 mb-4">
              Editar equipo
            </h2>
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-brand">
                  Marca *
                </label>
                <input
                  id="edit-brand"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-num">
                  Nº de tabla *
                </label>
                <input
                  id="edit-num"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-equipment-kind">
                  Tipo de equipo
                </label>
                <select
                  id="edit-equipment-kind"
                  value={editEquipmentKind}
                  onChange={(e) => {
                    const k = e.target.value as EquipmentKind;
                    setEditEquipmentKind(k);
                    if (k === 'boogie') setEditTier('regular');
                  }}
                  className="form-input"
                >
                  {SURFBOARD_EQUIPMENT_KIND_VALUES.map((k) => (
                    <option key={k} value={k}>
                      {k === 'boogie' ? 'Boogie' : 'Tabla de surf'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-status">
                  Estado
                </label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SurfboardStatus)}
                  className="form-input"
                >
                  {SURFBOARD_STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {editEquipmentKind === 'surfboard' ? (
                <div className="mb-4">
                  <label className="form-label" htmlFor="edit-tier">
                    Renta (tabla)
                  </label>
                  <select
                    id="edit-tier"
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value as SurfboardTier)}
                    className="form-input"
                  >
                    {SURFBOARD_TIER_VALUES.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier === 'premium' ? 'Premium' : 'Regular'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="mb-6">
                <label className="form-label" htmlFor="edit-desc">
                  Descripción (solo interno)
                </label>
                <textarea
                  id="edit-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="form-input min-h-[100px]"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-cyan-700 disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
