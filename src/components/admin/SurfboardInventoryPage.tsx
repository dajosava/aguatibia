import { useState, useEffect, useCallback } from 'react';
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
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Inventario de tablas
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          Marca y número son los que verá el cliente al elegir tabla en el formulario de renta (solo tablas{' '}
          <strong className="text-gray-800 dark:text-slate-200">Disponible</strong>). La descripción es solo para uso
          interno del equipo.
        </p>

        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Nueva tabla</h2>
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
                ) : (
                  rows.map((row) => (
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
            <h2 id="edit-inv-title" className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
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
