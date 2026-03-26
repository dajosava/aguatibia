import { useState, useEffect } from 'react';
import { Waves, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import SignatureCanvas from './SignatureCanvas';
import SurfboardCombobox from './SurfboardCombobox';
import StoreProductLineInput, { type StoreItemLine } from './StoreProductLineInput';
import { RENTAL_OPTIONS, getRentalPriceForSelection } from '../config/rentalOptions';
import type { RentalFormLang, RentalFormValidationMessages } from '../config/rentalFormLocales';
import { RENTAL_FORM_STRINGS } from '../config/rentalFormLocales';
import { insertRentalAgreementWithStoreItems } from '../services/rentalAgreementService';
import { fetchStoreProducts } from '../services/storeCatalogService';
import { fetchSurfboardInventoryForRental } from '../services/surfboardInventoryService';
import type { StoreProductRow } from '../types/storeProduct';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';

function newStoreLine(): StoreItemLine {
  return { id: crypto.randomUUID(), productName: '', price: '', catalogProductId: null };
}

function newBoardLine(): { id: string; boardNumber: string } {
  return { id: crypto.randomUUID(), boardNumber: '' };
}

function parseMoneyInput(raw: string): number {
  const t = raw.replace(',', '.').trim();
  if (t === '') return NaN;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

function collectStoreLinesFromCatalog(
  rows: StoreItemLine[],
  catalog: StoreProductRow[],
  v: RentalFormValidationMessages
): { ok: true; lines: { product_name: string; unit_price: number }[] } | { ok: false; message: string } {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: { product_name: string; unit_price: number }[] = [];
  for (const r of rows) {
    const name = r.productName.trim();
    const id = r.catalogProductId?.trim() ?? '';
    if (!name && !id) continue;
    if (!id) {
      return { ok: false, message: v.storeMustSelectFromCatalog };
    }
    const prod = byId.get(id);
    if (!prod) {
      return { ok: false, message: v.storeProductNotInCatalog };
    }
    const unit = Math.round(Number(prod.unit_price) * 100) / 100;
    if (!Number.isFinite(unit) || unit < 0) {
      return { ok: false, message: v.storePriceInvalid };
    }
    lines.push({ product_name: prod.name, unit_price: unit });
  }
  return { ok: true, lines };
}

interface RentalFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  pickup: string;
  return_time: string;
  board_checked_by: string;
  customer_notes: string;
  rental_type: string;
  rental_duration: string;
  payment_method: string;
  agreed_to_terms: boolean;
  signature_data: string | null;
}

export default function RentalForm() {
  const [formData, setFormData] = useState<RentalFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    pickup: '',
    return_time: '',
    board_checked_by: '',
    customer_notes: '',
    rental_type: '',
    rental_duration: '',
    payment_method: '',
    agreed_to_terms: false,
    signature_data: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItemLine[]>([]);
  const [productCatalog, setProductCatalog] = useState<StoreProductRow[]>([]);
  const [surfboards, setSurfboards] = useState<SurfboardInventoryRow[]>([]);
  const [surfboardsLoading, setSurfboardsLoading] = useState(true);
  const [boardLines, setBoardLines] = useState(() => [newBoardLine()]);
  const [lang, setLang] = useState<RentalFormLang>('en');
  const t = RENTAL_FORM_STRINGS[lang];

  useEffect(() => {
    fetchStoreProducts()
      .then(setProductCatalog)
      .catch(() => {
        /* catálogo opcional; el formulario sigue sin sugerencias */
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSurfboardsLoading(true);
    fetchSurfboardInventoryForRental()
      .then((rows) => {
        if (!cancelled) setSurfboards(rows);
      })
      .catch(() => {
        if (!cancelled) setSurfboards([]);
      })
      .finally(() => {
        if (!cancelled) setSurfboardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getRentalBasePrice = () => getRentalPriceForSelection(formData.rental_type, formData.rental_duration);

  /** Tablas ya elegidas en el formulario (cada una suma el mismo precio unitario de renta). */
  const selectedBoardCount = boardLines.filter((l) => l.boardNumber.trim().length > 0).length;

  const getRentalSubtotal = () => {
    const unit = getRentalBasePrice();
    if (selectedBoardCount === 0) return 0;
    return unit * selectedBoardCount;
  };

  const boardsForRow = (rowId: string, rowBoard: string): SurfboardInventoryRow[] => {
    const selectedElsewhere = new Set(
      boardLines
        .filter((l) => l.id !== rowId)
        .map((l) => l.boardNumber.trim())
        .filter((n) => n.length > 0)
    );
    return surfboards.filter(
      (b) => !selectedElsewhere.has(b.board_number) || b.board_number === rowBoard
    );
  };

  const getStoreItemsSubtotal = () =>
    storeItems.reduce((sum, row) => {
      const p = parseMoneyInput(row.price.trim());
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);

  const getContractTotal = () => getRentalSubtotal() + getStoreItemsSubtotal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRentalSelect = (option: (typeof RENTAL_OPTIONS)[0]) => {
    setFormData(prev => ({
      ...prev,
      rental_type: option.type,
      rental_duration: option.duration,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const err = t.errors;

    if (!formData.signature_data) {
      setError(err.signRequired);
      setIsSubmitting(false);
      return;
    }

    if (!formData.agreed_to_terms) {
      setError(err.termsRequired);
      setIsSubmitting(false);
      return;
    }

    if (!formData.rental_type || !formData.rental_duration) {
      setError(err.rentalOptionRequired);
      setIsSubmitting(false);
      return;
    }

    if (!formData.payment_method) {
      setError(err.paymentRequired);
      setIsSubmitting(false);
      return;
    }

    if (surfboardsLoading) {
      setError(err.inventoryLoading);
      setIsSubmitting(false);
      return;
    }
    if (surfboards.length === 0) {
      setError(err.noBoardsInInventory);
      setIsSubmitting(false);
      return;
    }
    const nums = boardLines.map((l) => l.boardNumber.trim()).filter((n) => n.length > 0);
    if (nums.length === 0) {
      setError(err.addAtLeastOneBoard);
      setIsSubmitting(false);
      return;
    }
    if (nums.length !== boardLines.length) {
      setError(err.completeOrRemoveBoardRows);
      setIsSubmitting(false);
      return;
    }
    const unique = new Set(nums);
    if (unique.size !== nums.length) {
      setError(err.duplicateBoard);
      setIsSubmitting(false);
      return;
    }
    for (const n of nums) {
      if (!surfboards.some((b) => b.board_number === n)) {
        setError(err.invalidBoard);
        setIsSubmitting(false);
        return;
      }
    }

    const storeResult = collectStoreLinesFromCatalog(storeItems, productCatalog, t.validation);
    if (!storeResult.ok) {
      setError(storeResult.message);
      setIsSubmitting(false);
      return;
    }

    const unitRental = getRentalBasePrice();
    const boardCount = nums.length;
    const rentalBase = unitRental * boardCount;
    const storeTotal = storeResult.lines.reduce((s, l) => s + l.unit_price, 0);
    const contractTotal = rentalBase + storeTotal;

    try {
      await insertRentalAgreementWithStoreItems(
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address || null,
          pickup: formData.pickup || null,
          return_time: formData.return_time || null,
          surfboard_number: nums[0],
          board_checked_by: formData.board_checked_by || null,
          customer_notes: formData.customer_notes.trim() || null,
          rental_type: formData.rental_type,
          rental_duration: formData.rental_duration,
          rental_price: contractTotal,
          payment_method: formData.payment_method,
          contract_paid: false,
          signature_data: formData.signature_data,
          agreed_to_terms: formData.agreed_to_terms,
          status: 'pending',
        },
        storeResult.lines,
        nums
      );

      setIsSuccess(true);
      setStoreItems([]);
      fetchStoreProducts()
        .then(setProductCatalog)
        .catch(() => {});
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        pickup: '',
        return_time: '',
        board_checked_by: '',
        customer_notes: '',
        rental_type: '',
        rental_duration: '',
        payment_method: '',
        agreed_to_terms: false,
        signature_data: null,
      });
      setBoardLines([newBoardLine()]);

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-12 text-center border border-transparent dark:border-slate-700">
          <CheckCircle2 className="w-20 h-20 text-green-500 dark:text-emerald-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-4">{t.successTitle}</h2>
          <p className="text-gray-600 dark:text-slate-400 text-lg">{t.successBody}</p>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="mt-8 px-8 py-3 bg-blue-600 dark:bg-cyan-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-600 transition font-semibold"
          >
            {t.successAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-transparent dark:border-slate-700">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-950 dark:to-slate-900 p-8 text-white border-b border-blue-900/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex items-center justify-center gap-3 flex-1">
              <Waves className="w-12 h-12 shrink-0" />
              <h1 className="text-4xl font-bold">Agua Tibia</h1>
            </div>
            <div className="flex justify-center sm:justify-end sm:pt-1">
              <button
                type="button"
                onClick={() => setLang((l) => (l === 'en' ? 'es' : 'en'))}
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-sm font-semibold transition"
              >
                {lang === 'en' ? t.langSwitchToEs : t.langSwitchToEn}
              </button>
            </div>
          </div>
          <p className="text-center text-xl opacity-95">{t.headerSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="form-label" htmlFor="rental-name">
                {t.fullName}
              </label>
              <input
                id="rental-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder={t.namePlaceholder}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="rental-email">
                {t.email}
              </label>
              <input
                id="rental-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder={t.emailPlaceholder}
              />
            </div>

            <div>
              <label className="form-label">
                {t.phone}
              </label>
              <PhoneInput
                international
                defaultCountry="CR"
                value={formData.phone}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
                className="phone-input-custom"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="rental-address">
                {t.address}
              </label>
              <input
                id="rental-address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="form-input"
                placeholder={t.addressPlaceholder}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="rental-pickup">
                {t.pickup}
              </label>
              <input
                id="rental-pickup"
                type="datetime-local"
                name="pickup"
                value={formData.pickup}
                onChange={handleInputChange}
                className="form-input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="rental-return">
                {t.returnLabel}
              </label>
              <input
                id="rental-return"
                type="datetime-local"
                name="return_time"
                value={formData.return_time}
                onChange={handleInputChange}
                className="form-input [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <label className="form-label mb-0">{t.boardsSection}</label>
                <button
                  type="button"
                  onClick={() => setBoardLines((prev) => [...prev, newBoardLine()])}
                  disabled={surfboardsLoading || surfboards.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-cyan-500 text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {t.addBoard}
                </button>
              </div>
              {surfboardsLoading ? (
                <p className="text-sm text-gray-600 dark:text-slate-400 py-2">{t.loadingBoards}</p>
              ) : surfboards.length === 0 ? (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  {t.noBoardsWarning}
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {boardLines.map((row, index) => (
                      <div
                        key={row.id}
                        className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-800/40 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-500 dark:text-slate-500 block mb-1">
                            {t.boardRowLabel(index + 1)}
                          </span>
                          <SurfboardCombobox
                            id={`rental-board-${row.id}`}
                            boards={boardsForRow(row.id, row.boardNumber)}
                            value={row.boardNumber}
                            onChange={(boardNumber) =>
                              setBoardLines((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, boardNumber } : r))
                              )
                            }
                            disabled={surfboardsLoading}
                            labels={t.surfboardCombobox}
                          />
                        </div>
                        {boardLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBoardLines((prev) => prev.filter((r) => r.id !== row.id))}
                            className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0 self-end sm:self-center"
                            aria-label={t.removeBoardAria}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">{t.boardsHelp}</p>
                </>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="rental-checked-by">
                {t.boardCheckedBy}
              </label>
              <select
                id="rental-checked-by"
                name="board_checked_by"
                value={formData.board_checked_by}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="">{t.selectStaff}</option>
                <option value="Alexander">Alexander</option>
                <option value="Martin">Martin</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="form-label" htmlFor="rental-customer-notes">
                {t.customerComments}
              </label>
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">{t.customerCommentsHint}</p>
              <textarea
                id="rental-customer-notes"
                name="customer_notes"
                value={formData.customer_notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, customer_notes: e.target.value }))}
                rows={4}
                className="form-input min-h-[6rem] resize-y"
                placeholder={t.customerCommentsPlaceholder}
              />
            </div>
          </div>

          <div>
            <p className="form-label mb-4">{t.rentalOptionsSection}</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {RENTAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRentalSelect(option)}
                  className={`h-full min-h-[7.5rem] flex flex-col p-4 border-2 rounded-lg text-left transition ${
                    formData.rental_type === option.type && formData.rental_duration === option.duration
                      ? 'border-blue-500 bg-blue-50 shadow-md dark:border-cyan-500 dark:bg-slate-800/80'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50 dark:border-slate-600 dark:hover:border-cyan-600 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-semibold text-gray-800 dark:text-slate-100 leading-snug flex-1">
                    {t.rentalOptionLabels[option.id] ?? option.label}
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-cyan-400 mt-3 shrink-0">
                    ${option.price}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-600 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <p className="form-label mb-0">{t.storeItemsSection}</p>
              <button
                type="button"
                onClick={() => setStoreItems((prev) => [...prev, newStoreLine()])}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-cyan-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 font-medium text-sm transition"
              >
                <Plus className="w-4 h-4" />
                {t.addProduct}
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{t.storeHelp}</p>

            {storeItems.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border-2 border-gray-200 dark:border-slate-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 min-w-[28rem] w-[28rem]">
                        {t.storeTableProduct}
                      </th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 w-36">
                        {t.storeTablePrice}
                      </th>
                      <th className="w-12 px-1" aria-label={t.removeRowAria} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                    {storeItems.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 align-top min-w-[28rem] w-[28rem]">
                          <StoreProductLineInput
                            row={row}
                            catalog={productCatalog}
                            mode="catalog"
                            catalogUi={{
                              placeholder: t.storeCatalogSearchPlaceholder,
                              noResults: t.storeCatalogNoMatch,
                            }}
                            onChange={(lineId, patch) =>
                              setStoreItems((prev) =>
                                prev.map((r) => (r.id === lineId ? { ...r, ...patch } : r))
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span className="inline-block py-2 text-sm tabular-nums text-gray-800 dark:text-slate-200">
                            {(() => {
                              const n = parseMoneyInput(row.price);
                              return row.catalogProductId && Number.isFinite(n)
                                ? `$${n.toFixed(2)}`
                                : '—';
                            })()}
                          </span>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setStoreItems((prev) => prev.filter((r) => r.id !== row.id))}
                            className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            aria-label={t.removeRowAria}
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
              <p className="text-sm text-gray-500 dark:text-slate-500 italic">{t.noStoreItems}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-4 justify-end items-baseline text-sm">
              <span className="text-gray-600 dark:text-slate-400">
                {t.pricePerBoard}{' '}
                <strong className="text-gray-900 dark:text-slate-100">${getRentalBasePrice().toFixed(2)}</strong>
              </span>
              {selectedBoardCount > 0 && (
                <span className="text-gray-600 dark:text-slate-400">
                  {t.rentLine(
                    selectedBoardCount,
                    getRentalBasePrice().toFixed(2),
                    getRentalSubtotal().toFixed(2)
                  )}
                </span>
              )}
              {getStoreItemsSubtotal() > 0 && (
                <span className="text-gray-600 dark:text-slate-400">
                  {t.storeTotal}{' '}
                  <strong className="text-gray-900 dark:text-slate-100">${getStoreItemsSubtotal().toFixed(2)}</strong>
                </span>
              )}
              <span className="text-base font-bold text-blue-600 dark:text-cyan-400">
                {t.contractTotal} ${getContractTotal().toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <p className="form-label">{t.paymentMethod}</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'cash' }))}
                className={`flex-1 p-4 border-2 rounded-lg font-semibold transition ${
                  formData.payment_method === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-cyan-500 dark:bg-slate-800 dark:text-cyan-300'
                    : 'border-gray-300 hover:border-blue-300 dark:border-slate-600 dark:text-slate-200 dark:hover:border-cyan-600'
                }`}
              >
                {t.payCash.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'card' }))}
                className={`flex-1 p-4 border-2 rounded-lg font-semibold transition ${
                  formData.payment_method === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-cyan-500 dark:bg-slate-800 dark:text-cyan-300'
                    : 'border-gray-300 hover:border-blue-300 dark:border-slate-600 dark:text-slate-200 dark:hover:border-cyan-600'
                }`}
              >
                {t.payCard.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800/60 p-6 rounded-lg border-2 border-gray-200 dark:border-slate-600">
            <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-slate-100">{t.termsTitle}</h3>
            <div className="text-sm text-gray-700 dark:text-slate-300 space-y-2 max-h-48 overflow-y-auto">
              {t.termsParagraphs.map((para, i) => (
                <p
                  key={i}
                  className={
                    i === 0 || i === 3
                      ? i === 3
                        ? 'font-semibold mt-3'
                        : 'font-semibold'
                      : ''
                  }
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="form-label mb-3">{t.signatureTitle}</p>
            <SignatureCanvas
              onSignatureChange={(sig) => setFormData(prev => ({ ...prev, signature_data: sig }))}
              value={formData.signature_data}
            />
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">{t.signatureHelp}</p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="agreed_to_terms"
              checked={formData.agreed_to_terms}
              onChange={handleInputChange}
              required
              className="w-5 h-5 mt-1 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-200 dark:border-slate-500 dark:bg-slate-800 dark:focus:ring-cyan-900"
            />
            <label className="text-sm text-gray-700 dark:text-slate-300">{t.agreeCheckbox}</label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting || surfboardsLoading || surfboards.length === 0
            }
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-950 dark:to-cyan-800 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-cyan-700 dark:hover:from-blue-900 dark:hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isSubmitting ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
