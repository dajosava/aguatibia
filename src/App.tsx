import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import RentalForm from './components/RentalForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import SurfboardInventoryPage from './components/admin/SurfboardInventoryPage';
import StoreArticlesCatalogPage from './components/admin/StoreArticlesCatalogPage';
import RentalArticlesInventoryPage from './components/admin/RentalArticlesInventoryPage';
import AdminMetricsPage from './components/admin/AdminMetricsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FileText } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import HeaderTideStatus from './components/HeaderTideStatus';

function RootLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <nav className="bg-white shadow-md border-b-2 border-blue-100 dark:bg-slate-900 dark:border-slate-700 dark:shadow-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link to="/" className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <img
                  src="/aguatibialogo.png"
                  alt="Agua Tibia"
                  className="h-16 sm:h-20 md:h-24 lg:h-[6.5rem] w-auto max-w-[min(100%,720px)] object-contain shrink-0 rounded-lg"
                />
              </Link>
              <div className="min-w-0 pt-0.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Agua Tibia Surf School
                </h1>
                <HeaderTideStatus />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ThemeToggle />
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md dark:bg-cyan-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`
                }
              >
                <FileText className="w-5 h-5" />
                Formulario
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-12 dark:bg-slate-900 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-gray-600 text-sm dark:text-slate-400">
            Developed by{' '}
            <a
              href="https://davidsalazarvalverde.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium transition dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              David Salazar V
            </a>
          </p>
          <div>
            {isAdminRoute ? (
              <Link
                to="/"
                className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
              >
                Ir al formulario público
              </Link>
            ) : (
              <Link
                to="/admin"
                className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
              >
                Admin panel
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function AdminShell() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh] text-gray-600 dark:text-slate-400">
        Cargando sesión…
      </div>
    );
  }
  if (!session) {
    return <AdminLogin />;
  }
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<RentalForm />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="acuerdos" replace />} />
          <Route path="acuerdos" element={<AdminDashboard />} />
          <Route path="metricas" element={<AdminMetricsPage />} />
          <Route path="tablas" element={<SurfboardInventoryPage />} />
          <Route path="tienda" element={<StoreArticlesCatalogPage />} />
          <Route path="articulos-renta" element={<RentalArticlesInventoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
