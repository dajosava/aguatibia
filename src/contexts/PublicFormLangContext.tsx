import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { RentalFormLang } from '../config/rentalFormLocales';

type PublicFormLangContextValue = {
  lang: RentalFormLang;
  setLang: (lang: RentalFormLang) => void;
};

const PublicFormLangContext = createContext<PublicFormLangContextValue | null>(null);

export function PublicFormLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<RentalFormLang>('en');
  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <PublicFormLangContext.Provider value={value}>{children}</PublicFormLangContext.Provider>;
}

export function usePublicFormLang(): PublicFormLangContextValue {
  const ctx = useContext(PublicFormLangContext);
  if (!ctx) {
    throw new Error('usePublicFormLang debe usarse dentro de PublicFormLangProvider');
  }
  return ctx;
}
