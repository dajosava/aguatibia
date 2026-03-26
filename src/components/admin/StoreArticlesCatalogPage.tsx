import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { StoreProductRow } from '../../types/storeProduct';
import {
  deleteStoreProduct,
  fetchStoreProducts,
  insertStoreProduct,
  updateStoreProduct,
} from '../../services/storeCatalogService';

function parseUnitPrice(raw: string): number | null {
  const t = raw.replace(',', '.').trim();
  if (t === '') return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function parseStockQuantity(raw: string): number | null {
  const t = raw.replace(',', '.').trim();
  if (t === '') return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
    return 'Ya existe un artículo con el mismo nombre (ignorando mayúsculas y espacios).';
  }
  if (err instanceof Error) return err.message;
  return 'Ha ocurrido un error';
}

export default function StoreArticlesCatalogPage() {
  const [rows, setRows] = useState<StoreProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StoreProductRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchStoreProducts();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError('Indica el nombre del artículo.');
      return;
    }
    const unit = parseUnitPrice(newPrice);
    if (unit === null) {
      setError('Indica un precio válido (≥ 0).');
      return;
    }
    const stock = parseStockQuantity(newStock);
    if (stock === null) {
      setError('Indica la cantidad en inventario (entero ≥ 0).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await insertStoreProduct({ name, unit_price: unit, stock_quantity: stock });
      setNewName('');
      setNewPrice('');
      setNewStock('');
      await load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: StoreProductRow) => {
    setEditing(row);
    setEditName(row.name);
    setEditPrice(Number(row.unit_price).toFixed(2));
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
    const unit = parseUnitPrice(editPrice);
    if (unit === null) {
      setError('Indica un precio válido (≥ 0).');
      return;
    }
    const stock = parseStockQuantity(editStock);
    if (stock === null) {
      setError('Indica la cantidad en inventario (entero ≥ 0).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateStoreProduct(editing.id, { name, unit_price: unit, stock_quantity: stock });
      closeEdit();
      await load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: StoreProductRow) => {
    if (!window.confirm(`¿Eliminar «${row.name}» del catálogo de tienda?`)) return;
    setError(null);
    void (async () => {
      try {
        await deleteStoreProduct(row.id);
        await load();
      } catch (err) {
        setError(formatError(err));
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <p className="text-gray-600 dark:text-slate-400">Cargando artículos de tienda…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start gap-3 mb-2">
          <ShoppingBag className="w-10 h-10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" aria-hidden />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100">Artículos de tienda</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-2">
              Catálogo que ve el cliente en el <strong className="text-gray-800 dark:text-slate-200">formulario de renta</strong>{' '}
              (productos opcionales del contrato). Solo los artículos dados de alta aquí aparecen en la lista;
              el precio lo defines tú y en el formulario público no se puede cambiar. La{' '}
              <strong className="text-gray-800 dark:text-slate-200">cantidad disponible</strong> baja automáticamente
              cada vez que se añade una línea de venta a un acuerdo y sube si quitas esa línea o ajustas el stock aquí.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg p-6 mb-8 mt-8"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">Nuevo artículo</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="form-label" htmlFor="store-art-name">
                Nombre *
              </label>
              <input
                id="store-art-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="form-input"
                placeholder="Ej. Crema solar, parche de quilla…"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="store-art-price">
                Precio (USD) *
              </label>
              <input
                id="store-art-price"
                type="text"
                inputMode="decimal"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="form-input"
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="store-art-stock">
                Cantidad disponible *
              </label>
              <input
                id="store-art-stock"
                type="text"
                inputMode="numeric"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="form-input"
                placeholder="0"
                autoComplete="off"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Añadir al catálogo
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Artículo</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-24">Precio</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-28">
                    Disponible
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-44">
                    Actualizado
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-slate-500">
                      No hay artículos. Añade el primero arriba para que aparezca en el formulario público.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ${Number(row.unit_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={`inline-flex min-w-[2rem] justify-end font-semibold ${
                            Number(row.stock_quantity ?? 0) <= 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-gray-900 dark:text-slate-100'
                          }`}
                        >
                          {Number(row.stock_quantity ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs">
                        {row.updated_at
                          ? new Date(row.updated_at).toLocaleString('es', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
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
          aria-labelledby="edit-store-art-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-slate-600 p-6 max-h-[90vh] overflow-y-auto">
            <h2 id="edit-store-art-title" className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              Editar artículo
            </h2>
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-store-art-name">
                  Nombre *
                </label>
                <input
                  id="edit-store-art-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="edit-store-art-price">
                  Precio (USD) *
                </label>
                <input
                  id="edit-store-art-price"
                  type="text"
                  inputMode="decimal"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="form-label" htmlFor="edit-store-art-stock">
                  Cantidad disponible *
                </label>
                <input
                  id="edit-store-art-stock"
                  type="text"
                  inputMode="numeric"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  className="form-input"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  Aumenta el número cuando repongas mercancía; las ventas en acuerdos restan unidades automáticamente.
                </p>
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 dark:bg-emerald-700 disabled:opacity-50"
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
