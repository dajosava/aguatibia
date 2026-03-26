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
import { PublicFormLangProvider, usePublicFormLang } from './contexts/PublicFormLangContext';
import type { FormPageFooterStrings } from './config/rentalFormLocales';
import { FORM_PAGE_FOOTER_STRINGS } from './config/rentalFormLocales';
import { FileText, Mail, MapPin, Phone } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import HeaderTideStatus from './components/HeaderTideStatus';
import { useCostaRicaClock } from './hooks/useCostaRicaClock';

function FooterAguaTibiaContact({ formFooter }: { formFooter: FormPageFooterStrings }) {
  return (
    <div className="max-w-3xl mx-auto mb-6 text-left">
      <div className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-800/40 p-4 sm:p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          {formFooter.contactCardTitle}
        </h2>
        <ul className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
          <li className="flex gap-3">
            <Phone
              className="w-5 h-5 shrink-0 text-blue-600 dark:text-cyan-400 mt-0.5"
              aria-hidden
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                {formFooter.phoneLabel}
              </div>
              <div className="mt-1 flex flex-col gap-1.5">
                <a
                  href="tel:+50685834946"
                  className="inline-block font-medium text-blue-700 hover:text-blue-900 dark:text-cyan-300 dark:hover:text-cyan-200 underline-offset-2 hover:underline"
                >
                  (+506) 8583 4946
                </a>
                <a
                  href="tel:+50626825508"
                  className="inline-block font-medium text-blue-700 hover:text-blue-900 dark:text-cyan-300 dark:hover:text-cyan-200 underline-offset-2 hover:underline"
                >
                  (+506) 2682 5508
                </a>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <Mail
              className="w-5 h-5 shrink-0 text-blue-600 dark:text-cyan-400 mt-0.5"
              aria-hidden
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                {formFooter.emailLabel}
              </div>
              <a
                href="mailto:info@aguatibia.com"
                className="mt-1 inline-block font-medium text-blue-700 hover:text-blue-900 dark:text-cyan-300 dark:hover:text-cyan-200 underline-offset-2 hover:underline"
              >
                info@aguatibia.com
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <MapPin
              className="w-5 h-5 shrink-0 text-blue-600 dark:text-cyan-400 mt-0.5"
              aria-hidden
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                {formFooter.addressLabel}
              </div>
              <p className="mt-1 leading-relaxed text-gray-800 dark:text-slate-200">
                {formFooter.contactAddress}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

function AdminFooterMinimal() {
  const { lang } = usePublicFormLang();
  const { now, label } = useCostaRicaClock(lang);

  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-12 dark:bg-slate-900 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center text-sm text-gray-600 dark:text-slate-400">
        <time dateTime={now.toISOString()} className="tabular-nums">
          {label}
        </time>
        <span className="hidden sm:inline text-gray-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <p>
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
      </div>
    </footer>
  );
}

function RootLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isFormPage = location.pathname === '/';
  const { lang } = usePublicFormLang();
  const formFooter = FORM_PAGE_FOOTER_STRINGS[lang];

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

      {isAdminRoute ? (
        <AdminFooterMinimal />
      ) : (
        <footer className="bg-white border-t border-gray-200 py-6 mt-12 dark:bg-slate-900 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
            {isFormPage ? (
              <div className="max-w-3xl mx-auto mb-8 text-left space-y-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  {formFooter.mapHeading}
                </h3>
                <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/50 shadow-sm aspect-[4/3] max-h-[min(28rem,70vh)] sm:aspect-video">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.95741010687!2d-85.66641152424887!3d9.937501790164752!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f9e543fdd52643d%3A0x1df084268dce53fd!2sAgua%20Tibia%20Surf%20School!5e0!3m2!1ses!2scr!4v1774557467869!5m2!1ses!2scr"
                    className="absolute inset-0 h-full w-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={formFooter.mapIframeTitle}
                  />
                </div>
              </div>
            ) : null}

            <FooterAguaTibiaContact formFooter={formFooter} />

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
              <Link
                to="/admin"
                className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
              >
                Admin panel
              </Link>
            </div>
          </div>
        </footer>
      )}
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
      <PublicFormLangProvider>
        <AppRoutes />
      </PublicFormLangProvider>
    </AuthProvider>
  );
}
