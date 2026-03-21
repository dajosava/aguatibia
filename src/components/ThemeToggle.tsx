import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/** Botón azul marino para alternar modo claro / oscuro */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className="inline-flex items-center justify-center rounded-full p-2.5 bg-blue-950 text-amber-50 shadow-md ring-1 ring-blue-900/80 hover:bg-[#0c1d3a] hover:ring-cyan-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition"
    >
      {isDark ? <Sun className="w-5 h-5" strokeWidth={2} /> : <Moon className="w-5 h-5" strokeWidth={2} />}
    </button>
  );
}
