import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Armchair, BarChart3, LayoutDashboard, LogOut, ShoppingBag, User, Waves } from 'lucide-react';
import { adminPath, type AdminSection } from '../../config/adminPaths';
import { useAuth } from '../../contexts/AuthContext';

export type { AdminSection };

type Props = {
  children: ReactNode;
};

const nav: {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard | typeof Waves | typeof Armchair | typeof ShoppingBag | typeof BarChart3;
}[] = [
  { id: 'contracts', label: 'Acuerdos de renta', icon: LayoutDashboard },
  { id: 'metrics', label: 'Analítica y reportes', icon: BarChart3 },
  { id: 'inventory', label: 'Inventario de tablas', icon: Waves },
  { id: 'storeArticles', label: 'Artículos de tienda', icon: ShoppingBag },
  { id: 'rentalArticles', label: 'Artículos de renta', icon: Armchair },
];

export default function AdminLayout({ children }: Props) {
  const { signOut, user } = useAuth();
  const email = user?.email ?? '';
  const fullName =
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  const sessionTooltip = [fullName, email].filter(Boolean).join(' · ') || undefined;
  const sessionDisplay = fullName || email || '—';

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <header className="flex flex-row flex-wrap items-center justify-end gap-2 px-3 py-2 sm:px-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 shrink-0">
        <div className="flex items-center gap-2 min-w-0 max-w-[min(100%,calc(100vw-11rem))] sm:max-w-md">
          <User className="w-4 h-4 text-gray-500 dark:text-slate-500 shrink-0" aria-hidden />
          <span
            className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate"
            title={sessionTooltip}
          >
            {sessionDisplay}
          </span>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold leading-tight text-red-800 shadow-sm transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/70 sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0 sm:w-4 sm:h-4" aria-hidden />
          Cerrar sesión
        </button>
      </header>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
      <aside className="shrink-0 w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 md:min-h-0 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">Panel</p>
          <p className="font-bold text-gray-900 dark:text-slate-100 mt-1">Agua Tibia</p>
        </div>
        <nav className="p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={adminPath(item.id)}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 w-full text-left px-2 py-2 rounded-md text-xs font-medium transition whitespace-nowrap md:gap-2 md:px-3 md:rounded-lg md:text-sm ${
                    isActive
                      ? 'bg-blue-100 text-blue-900 dark:bg-cyan-950/80 dark:text-cyan-200 ring-1 ring-blue-200 dark:ring-cyan-900/50'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}
