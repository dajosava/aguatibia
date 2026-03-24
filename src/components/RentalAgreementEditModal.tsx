import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import SurfboardCombobox from './SurfboardCombobox';
import StoreProductLineInput, { type StoreItemLine } from './StoreProductLineInput';
import { getRentalPriceForSelection } from '../config/rentalOptions';
import { swapRentalSurfboard, updateRentalAgreementWithStoreItems } from '../services/rentalAgreementService';
import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';
import type { StoreProductRow } from '../types/storeProduct';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';
import RentalBoardChangeHistoryList from './RentalBoardChangeHistoryList';
import { formatSurfboardPublicLabel } from '../utils/surfboardDisplay';

function newStoreLine(): StoreItemLine {
  return { id: crypto.randomUUID(), productName: '', price: '' };
}

function parseMoneyInput(raw: string): number {
  const t = raw.replace(',', '.').trim();
  if (t === '') return NaN;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

function collectStoreLines(
  rows: StoreItemLine[]
): { ok: true; lines: { product_name: string; unit_price: number }[] } | { ok: false; message: string } {
  const lines: { product_name: string; unit_price: number }[] = [];
  for (const r of rows) {
    const name = r.productName.trim();
    const rawPrice = r.price.trim();
    if (!name && !rawPrice) continue;
    if (name && !rawPrice) {
      return { ok: false, message: 'Indica el precio de cada producto de tienda o elimina la fila vacía.' };
    }
    if (!name && rawPrice) {
      return { ok: false, message: 'Indica el nombre del producto o borra el precio en esa fila.' };
    }
    const p = parseMoneyInput(rawPrice);
    if (Number.isNaN(p)) {
      return { ok: false, message: 'Revisa que los precios de tienda sean números válidos (ej. 10 o 10.50).' };
    }
    lines.push({ product_name: name, unit_price: p });
  }
  return { ok: true, lines };
}

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function publicBoardLabel(boards: SurfboardInventoryRow[], boardNumber: string): string {
  const num = boardNumber.trim();
  if (!num) return '—';
  const row = boards.find((b) => b.board_number.trim() === num);
  if (row) return formatSurfboardPublicLabel(row);
  return num;
}

type Props = {
  agreement: RentalAgreementWithStoreItems;
  boards: SurfboardInventoryRow[];
  productCatalog: StoreProductRow[];
  onClose: () => void;
  onSaved: () => void;
  /** Recarga acuerdos e inventario sin cerrar el modal (p. ej. tras cambio de tabla). */
  onRefresh: () => Promise<void>;
};

export default function RentalAgreementEditModal({
  agreement,
  boards,
  productCatalog,
  onClose,
  onSaved,
  onRefresh,
}: Props) {
  const [pickup, setPickup] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [contractPaid, setContractPaid] = useState(false);
  const [boardCheckedBy, setBoardCheckedBy] = useState('');
  const [storeItems, setStoreItems] = useState<StoreItemLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapNewBoard, setSwapNewBoard] = useState('');
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    setPickup(isoToDatetimeLocalValue(agreement.pickup));
    setReturnTime(isoToDatetimeLocalValue(agreement.return_time));
    setContractPaid(agreement.contract_paid === true);
    setBoardCheckedBy(agreement.board_checked_by ?? '');
    const sorted = [...(agreement.rental_agreement_store_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    setStoreItems(
      sorted.map((it) => ({
        id: crypto.randomUUID(),
        productName: it.product_name,
        price: Number(it.unit_price).toFixed(2),
      }))
    );
    setError(null);
    setShowSwapPanel(false);
    setSwapNewBoard('');
  }, [agreement]);

  const boardsDisponibles = useMemo(
    () => boards.filter((b) => (b.status ?? 'Disponible') === 'Disponible'),
    [boards]
  );

  const rentalBase = getRentalPriceForSelection(agreement.rental_type, agreement.rental_duration);

  const getStoreItemsSubtotal = () =>
    storeItems.reduce((sum, row) => {
      const p = parseMoneyInput(row.price.trim());
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);

  const contractTotal = rentalBase + getStoreItemsSubtotal();

  const currentBoardNum = agreement.surfboard_number?.trim() ?? '';

  const handleRegisterSwap = async () => {
    setError(null);
    if (boardsDisponibles.length === 0) {
      setError('No hay tablas en estado Disponible para asignar.');
      return;
    }
    const next = swapNewBoard.trim();
    if (!next) {
      setError('Selecciona la nueva tabla en el buscador.');
      return;
    }
    if (!boardsDisponibles.some((b) => b.board_number === next)) {
      setError('La nueva tabla debe estar disponible en el inventario.');
      return;
    }
    if (next === currentBoardNum) {
      setError('Elige una tabla distinta a la asignada ahora.');
      return;
    }

    setSwapping(true);
    try {
      await swapRentalSurfboard(agreement.id, next);
      await onRefresh();
      setSwapNewBoard('');
      setShowSwapPanel(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar el cambio de tabla';
      setError(msg);
    } finally {
      setSwapping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storeResult = collectStoreLines(storeItems);
    if (!storeResult.ok) {
      setError(storeResult.message);
      return;
    }

    setSaving(true);
    try {
      await updateRentalAgreementWithStoreItems(
        agreement.id,
        {
          rental_price: Math.round((rentalBase + storeResult.lines.reduce((s, l) => s + l.unit_price, 0)) * 100) / 100,
          contract_paid: contractPaid,
          board_checked_by: boardCheckedBy.trim() || null,
          pickup: pickup.trim() || null,
          return_time: returnTime.trim() || null,
        },
        storeResult.lines
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el acuerdo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-transparent dark:border-slate-700 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-agreement-title"
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-950 dark:to-slate-900 p-6 text-white border-b border-blue-900/30">
          <h2 id="edit-agreement-title" className="text-2xl font-bold">
            Editar acuerdo
          </h2>
          <p className="text-sm text-blue-100 dark:text-slate-400 mt-1">
            {agreement.name} — {agreement.rental_type.replace(/_/g, ' ')} · {agreement.rental_duration}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Ajusta fechas, productos de tienda o el estado del pago. Para sustituir la tabla durante la renta usa{' '}
            <strong className="font-semibold text-gray-800 dark:text-slate-200">Hacer cambio</strong>: en inventario, la
            tabla anterior pasa a <strong className="font-semibold text-gray-800 dark:text-slate-200">Disponible</strong>{' '}
            y la nueva a <strong className="font-semibold text-gray-800 dark:text-slate-200">Rentada</strong>; el cambio
            queda en el historial.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="edit-pickup">
                Pickup
              </label>
              <input
                id="edit-pickup"
                type="datetime-local"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="form-input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-return">
                Retorno
              </label>
              <input
                id="edit-return"
                type="datetime-local"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="form-input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="rounded-xl border-2 border-blue-200/80 dark:border-cyan-900/50 bg-blue-50/50 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="form-label mb-1">Tabla asignada ahora</p>
                <p className="text-lg font-bold text-blue-700 dark:text-cyan-300">
                  {currentBoardNum ? publicBoardLabel(boards, currentBoardNum) : '—'}
                </p>
                {currentBoardNum && (
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Nº en contrato: {currentBoardNum}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowSwapPanel((was) => {
                    if (was) setSwapNewBoard('');
                    return !was;
                  });
                }}
                disabled={boardsDisponibles.length === 0}
                className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-cyan-800 dark:hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Hacer cambio
              </button>
            </div>

            {showSwapPanel && (
              <div className="pt-3 border-t border-blue-200/80 dark:border-slate-600 space-y-3">
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  Busca la nueva tabla (solo en estado Disponible en inventario). Al registrar el cambio, la tabla que
                  llevaba el cliente ({currentBoardNum || '—'}) pasa a <strong>Disponible</strong> y la nueva a{' '}
                  <strong>Rentada</strong> en el inventario.
                </p>
                <div>
                  <label className="form-label" htmlFor="swap-new-board">
                    Nueva tabla *
                  </label>
                  <SurfboardCombobox
                    id="swap-new-board"
                    boards={boardsDisponibles}
                    value={swapNewBoard}
                    onChange={setSwapNewBoard}
                    disabled={boardsDisponibles.length === 0 || swapping}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRegisterSwap}
                    disabled={swapping || boardsDisponibles.length === 0}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {swapping ? 'Registrando…' : 'Registrar cambio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSwapPanel(false);
                      setSwapNewBoard('');
                      setError(null);
                    }}
                    disabled={swapping}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <RentalBoardChangeHistoryList
              agreementId={agreement.id}
              boards={boards}
              refreshKey={agreement.surfboard_number ?? ''}
              innerClassName="pt-3 border-t border-blue-200/80 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="edit-checked-by">
              Board checked by
            </label>
            <select
              id="edit-checked-by"
              value={boardCheckedBy}
              onChange={(e) => setBoardCheckedBy(e.target.value)}
              className="form-input"
            >
              <option value="">Seleccionar…</option>
              <option value="Alexander">Alexander</option>
              <option value="Martin">Martin</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="form-label mb-0">Productos de tienda</p>
            <button
              type="button"
              onClick={() => setStoreItems((prev) => [...prev, newStoreLine()])}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-cyan-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 font-medium text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Añadir producto
            </button>
          </div>

          {storeItems.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border-2 border-gray-200 dark:border-slate-600">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/80">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 min-w-[20rem]">
                      Producto
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 w-36">
                      Precio (USD)
                    </th>
                    <th className="w-12 px-1" aria-label="Quitar fila" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                  {storeItems.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 align-top min-w-[20rem]">
                        <StoreProductLineInput
                          row={row}
                          catalog={productCatalog}
                          onChange={(lineId, patch) =>
                            setStoreItems((prev) => prev.map((r) => (r.id === lineId ? { ...r, ...patch } : r)))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.price}
                          onChange={(e) =>
                            setStoreItems((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, price: e.target.value } : r))
                            )
                          }
                          className="form-input py-2 text-sm"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setStoreItems((prev) => prev.filter((r) => r.id !== row.id))}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          aria-label="Quitar línea"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-500 italic">Sin productos de tienda en este acuerdo.</p>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={contractPaid}
              onChange={(e) => setContractPaid(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600"
            />
            <span className="text-sm text-gray-800 dark:text-slate-200">Contrato pagado</span>
          </label>

          <div className="flex flex-wrap gap-4 justify-end items-baseline text-sm border-t border-gray-200 dark:border-slate-600 pt-4">
            <span className="text-gray-600 dark:text-slate-400">
              Renta base:{' '}
              <strong className="text-gray-900 dark:text-slate-100">${rentalBase.toFixed(2)}</strong>
            </span>
            {getStoreItemsSubtotal() > 0 && (
              <span className="text-gray-600 dark:text-slate-400">
                Tienda:{' '}
                <strong className="text-gray-900 dark:text-slate-100">${getStoreItemsSubtotal().toFixed(2)}</strong>
              </span>
            )}
            <span className="text-base font-bold text-blue-600 dark:text-cyan-400">
              Total: ${contractTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-3 rounded-lg bg-blue-950 hover:bg-[#0c1d3a] text-white font-semibold ring-1 ring-blue-900/60 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
