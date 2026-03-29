import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Armchair, BarChart3, LayoutDashboard, LogOut, ShoppingBag, User, Waves } from 'lucide-react';
import {
  ADMIN_AUTO_REFRESH_EVENT,
  ADMIN_AUTO_REFRESH_INTERVAL_MS,
} from '../../config/adminAutoRefresh';
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

  useEffect(() => {
    const id = window.setInterval(() => {
      window.dispatchEvent(new CustomEvent(ADMIN_AUTO_REFRESH_EVENT));
    }, ADMIN_AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const email = user?.email ?? '';
  const fullName =
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  const sessionTooltip = [fullName, email].filter(Boolean).join(' · ') || undefined;
  const sessionDisplay = fullName || email || '—';

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <aside
        className="shrink-0 w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 md:min-h-0 flex flex-col md:sticky md:top-36 lg:top-44 md:z-30 md:self-start md:max-h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-12rem)] md:overflow-y-auto md:overscroll-y-contain"
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">Panel</p>
          <p className="font-bold text-gray-900 dark:text-slate-100 mt-1">Agua Tibia</p>
        </div>
        <nav className="p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible md:overflow-y-auto md:flex-1 md:min-h-0">
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

        <div className="mt-auto shrink-0 border-t border-gray-200 dark:border-slate-700 p-3 md:p-4 bg-gray-50/90 dark:bg-slate-800/50">
          <div className="flex items-start gap-2 min-w-0 mb-3">
            <User className="w-4 h-4 text-gray-500 dark:text-slate-500 shrink-0 mt-0.5" aria-hidden />
            <span
              className="text-xs md:text-sm font-medium text-gray-800 dark:text-slate-100 break-words"
              title={sessionTooltip}
            >
              {sessionDisplay}
            </span>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/70"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 m-0 mt-0 pt-0 overflow-x-auto">{children}</div>
    </div>
  );
}
