/**
 * Listados de tablas en panel admin: si hay más de 10 filas de datos, limitar altura y permitir scroll
 * (misma convención que «Acuerdos de renta» en AdminDashboard).
 */
export function adminDataTableWrapperClass(dataRowCount: number): string {
  return dataRowCount > 10
    ? 'max-h-[min(70vh,40rem)] overflow-x-auto overflow-y-auto overscroll-y-contain'
    : 'overflow-x-auto';
}

/** Cabecera fija al hacer scroll vertical (usar junto con adminDataTableWrapperClass). */
export const ADMIN_TABLE_THEAD_STICKY =
  'sticky top-0 z-10 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-600';
