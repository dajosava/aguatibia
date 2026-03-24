import type { SurfboardInventoryRow } from '../types/surfboardInventory';

/** Texto que ve el cliente en el formulario: marca + número (sin descripción interna). */
export function formatSurfboardPublicLabel(
  row: Pick<SurfboardInventoryRow, 'brand' | 'board_number'>
): string {
  const brand = (row.brand ?? '').trim();
  const num = (row.board_number ?? '').trim();
  if (brand && num) return `${brand} · ${num}`;
  return num || brand || '';
}

/** Resuelve una fila a partir del texto escogido o escrito (número o etiqueta completa). */
export function findSurfboardByInput(
  boards: SurfboardInventoryRow[],
  input: string
): SurfboardInventoryRow | undefined {
  const t = input.trim().toLowerCase();
  if (!t) return undefined;
  return boards.find((b) => {
    if (b.board_number.trim().toLowerCase() === t) return true;
    return formatSurfboardPublicLabel(b).toLowerCase() === t;
  });
}
