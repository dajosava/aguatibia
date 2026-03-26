import type { ReactNode } from 'react';
import { Armchair, LayoutDashboard, LogOut, ShoppingBag, Waves } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type AdminSection = 'contracts' | 'inventory' | 'storeArticles' | 'rentalArticles';

type Props = {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
  children: ReactNode;
};

const nav: {
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard | typeof Waves | typeof Armchair | typeof ShoppingBag;
}[] = [
  { id: 'contracts', label: 'Acuerdos de renta', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventario de tablas', icon: Waves },
  { id: 'storeArticles', label: 'Artículos de tienda', icon: ShoppingBag },
  { id: 'rentalArticles', label: 'Artículos de renta', icon: Armchair },
];

export default function AdminLayout({ active, onNavigate, children }: Props) {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <aside className="shrink-0 w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 md:min-h-[calc(100vh-5rem)] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">Panel</p>
          <p className="font-bold text-gray-900 dark:text-slate-100 mt-1">Agua Tibia</p>
        </div>
        <nav className="p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-100 text-blue-900 dark:bg-cyan-950/80 dark:text-cyan-200 ring-1 ring-blue-200 dark:ring-cyan-900/50'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-3 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-x-auto">{children}</div>
    </div>
  );
}
