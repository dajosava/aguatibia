import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { SurfboardInventoryRow, SurfboardStatus } from '../../types/surfboardInventory';
import { SURFBOARD_STATUS_VALUES } from '../../types/surfboardInventory';
import {
  deleteSurfboard,
  fetchSurfboardInventory,
  insertSurfboard,
  updateSurfboard,
} from '../../services/surfboardInventoryService';
import { formatSurfboardPublicLabel } from '../../utils/surfboardDisplay';

type InventoryStatusFilter = 'all' | 'Disponible' | 'Rentada' | 'En mantenimiento' | 'otras';

function rowMatchesInventoryFilter(row: SurfboardInventoryRow, filter: InventoryStatusFilter): boolean {
  if (filter === 'all') return true;
  const s = row.status ?? 'Disponible';
  if (filter === 'otras') return s !== 'Disponible' && s !== 'Rentada' && s !== 'En mantenimiento';
  return s === filter;
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
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SurfboardInventoryRow | null>(null);
  const [editBrand, setEditBrand] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<SurfboardStatus>('Disponible');
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('all');

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
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    return { disponible, rentada, mantenimiento, otras, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(
    () => rows.filter((r) => rowMatchesInventoryFilter(r, statusFilter)),
    [rows, statusFilter]
  );

  useEffect(() => {
    if (statusFilter === 'otras' && statusCounts.otras === 0) {
      setStatusFilter('all');
    }
  }, [statusFilter, statusCounts.otras]);

  const pickFilter = (f: InventoryStatusFilter) => {
    setStatusFilter((prev) => (prev === f ? 'all' : f));
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
      });
      setNewBrand('');
      setNewNumber('');
      setNewDesc('');
      setNewStatus('Disponible');
      await load();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <p className="text-gray-600 dark:text-slate-400">Cargando inventario…</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 md:px-3 md:py-2">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 mb-0.5">
          Inventario de tablas
        </h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 leading-snug mt-0.5 mb-6 md:mb-7">
          Marca y número son los que verá el cliente al elegir tabla en el formulario de renta (solo tablas{' '}
          <strong className="text-gray-800 dark:text-slate-200">Disponible</strong>). Al enviarse un contrato con esa
          tabla, el inventario la pasa automáticamente a <strong className="text-gray-800 dark:text-slate-200">Rentada</strong>.
          La descripción es solo para uso interno del equipo.
        </p>

        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold tracking-tight text-gray-800 dark:text-slate-100 mb-4">Nueva tabla</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
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
            Añadir tabla
          </button>
        </form>

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
              Pulsa de nuevo el mismo filtro para ver todas las tablas.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
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
              {statusFilter === 'all' ? (
                <>
                  Total de tablas en inventario:{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{statusCounts.total}</strong>
                </>
              ) : (
                <>
                  Mostrando <strong className="text-gray-800 dark:text-slate-200">{filteredRows.length}</strong> de{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{statusCounts.total}</strong> tablas
                </>
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Marca</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Nº tabla</th>
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
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      No hay tablas registradas. Añade la primera arriba.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      Ninguna tabla coincide con este filtro. Pulsa «Todas» o el mismo contador otra vez para ver
                      todo el inventario.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                        {(row.brand ?? '').trim() || '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-cyan-400">{row.board_number}</td>
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
              Editar tabla
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
