import type { StoreItemLine } from '../components/StoreProductLineInput';

/** Entero ≥ 1 para líneas de tienda; null si no es válido. */
export function parseStoreLineQuantity(r: StoreItemLine): number | null {
  const raw = r.quantity ?? 1;
  const q = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(q) || !Number.isInteger(q) || q < 1) return null;
  return q;
}
