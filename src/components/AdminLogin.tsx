import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signError } = await signIn(email.trim(), password);
      if (signError) setError(signError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 md:p-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-blue-100 dark:bg-blue-950/80 p-4 ring-1 ring-blue-200/50 dark:ring-blue-800">
            <Lock className="w-10 h-10 text-blue-600 dark:text-cyan-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-slate-100 mb-8">Acceso administración</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="form-label">
              Correo
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="form-label">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-950 hover:bg-blue-900 dark:bg-blue-950 dark:hover:bg-[#0c1d3a] text-white py-3 rounded-lg font-semibold ring-1 ring-blue-900/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
