import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { es } from './locales/es';
import { en } from './locales/en';
import type { I18nContextValue, LanguageCode, TranslationKey, TranslationParams } from './types';

const LANGUAGE_STORAGE_KEY = 'app_language';
const dictionaries = { es, en };

function resolveDeviceLanguage(): LanguageCode {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  if (locale.startsWith('es')) return 'es';
  return 'en';
}

function applyParams(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
}

function toLocale(code: LanguageCode): string {
  return code === 'es' ? 'es-ES' : 'en-US';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const stored = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
        const resolved = stored === 'es' || stored === 'en' ? stored : resolveDeviceLanguage();
        if (mounted) {
          setLanguageState(resolved);
          setReady(true);
        }
      } catch {
        if (mounted) {
          setLanguageState(resolveDeviceLanguage());
          setReady(true);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const message = dictionaries[language][key] ?? dictionaries.en[key] ?? String(key);
      return applyParams(message, params);
    },
    [language]
  );

  const formatDate = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(toLocale(language), options).format(new Date(value));
    },
    [language]
  );

  const formatDateTime = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(toLocale(language), {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
      }).format(new Date(value));
    },
    [language]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      formatDate,
      formatDateTime,
      ready,
    }),
    [formatDate, formatDateTime, language, ready, setLanguage, t]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
}
