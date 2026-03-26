import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, Trash2, Armchair } from 'lucide-react';
import type { RentalArticleInventoryRow } from '../../types/rentalArticleInventory';
import {
  deleteRentalArticle,
  fetchRentalArticleInventory,
  insertRentalArticle,
  updateRentalArticle,
} from '../../services/rentalArticleInventoryService';

const CATEGORY_PLACEHOLDER = 'Ej. Sombrilla, Silla, Toldo…';

export default function RentalArticlesInventoryPage() {
  const [rows, setRows] = useState<RentalArticleInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('0');
  const [newStock, setNewStock] = useState('1');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RentalArticleInventoryRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('0');
  const [editStock, setEditStock] = useState('1');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchRentalArticleInventory();
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

  const parseStock = (raw: string): number | null => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const parseUnitPrice = (raw: string): number | null => {
    const t = raw.replace(',', '.').trim();
    if (t === '') return null;
    const n = parseFloat(t);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError('Indica el nombre del artículo.');
      return;
    }
    const unitPrice = parseUnitPrice(newUnitPrice);
    if (unitPrice === null) {
      setError('Indica un precio de renta válido (≥ 0).');
      return;
    }
    const stock = parseStock(newStock);
    if (stock === null) {
      setError('La cantidad en stock debe ser un entero ≥ 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await insertRentalArticle({
        name,
        category: newCategory.trim() || null,
        description: newDesc.trim() || null,
        unit_price: unitPrice,
        stock_quantity: stock,
      });
      setNewName('');
      setNewCategory('');
      setNewDesc('');
      setNewUnitPrice('0');
      setNewStock('1');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: RentalArticleInventoryRow) => {
    setEditing(row);
    setEditName(row.name);
    setEditCategory(row.category ?? '');
    setEditDesc(row.description ?? '');
    setEditUnitPrice(Number(row.unit_price ?? 0).toFixed(2));
    setEditStock(String(row.stock_quantity));
  };

  const closeEdit = () => setEditing(null);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const name = editName.trim();
    if (!name) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    const unitPrice = parseUnitPrice(editUnitPrice);
    if (unitPrice === null) {
      setError('Indica un precio de renta válido (≥ 0).');
      return;
    }
    const stock = parseStock(editStock);
    if (stock === null) {
      setError('La cantidad en stock debe ser un entero ≥ 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRentalArticle(editing.id, {
        name,
        category: editCategory.trim() || null,
        description: editDesc.trim() || null,
        unit_price: unitPrice,
        stock_quantity: stock,
      });
      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: RentalArticleInventoryRow) => {
    if (!window.confirm(`¿Eliminar del catálogo «${row.name}»?`)) return;
    setError(null);
    void (async () => {
      try {
        await deleteRentalArticle(row.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar');
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <p className="text-gray-600 dark:text-slate-400">Cargando artículos…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start gap-3 mb-2">
          <Armchair className="w-10 h-10 text-amber-600 dark:text-amber-400 shrink-0 mt-1" aria-hidden />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100">
              Artículos de renta
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mt-2">
              Inventario de complementos para la playa o la escuela: <strong className="text-gray-800 dark:text-slate-200">sombrillas</strong>,{' '}
              <strong className="text-gray-800 dark:text-slate-200">sillas</strong>,{' '}
              <strong className="text-gray-800 dark:text-slate-200">toldos</strong>, etc. (no son tablas de surf).
              El <strong className="text-gray-800 dark:text-slate-200">precio de renta</strong> es referencia en USD para el equipo; el stock es orientativo. Más adelante se puede enlazar con contratos si lo necesitáis.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg p-6 mb-8 mt-8"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Nuevo artículo</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label" htmlFor="art-name">
                Nombre *
              </label>
              <input
                id="art-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="form-input"
                placeholder="Ej. Sombrilla grande 2 m"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="art-category">
                Categoría
              </label>
              <input
                id="art-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="form-input"
                placeholder={CATEGORY_PLACEHOLDER}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="art-price">
                Precio de renta (USD) *
              </label>
              <input
                id="art-price"
                type="text"
                inputMode="decimal"
                value={newUnitPrice}
                onChange={(e) => setNewUnitPrice(e.target.value)}
                className="form-input"
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="art-stock">
                Unidades en stock *
              </label>
              <input
                id="art-stock"
                type="number"
                min={0}
                step={1}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="art-desc">
                Descripción / notas (solo interno)
              </label>
              <textarea
                id="art-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="form-input min-h-[88px]"
                placeholder="Modelo, color, ubicación en bodega…"
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Añadir artículo
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Categoría</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-28">
                    Precio (USD)
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-24">Stock</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Notas</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      No hay artículos. Añade el primero arriba.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                        {(row.category ?? '').trim() || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-green-700 dark:text-emerald-400">
                        ${Number(row.unit_price ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700 dark:text-amber-400">
                        {row.stock_quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-pre-wrap text-xs max-w-xs">
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
          aria-labelledby="edit-art-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-slate-600 p-6 max-h-[90vh] overflow-y-auto">
            <h2 id="edit-art-title" className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Editar artículo
            </h2>
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-art-name">
                  Nombre *
                </label>
                <input
                  id="edit-art-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-art-cat">
                  Categoría
                </label>
                <input
                  id="edit-art-cat"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="form-input"
                  placeholder={CATEGORY_PLACEHOLDER}
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-art-price">
                  Precio de renta (USD) *
                </label>
                <input
                  id="edit-art-price"
                  type="text"
                  inputMode="decimal"
                  value={editUnitPrice}
                  onChange={(e) => setEditUnitPrice(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-art-stock">
                  Stock *
                </label>
                <input
                  id="edit-art-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="mb-6">
                <label className="form-label" htmlFor="edit-art-desc">
                  Descripción (solo interno)
                </label>
                <textarea
                  id="edit-art-desc"
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
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 dark:bg-amber-700 disabled:opacity-50"
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
