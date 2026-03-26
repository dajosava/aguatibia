import type { StoreItemLine } from '../components/StoreProductLineInput';
import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';
import type { StoreProductRow } from '../types/storeProduct';
import { parseStoreLineQuantity } from './storeLineQuantity';

/**
 * Cantidad máxima que puede tomar esta línea sin superar el inventario del catálogo,
 * restando lo ya pedido en otras filas del mismo producto (mismo catalogProductId).
 */
export function maxQuantityForPublicStoreRow(
  row: StoreItemLine,
  allRows: StoreItemLine[],
  catalog: StoreProductRow[]
): number | undefined {
  const cid = row.catalogProductId?.trim();
  if (!cid) return undefined;
  const prod = catalog.find((p) => p.id === cid);
  if (!prod) return undefined;
  const stock = Number(prod.stock_quantity ?? 0);
  let others = 0;
  for (const r of allRows) {
    if (r.id === row.id) continue;
    if (r.catalogProductId?.trim() !== cid) continue;
    others += parseStoreLineQuantity(r) ?? 1;
  }
  return Math.max(0, stock - others);
}

/**
 * Igual que el formulario público, pero el inventario “disponible” incluye las unidades
 * ya reservadas en este acuerdo (se repone al guardar antes de insertar las líneas nuevas).
 */
export function maxQuantityForEditStoreRow(
  row: StoreItemLine,
  allRows: StoreItemLine[],
  catalog: StoreProductRow[],
  agreement: RentalAgreementWithStoreItems
): number | undefined {
  const cid = row.catalogProductId?.trim();
  if (!cid) return undefined;
  const prod = catalog.find((p) => p.id === cid);
  if (!prod) return undefined;
  const nameKey = prod.name.trim().toLowerCase();
  const oldCount = (agreement.rental_agreement_store_items ?? []).filter(
    (it) => it.product_name.trim().toLowerCase() === nameKey
  ).length;
  const available = Number(prod.stock_quantity ?? 0) + oldCount;
  let others = 0;
  for (const r of allRows) {
    if (r.id === row.id) continue;
    if (r.catalogProductId?.trim() !== cid) continue;
    others += parseStoreLineQuantity(r) ?? 1;
  }
  return Math.max(0, available - others);
}

/** Ajusta cantidades si alguna fila supera el máximo permitido (p. ej. otra fila del mismo producto subió). */
export function clampPublicStoreQuantities(
  rows: StoreItemLine[],
  catalog: StoreProductRow[]
): StoreItemLine[] {
  let current = rows;
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    const next = current.map((row) => {
      const m = maxQuantityForPublicStoreRow(row, current, catalog);
      if (m == null) return row;
      const q = parseStoreLineQuantity(row) ?? 1;
      if (q > m) {
        const nq = m < 1 ? 1 : m;
        if (nq !== q) {
          changed = true;
          return { ...row, quantity: nq };
        }
      }
      return row;
    });
    if (!changed) return next;
    current = next;
  }
  return current;
}

export function clampEditStoreQuantities(
  rows: StoreItemLine[],
  catalog: StoreProductRow[],
  agreement: RentalAgreementWithStoreItems
): StoreItemLine[] {
  let current = rows;
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    const next = current.map((row) => {
      const m = maxQuantityForEditStoreRow(row, current, catalog, agreement);
      if (m == null) return row;
      const q = parseStoreLineQuantity(row) ?? 1;
      if (q > m) {
        const nq = m < 1 ? 1 : m;
        if (nq !== q) {
          changed = true;
          return { ...row, quantity: nq };
        }
      }
      return row;
    });
    if (!changed) return next;
    current = next;
  }
  return current;
}
