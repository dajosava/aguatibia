import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ArrowLeftRight, DoorOpen, Banknote } from 'lucide-react';
import SurfboardCombobox from './SurfboardCombobox';
import StoreProductLineInput, { type StoreItemLine } from './StoreProductLineInput';
import StoreLineQuantityStepper from './StoreLineQuantityStepper';
import { getRentalPriceForSelection } from '../config/rentalOptions';
import {
  checkoutCloseRentalAgreement,
  swapRentalSurfboard,
  syncRentalAgreementSurfboards,
  updateRentalAgreementCustomerNotes,
  updateRentalAgreementContractPaid,
  updateRentalAgreementWithStoreItems,
} from '../services/rentalAgreementService';
import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';
import type { StoreProductRow } from '../types/storeProduct';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';
import RentalBoardChangeHistoryList from './RentalBoardChangeHistoryList';
import { formatSurfboardPublicLabel } from '../utils/surfboardDisplay';
import { getAgreementBoardNumbers } from '../utils/agreementBoards';
import { parseStoreLineQuantity } from '../utils/storeLineQuantity';
import { clampEditStoreQuantities, maxQuantityForEditStoreRow } from '../utils/storeRowMaxQuantity';

function newStoreLine(): StoreItemLine {
  return { id: crypto.randomUUID(), productName: '', price: '', catalogProductId: null, quantity: 1 };
}

function parseMoneyInput(raw: string): number {
  const t = raw.replace(',', '.').trim();
  if (t === '') return NaN;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

function collectStoreLines(
  rows: StoreItemLine[],
  agreement: RentalAgreementWithStoreItems,
  productCatalog: StoreProductRow[]
): { ok: true; lines: { product_name: string; unit_price: number }[] } | { ok: false; message: string } {
  const byId = new Map(productCatalog.map((p) => [p.id, p]));
  const agreementItems = agreement.rental_agreement_store_items ?? [];

  function oldCountForProductName(nameNorm: string): number {
    return agreementItems.filter((it) => it.product_name.trim().toLowerCase() === nameNorm).length;
  }

  const totalsByProductKey = new Map<string, number>();
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
    const qty = parseStoreLineQuantity(r);
    if (qty === null) {
      return { ok: false, message: 'Indica una cantidad válida (entero ≥ 1).' };
    }
    const cid = r.catalogProductId?.trim();
    const key = cid
      ? (byId.get(cid)?.name ?? name).trim().toLowerCase()
      : name.trim().toLowerCase();
    totalsByProductKey.set(key, (totalsByProductKey.get(key) ?? 0) + qty);
  }

  const checkedCatalogIds = new Set<string>();
  for (const r of rows) {
    const cid = r.catalogProductId?.trim();
    if (!cid || checkedCatalogIds.has(cid)) continue;
    checkedCatalogIds.add(cid);
    const prod = byId.get(cid);
    if (!prod) continue;
    const key = prod.name.trim().toLowerCase();
    const total = totalsByProductKey.get(key) ?? 0;
    const available = Number(prod.stock_quantity ?? 0) + oldCountForProductName(key);
    if (total > available) {
      return {
        ok: false,
        message: `No hay suficiente stock de «${prod.name}». Disponible: ${available}.`,
      };
    }
  }

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
    const qty = parseStoreLineQuantity(r);
    if (qty === null) {
      return { ok: false, message: 'Indica una cantidad válida (entero ≥ 1).' };
    }
    for (let i = 0; i < qty; i++) {
      lines.push({ product_name: name, unit_price: p });
    }
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

function newBoardEditLine(): { id: string; boardNumber: string } {
  return { id: crypto.randomUUID(), boardNumber: '' };
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
  const [boardCheckedBy, setBoardCheckedBy] = useState('');
  const [storeItems, setStoreItems] = useState<StoreItemLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapNewBoard, setSwapNewBoard] = useState('');
  const [swapSourceBoard, setSwapSourceBoard] = useState('');
  const [swapping, setSwapping] = useState(false);
  const [closing, setClosing] = useState(false);
  const [registeringPayment, setRegisteringPayment] = useState(false);
  /** Tras «Registrar pago» OK: el padre puede seguir mostrando contract_paid desactualizado hasta refrescar; evita bloquear el check-out. */
  const [paymentJustRegistered, setPaymentJustRegistered] = useState(false);
  const [boardEditLines, setBoardEditLines] = useState<{ id: string; boardNumber: string }[]>(() => [
    newBoardEditLine(),
  ]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const isClosed = agreement.status === 'cerrado';

  useEffect(() => {
    setPickup(isoToDatetimeLocalValue(agreement.pickup));
    setReturnTime(isoToDatetimeLocalValue(agreement.return_time));
    setBoardCheckedBy(agreement.board_checked_by ?? '');
    setCustomerNotes(agreement.customer_notes ?? '');
    const sorted = [...(agreement.rental_agreement_store_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const merged: StoreItemLine[] = [];
    for (const it of sorted) {
      const name = it.product_name.trim();
      const price = Number(it.unit_price).toFixed(2);
      const prod = productCatalog.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
      const last = merged[merged.length - 1];
      if (
        last &&
        last.productName.trim().toLowerCase() === name.toLowerCase() &&
        last.price === price
      ) {
        last.quantity = (last.quantity ?? 1) + 1;
      } else {
        merged.push({
          id: crypto.randomUUID(),
          productName: name,
          price,
          catalogProductId: prod?.id ?? null,
          quantity: 1,
        });
      }
    }
    setStoreItems(merged);
    setError(null);
    setShowSwapPanel(false);
    setSwapNewBoard('');
    setSwapSourceBoard(getAgreementBoardNumbers(agreement)[0] ?? '');
    const surf = agreement.rental_agreement_surfboards;
    if (surf && surf.length > 0) {
      setBoardEditLines(
        [...surf]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((l) => ({ id: l.id, boardNumber: l.board_number.trim() }))
      );
    } else {
      const nums = getAgreementBoardNumbers(agreement);
      setBoardEditLines(
        nums.length > 0 ? nums.map((n) => ({ id: crypto.randomUUID(), boardNumber: n })) : [newBoardEditLine()]
      );
    }
  }, [agreement]);

  useEffect(() => {
    setPaymentJustRegistered(false);
  }, [agreement.id]);

  useEffect(() => {
    if (agreement.contract_paid === true) {
      setPaymentJustRegistered(false);
    }
  }, [agreement.contract_paid]);

  const boardsDisponibles = useMemo(
    () => boards.filter((b) => (b.status ?? 'Disponible') === 'Disponible'),
    [boards]
  );

  const agreementBoards = useMemo(() => getAgreementBoardNumbers(agreement), [agreement]);

  const boardsForEditRow = (rowId: string, rowBoard: string): SurfboardInventoryRow[] => {
    const selectedElsewhere = new Set(
      boardEditLines
        .filter((l) => l.id !== rowId)
        .map((l) => l.boardNumber.trim())
        .filter((n) => n.length > 0)
    );
    const assignedLower = new Set(
      boardEditLines.map((l) => l.boardNumber.trim().toLowerCase()).filter((n) => n.length > 0)
    );
    return boards.filter((b) => {
      const num = b.board_number;
      if (num === rowBoard) return true;
      if (selectedElsewhere.has(num)) return false;
      const disp = (b.status ?? 'Disponible') === 'Disponible';
      return disp || assignedLower.has(num.toLowerCase());
    });
  };

  /** Misma regla que el formulario público: precio de la opción × cantidad de tablas. */
  const rentalUnit = getRentalPriceForSelection(agreement.rental_type, agreement.rental_duration);
  const filledBoardCount = boardEditLines.filter((l) => l.boardNumber.trim().length > 0).length;
  const boardCountForRent =
    filledBoardCount > 0 ? filledBoardCount : Math.max(1, agreementBoards.length);
  const rentalBase = rentalUnit * boardCountForRent;

  const getStoreItemsSubtotal = () =>
    storeItems.reduce((sum, row) => {
      const p = parseMoneyInput(row.price.trim());
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);

  const contractTotal = rentalBase + getStoreItemsSubtotal();

  /** Valor en BD o registro reciente en esta sesión (evita UI bloqueada si el refresco no trae contract_paid). */
  const paymentRecordedAsPaid = agreement.contract_paid === true || paymentJustRegistered;

  const handleCheckoutClose = async () => {
    setError(null);
    if (!paymentRecordedAsPaid) {
      setError(
        'No se puede cerrar el contrato: el pago está pendiente. Usa «Registrar pago» arriba o márcalo en Detalle del acuerdo (panel admin).'
      );
      return;
    }
    if (
      !window.confirm(
        '¿Cerrar este contrato (check-out)? El acuerdo pasará a estado Cerrado y la tabla asignada volverá a Disponible en el inventario.'
      )
    ) {
      return;
    }
    setClosing(true);
    try {
      await checkoutCloseRentalAgreement(agreement.id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el contrato');
    } finally {
      setClosing(false);
    }
  };

  const handleRegisterPayment = async () => {
    setError(null);
    if (isClosed || paymentRecordedAsPaid) return;
    setRegisteringPayment(true);
    try {
      await updateRentalAgreementContractPaid(agreement.id, true);
      setPaymentJustRegistered(true);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setRegisteringPayment(false);
    }
  };

  const handleRegisterSwap = async () => {
    setError(null);
    if (isClosed) return;
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
    const oldNum = swapSourceBoard.trim() || agreementBoards[0] || '';
    if (!oldNum) {
      setError('No hay tabla asignada en el contrato.');
      return;
    }
    if (!agreementBoards.includes(oldNum)) {
      setError('Selecciona una tabla válida del contrato.');
      return;
    }
    if (next === oldNum) {
      setError('Elige una tabla distinta a la que sustituyes.');
      return;
    }

    setSwapping(true);
    try {
      await swapRentalSurfboard(agreement.id, oldNum, next);
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
    if (isClosed) return;

    const storeResult = collectStoreLines(storeItems, agreement, productCatalog);
    if (!storeResult.ok) {
      setError(storeResult.message);
      return;
    }

    const nums = boardEditLines.map((l) => l.boardNumber.trim()).filter((n) => n.length > 0);
    if (nums.length === 0) {
      setError('Indica al menos una tabla.');
      return;
    }
    if (nums.length !== boardEditLines.length) {
      setError('Completa todas las tablas o elimina las filas vacías.');
      return;
    }
    const uniq = new Set(nums.map((n) => n.toLowerCase()));
    if (uniq.size !== nums.length) {
      setError('No puedes repetir la misma tabla en el contrato.');
      return;
    }
    for (const n of nums) {
      if (!boards.some((b) => b.board_number === n)) {
        setError('Una de las tablas no existe en el inventario.');
        return;
      }
    }

    const boardCount = nums.length;
    const rentalTotal = rentalUnit * boardCount;
    const storeTotal = storeResult.lines.reduce((s, l) => s + l.unit_price, 0);
    const nextRentalPrice = Math.round((rentalTotal + storeTotal) * 100) / 100;

    setSaving(true);
    try {
      await syncRentalAgreementSurfboards(agreement.id, nums);
      await updateRentalAgreementWithStoreItems(
        agreement.id,
        {
          rental_price: nextRentalPrice,
          board_checked_by: boardCheckedBy.trim() || null,
          pickup: pickup.trim() || null,
          return_time: returnTime.trim() || null,
          customer_notes: customerNotes.trim() || null,
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
            {isClosed ? 'Acuerdo cerrado' : 'Editar acuerdo'}
          </h2>
          <p className="text-sm text-blue-100 dark:text-slate-400 mt-1">
            <span className="font-semibold text-white dark:text-slate-200">N.º {agreement.agreement_number}</span>
            {' · '}
            {agreement.name} — {agreement.rental_type.replace(/_/g, ' ')} · {agreement.rental_duration}
          </p>
        </div>

        {isClosed ? (
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-5 space-y-3">
              <p className="font-semibold text-gray-900 dark:text-slate-100">Check-out completado</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Este contrato está en estado <strong>Cerrado</strong>. Las tablas asignadas quedaron como{' '}
                <strong>Disponible</strong> en el inventario para otra renta.
              </p>
              {agreementBoards.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wide">
                    Tablas del contrato
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {agreementBoards.map((num) => (
                      <li key={num} className="text-sm font-medium text-blue-700 dark:text-cyan-300">
                        {publicBoardLabel(boards, num)} <span className="text-gray-500 dark:text-slate-500">({num})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/40 p-4 space-y-2">
              <label className="form-label mb-0" htmlFor="edit-customer-notes-closed">
                Comentarios o sugerencias del cliente
              </label>
              <textarea
                id="edit-customer-notes-closed"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={4}
                className="form-input min-h-[5rem] resize-y text-sm"
              />
              <button
                type="button"
                disabled={notesSaving}
                onClick={() => {
                  void (async () => {
                    setError(null);
                    setNotesSaving(true);
                    try {
                      await updateRentalAgreementCustomerNotes(agreement.id, customerNotes.trim() || null);
                      await onRefresh();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : 'No se pudieron guardar los comentarios'
                      );
                    } finally {
                      setNotesSaving(false);
                    }
                  })();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {notesSaving ? 'Guardando…' : 'Guardar solo comentarios'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 rounded-lg bg-blue-950 hover:bg-[#0c1d3a] text-white font-semibold ring-1 ring-blue-900/60"
            >
              Volver
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Ajusta fechas y productos de tienda. Cuando cobres, usa <strong className="text-gray-800 dark:text-slate-200">Registrar pago</strong>{' '}
            para poder hacer check-out. Para sustituir la tabla durante la renta usa{' '}
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

          <div>
            <label className="form-label" htmlFor="edit-customer-notes">
              Comentarios o sugerencias del cliente
            </label>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">
              Texto libre del formulario público; puedes corregirlo o ampliarlo aquí.
            </p>
            <textarea
              id="edit-customer-notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={4}
              className="form-input min-h-[6rem] resize-y"
            />
          </div>

          <div className="rounded-xl border-2 border-blue-200/80 dark:border-cyan-900/50 bg-blue-50/50 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <p className="form-label mb-0">Tablas del contrato</p>
                  <button
                    type="button"
                    onClick={() => setBoardEditLines((prev) => [...prev, newBoardEditLine()])}
                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border-2 border-dashed border-blue-300 dark:border-cyan-800 text-blue-800 dark:text-cyan-200 text-sm font-medium hover:bg-blue-100/80 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir tabla
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-500 mb-3">
                  Elige tablas Disponibles o las ya asignadas a este contrato. Guarda con «Guardar cambios». Para
                  sustituir una tabla por otra sin cambiar el número de tablas, usa «Hacer cambio» (aplica a lo guardado
                  en el servidor).
                </p>
                <div className="space-y-3">
                  {boardEditLines.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 rounded-lg border border-blue-200/80 dark:border-slate-600 bg-white/70 dark:bg-slate-900/50 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-500 block mb-1">
                          Tabla {index + 1}
                        </span>
                        <SurfboardCombobox
                          id={`edit-board-${row.id}`}
                          boards={boardsForEditRow(row.id, row.boardNumber)}
                          value={row.boardNumber}
                          onChange={(boardNumber) =>
                            setBoardEditLines((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, boardNumber } : r))
                            )
                          }
                        />
                      </div>
                      {boardEditLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBoardEditLines((prev) => prev.filter((r) => r.id !== row.id))}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0 self-end sm:self-center"
                          aria-label="Quitar tabla"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                disabled={boardsDisponibles.length === 0 || agreementBoards.length === 0}
                className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-cyan-800 dark:hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Hacer cambio
              </button>
            </div>

            {showSwapPanel && (
              <div className="pt-3 border-t border-blue-200/80 dark:border-slate-600 space-y-3">
                <p className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  «Hacer cambio» usa las tablas ya guardadas en el servidor. Si acabas de editar la lista arriba, pulsa
                  primero <strong>Guardar cambios</strong>.
                </p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  Busca la nueva tabla (solo en estado Disponible en inventario). La tabla que sustituyes pasa a{' '}
                  <strong>Disponible</strong> y la nueva queda <strong>Rentada</strong>.
                </p>
                {agreementBoards.length > 1 && (
                  <div>
                    <label className="form-label" htmlFor="swap-which-board">
                      Tabla a sustituir *
                    </label>
                    <select
                      id="swap-which-board"
                      value={swapSourceBoard}
                      onChange={(e) => setSwapSourceBoard(e.target.value)}
                      className="form-input mt-1"
                    >
                      {agreementBoards.map((num) => (
                        <option key={num} value={num}>
                          {publicBoardLabel(boards, num)} — {num}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
              refreshKey={agreementBoards.join('|')}
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
                    <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 w-24">
                      Cant.
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 w-36">
                      Precio unit. (USD)
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 w-28">
                      Importe
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
                      <td className="px-3 py-2 align-top text-center">
                        <div className="flex justify-center">
                          <StoreLineQuantityStepper
                            value={row.quantity ?? 1}
                            max={maxQuantityForEditStoreRow(row, storeItems, productCatalog, agreement)}
                            onChange={(next) =>
                              setStoreItems((prev) => {
                                const updated = prev.map((r) =>
                                  r.id === row.id ? { ...r, quantity: next } : r
                                );
                                return clampEditStoreQuantities(updated, productCatalog, agreement);
                              })
                            }
                            ariaLabel="Cantidad"
                          />
                        </div>
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
                      <td className="px-3 py-2 align-top text-right tabular-nums text-sm text-gray-800 dark:text-slate-200">
                        {(() => {
                          const u = parseMoneyInput(row.price.trim());
                          const q = parseStoreLineQuantity(row) ?? 1;
                          return Number.isFinite(u) ? `$${(u * q).toFixed(2)}` : '—';
                        })()}
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

          <div className="rounded-xl border-2 border-emerald-200/90 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <Banknote className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
              Estado del pago
            </h3>
            {paymentRecordedAsPaid ? (
              <p className="text-sm text-emerald-800 dark:text-emerald-200/90">
                <strong>Pago registrado.</strong> Puedes usar check-out cuando el cliente devuelva la tabla.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  El contrato figura con pago <strong className="text-amber-800 dark:text-amber-200">pendiente</strong>.
                  Al cobrar, pulsa el botón para registrar el pago y habilitar el cierre.
                </p>
                <button
                  type="button"
                  onClick={() => void handleRegisterPayment()}
                  disabled={registeringPayment}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Banknote className="w-4 h-4 shrink-0" aria-hidden />
                  {registeringPayment ? 'Registrando…' : 'Registrar pago'}
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl border-2 border-amber-200/90 dark:border-amber-900/50 bg-amber-50/60 dark:bg-slate-800/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <DoorOpen className="w-4 h-4 shrink-0" aria-hidden />
              Check-out
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Cierra el contrato cuando el cliente devuelve la tabla. El acuerdo pasa a estado{' '}
              <strong className="text-gray-800 dark:text-slate-200">Cerrado</strong> y la tabla asignada vuelve a{' '}
              <strong className="text-gray-800 dark:text-slate-200">Disponible</strong> en el inventario. El check-out
              solo está disponible si el pago está <strong className="text-gray-800 dark:text-slate-200">registrado</strong>{' '}
              (sección anterior).
            </p>
            {!paymentRecordedAsPaid && (
              <p className="text-sm text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                No puedes hacer check-out con el pago pendiente. Pulsa <strong>Registrar pago</strong> cuando hayas cobrado.
              </p>
            )}
            <button
              type="button"
              onClick={handleCheckoutClose}
              disabled={closing || !paymentRecordedAsPaid}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {closing ? 'Cerrando…' : 'Check-out — cerrar contrato'}
            </button>
          </div>

          <div className="flex flex-wrap gap-4 justify-end items-baseline text-sm border-t border-gray-200 dark:border-slate-600 pt-4">
            <span className="text-gray-600 dark:text-slate-400">
              Precio por tabla:{' '}
              <strong className="text-gray-900 dark:text-slate-100">${rentalUnit.toFixed(2)}</strong>
            </span>
            <span className="text-gray-600 dark:text-slate-400">
              Renta ({boardCountForRent} {boardCountForRent === 1 ? 'tabla' : 'tablas'}):{' '}
              <strong className="text-gray-900 dark:text-slate-100">
                ${rentalUnit.toFixed(2)} × {boardCountForRent} = ${rentalBase.toFixed(2)}
              </strong>
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
        )}
      </div>
    </div>
  );
}
