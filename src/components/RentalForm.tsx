import { useState, useEffect } from 'react';
import { Waves, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import SignatureCanvas from './SignatureCanvas';
import SurfboardCombobox from './SurfboardCombobox';
import StoreProductLineInput, { type StoreItemLine } from './StoreProductLineInput';
import { RENTAL_OPTIONS, getRentalPriceForSelection } from '../config/rentalOptions';
import { insertRentalAgreementWithStoreItems } from '../services/rentalAgreementService';
import { fetchStoreProducts } from '../services/storeCatalogService';
import { fetchSurfboardInventoryForRental } from '../services/surfboardInventoryService';
import type { StoreProductRow } from '../types/storeProduct';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';

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

interface RentalFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  pickup: string;
  return_time: string;
  surfboard_number: string;
  board_checked_by: string;
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
    surfboard_number: '',
    board_checked_by: '',
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

  const getStoreItemsSubtotal = () =>
    storeItems.reduce((sum, row) => {
      const p = parseMoneyInput(row.price.trim());
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);

  const getContractTotal = () => getRentalBasePrice() + getStoreItemsSubtotal();

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

    if (!formData.signature_data) {
      setError('Please sign the agreement before submitting');
      setIsSubmitting(false);
      return;
    }

    if (!formData.agreed_to_terms) {
      setError('You must accept the terms and conditions');
      setIsSubmitting(false);
      return;
    }

    if (!formData.rental_type || !formData.rental_duration) {
      setError('Selecciona una opción de renta');
      setIsSubmitting(false);
      return;
    }

    if (!formData.payment_method) {
      setError('Selecciona un método de pago');
      setIsSubmitting(false);
      return;
    }

    if (surfboardsLoading) {
      setError('Espera a que cargue el inventario de tablas.');
      setIsSubmitting(false);
      return;
    }
    if (surfboards.length === 0) {
      setError('No hay tablas disponibles en inventario. Contacta a la escuela.');
      setIsSubmitting(false);
      return;
    }
    const boardNum = formData.surfboard_number.trim();
    if (!boardNum) {
      setError('Selecciona una tabla del inventario.');
      setIsSubmitting(false);
      return;
    }
    if (!surfboards.some((b) => b.board_number === boardNum)) {
      setError('La tabla seleccionada no es válida.');
      setIsSubmitting(false);
      return;
    }

    const storeResult = collectStoreLines(storeItems);
    if (!storeResult.ok) {
      setError(storeResult.message);
      setIsSubmitting(false);
      return;
    }

    const rentalBase = getRentalBasePrice();
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
          surfboard_number: boardNum,
          board_checked_by: formData.board_checked_by || null,
          rental_type: formData.rental_type,
          rental_duration: formData.rental_duration,
          rental_price: contractTotal,
          payment_method: formData.payment_method,
          contract_paid: false,
          signature_data: formData.signature_data,
          agreed_to_terms: formData.agreed_to_terms,
          status: 'pending',
        },
        storeResult.lines
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
        surfboard_number: '',
        board_checked_by: '',
        rental_type: '',
        rental_duration: '',
        payment_method: '',
        agreed_to_terms: false,
        signature_data: null,
      });

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-12 text-center border border-transparent dark:border-slate-700">
          <CheckCircle2 className="w-20 h-20 text-green-500 dark:text-emerald-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-4">¡Formulario Enviado!</h2>
          <p className="text-gray-600 dark:text-slate-400 text-lg">
            Gracias por completar el acuerdo de renta. Nos pondremos en contacto contigo pronto.
          </p>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="mt-8 px-8 py-3 bg-blue-600 dark:bg-cyan-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-600 transition font-semibold"
          >
            Enviar otro formulario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-transparent dark:border-slate-700">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-950 dark:to-slate-900 p-8 text-white border-b border-blue-900/30">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Waves className="w-12 h-12" />
            <h1 className="text-4xl font-bold">Agua Tibia</h1>
          </div>
          <p className="text-center text-xl opacity-95">Surfboard Rental Agreement</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="form-label" htmlFor="rental-name">
                Full Name *
              </label>
              <input
                id="rental-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="rental-email">
                Email *
              </label>
              <input
                id="rental-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="form-label">
                Phone *
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
                Address
              </label>
              <input
                id="rental-address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Your address"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="rental-pickup">
                Pickup
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
                Return
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

            <div>
              <label className="form-label" htmlFor="rental-board-num">
                Tabla de surf *
              </label>
              {surfboardsLoading ? (
                <p className="text-sm text-gray-600 dark:text-slate-400 py-2">Cargando inventario de tablas…</p>
              ) : surfboards.length === 0 ? (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  No hay tablas en inventario. El personal debe registrar tablas en el panel administrativo antes de
                  poder enviar contratos.
                </p>
              ) : (
                <>
                  <SurfboardCombobox
                    id="rental-board-num"
                    boards={surfboards}
                    value={formData.surfboard_number}
                    onChange={(boardNumber) =>
                      setFormData((prev) => ({ ...prev, surfboard_number: boardNumber }))
                    }
                    disabled={surfboardsLoading}
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Busca por marca, número o abre la lista. Se muestra marca y número; el contrato guarda el número de
                    tabla. Solo se listan tablas en estado Disponible en el inventario.
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="rental-checked-by">
                Board Checked By
              </label>
              <select
                id="rental-checked-by"
                name="board_checked_by"
                value={formData.board_checked_by}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="">Select...</option>
                <option value="Alexander">Alexander</option>
                <option value="Martin">Martin</option>
              </select>
            </div>
          </div>

          <div>
            <p className="form-label mb-4">Rental Options *</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RENTAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRentalSelect(option)}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    formData.rental_type === option.type && formData.rental_duration === option.duration
                      ? 'border-blue-500 bg-blue-50 shadow-md dark:border-cyan-500 dark:bg-slate-800/80'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50 dark:border-slate-600 dark:hover:border-cyan-600 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="font-semibold text-gray-800 dark:text-slate-100">{option.label}</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-cyan-400 mt-2">${option.price}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-600 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <p className="form-label mb-0">Store Items</p>
              <button
                type="button"
                onClick={() => setStoreItems((prev) => [...prev, newStoreLine()])}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-cyan-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 font-medium text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add product
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Opcional: productos de tienda. Abre la lista con la flecha o escribe para filtrar; al elegir un producto
              guardado, el precio se rellena solo. También puedes escribir un nombre y precio nuevos; al enviar el
              contrato se guardan en el catálogo.
            </p>

            {storeItems.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border-2 border-gray-200 dark:border-slate-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 min-w-[28rem] w-[28rem]">
                        Product
                      </th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-slate-200 w-36">Price (USD)</th>
                      <th className="w-12 px-1" aria-label="Remove row" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                    {storeItems.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 align-top min-w-[28rem] w-[28rem]">
                          <StoreProductLineInput
                            row={row}
                            catalog={productCatalog}
                            onChange={(lineId, patch) =>
                              setStoreItems((prev) =>
                                prev.map((r) => (r.id === lineId ? { ...r, ...patch } : r))
                              )
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
                            aria-label="Remove line"
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
              <p className="text-sm text-gray-500 dark:text-slate-500 italic">No store items added.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-4 justify-end items-baseline text-sm">
              <span className="text-gray-600 dark:text-slate-400">
                Rental: <strong className="text-gray-900 dark:text-slate-100">${getRentalBasePrice().toFixed(2)}</strong>
              </span>
              {getStoreItemsSubtotal() > 0 && (
                <span className="text-gray-600 dark:text-slate-400">
                  Store: <strong className="text-gray-900 dark:text-slate-100">${getStoreItemsSubtotal().toFixed(2)}</strong>
                </span>
              )}
              <span className="text-base font-bold text-blue-600 dark:text-cyan-400">
                Contract total: ${getContractTotal().toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <p className="form-label">Payment Method *</p>
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
                CASH
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
                CARD
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800/60 p-6 rounded-lg border-2 border-gray-200 dark:border-slate-600">
            <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-slate-100">Terms and Conditions</h3>
            <div className="text-sm text-gray-700 dark:text-slate-300 space-y-2 max-h-48 overflow-y-auto">
              <p className="font-semibold">Payment must be made in full when signing this agreement.</p>
              <p>• There are no refunds for early returns.</p>
              <p>• All boards will be examined before departure and upon return.</p>
              <p className="font-semibold mt-3">WAIVER AND ASSUMPTION OF RISK</p>
              <p>
                The undersigned voluntarily makes and grants this Waiver and Assumption of Risk in favor of Agua Tibia
                Surf School SA. I hereby waive and release from any and all claims for negligence or strict liability
                arising from my use or misuse of products provided while testing, including surfboards, surfboard fins
                and any other product offered by Agua Tibia Surf School SA.
              </p>
              <p>
                I understand, acknowledge and fully accept that surfing is a dangerous activity with inherent risk and
                hazards such as the possibility of injury to myself and others, damage to my boards, or the boards of
                others or even death, and that I nevertheless accept.
              </p>
            </div>
          </div>

          <div>
            <p className="form-label mb-3">Digital Signature *</p>
            <SignatureCanvas
              onSignatureChange={(sig) => setFormData(prev => ({ ...prev, signature_data: sig }))}
              value={formData.signature_data}
            />
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
              Draw your signature in the box using your mouse or finger on touch devices
            </p>
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
            <label className="text-sm text-gray-700 dark:text-slate-300">
              I accept that I am a competent adult assuming the risk of my own free will, without being under
              any compulsion or coercion. I have checked my board for damage and confirm before signing. *
            </label>
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
            {isSubmitting ? 'Submitting...' : 'Submit Rental Agreement'}
          </button>
        </form>
      </div>
    </div>
  );
}
