import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { SurfboardInventoryRow } from '../../types/surfboardInventory';
import {
  deleteSurfboard,
  fetchSurfboardInventory,
  insertSurfboard,
  updateSurfboard,
} from '../../services/surfboardInventoryService';

export default function SurfboardInventoryPage() {
  const [rows, setRows] = useState<SurfboardInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SurfboardInventoryRow | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editDesc, setEditDesc] = useState('');

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
    const num = newNumber.trim();
    if (!num) {
      setError('Indica el número de tabla.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await insertSurfboard({ board_number: num, description: newDesc.trim() || null });
      setNewNumber('');
      setNewDesc('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: SurfboardInventoryRow) => {
    setEditing(row);
    setEditNumber(row.board_number);
    setEditDesc(row.description ?? '');
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const num = editNumber.trim();
    if (!num) {
      setError('El número de tabla no puede estar vacío.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSurfboard(editing.id, { board_number: num, description: editDesc.trim() || null });
      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: SurfboardInventoryRow) => {
    if (
      !window.confirm(
        `¿Eliminar la tabla "${row.board_number}" del inventario? (p. ej. vendida o desechada)`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await deleteSurfboard(row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
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
          Registra el número de cada tabla y una descripción. Puedes editar o dar de baja tablas vendidas o desechadas.
        </p>

        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Nueva tabla</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
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
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="inv-desc">
                Descripción
              </label>
              <textarea
                id="inv-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="form-input min-h-[88px]"
                placeholder="Modelo, medidas, estado, notas…"
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Nº tabla</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Descripción</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-32">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      No hay tablas registradas. Añade la primera arriba.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-cyan-400">{row.board_number}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-slate-600 p-6">
            <h2 id="edit-inv-title" className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Editar tabla
            </h2>
            <form onSubmit={handleSaveEdit}>
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
              <div className="mb-6">
                <label className="form-label" htmlFor="edit-desc">
                  Descripción
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
