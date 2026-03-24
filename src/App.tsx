import { useState } from 'react';
import RentalForm from './components/RentalForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import SurfboardInventoryPage from './components/admin/SurfboardInventoryPage';
import type { AdminSection } from './components/admin/AdminLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LayoutDashboard, FileText } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';

function AppContent() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<'form' | 'admin'>('form');
  const [adminSection, setAdminSection] = useState<AdminSection>('contracts');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <nav className="bg-white shadow-md border-b-2 border-blue-100 dark:bg-slate-900 dark:border-slate-700 dark:shadow-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src="/agtlogo.png" alt="Agua Tibia" className="h-[4.5rem] sm:h-24 w-auto max-w-[min(100%,380px)] object-contain" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Agua Tibia Surf School</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setView('form')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                  view === 'form'
                    ? 'bg-blue-600 text-white shadow-md dark:bg-cyan-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-5 h-5" />
                Formulario
              </button>
              <button
                type="button"
                onClick={() => setView('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                  view === 'admin'
                    ? 'bg-blue-600 text-white shadow-md dark:bg-cyan-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        {view === 'form' ? (
          <RentalForm />
        ) : loading ? (
          <div className="flex justify-center items-center min-h-[40vh] text-gray-600 dark:text-slate-400">
            Cargando sesión…
          </div>
        ) : !session ? (
          <AdminLogin />
        ) : (
          <AdminLayout active={adminSection} onNavigate={setAdminSection}>
            {adminSection === 'contracts' ? <AdminDashboard /> : <SurfboardInventoryPage />}
          </AdminLayout>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-12 dark:bg-slate-900 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm dark:text-slate-400">
            Developed by{' '}
            <a
              href="https://manakinlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium transition dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              manakinlabs.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
