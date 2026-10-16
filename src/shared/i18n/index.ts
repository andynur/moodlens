import type { Locale } from '../types';
import { en, type TranslationKey } from './en';
import { id } from './id';

export type { TranslationKey };
export const strings: Readonly<Record<Locale, Record<TranslationKey, string>>> = { en, id };
export function t(locale: Locale, key: TranslationKey): string {
  return strings[locale]?.[key] ?? strings.en[key];
}
