export type AdminSection =
  | 'contracts'
  | 'inventory'
  | 'storeArticles'
  | 'rentalArticles'
  | 'metrics';

/** Segmentos de URL bajo `/admin/...` */
export const ADMIN_PATH_SEGMENTS: Record<AdminSection, string> = {
  contracts: 'acuerdos',
  metrics: 'metricas',
  inventory: 'tablas',
  storeArticles: 'tienda',
  rentalArticles: 'articulos-renta',
};

export function adminPath(section: AdminSection): string {
  return `/admin/${ADMIN_PATH_SEGMENTS[section]}`;
}
