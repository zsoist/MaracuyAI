import type { TranslationMessages } from './locales/en';

export type LanguageCode = 'es' | 'en';
export type TranslationKey = keyof TranslationMessages;
export type TranslationParams = Record<string, string | number>;

export interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  ready: boolean;
}
