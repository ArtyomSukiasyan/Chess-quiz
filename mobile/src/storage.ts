import Storage from 'expo-sqlite/kv-store';
import { getLocales } from 'expo-localization';
import { LANGS, type Lang } from '../../web/src/quiz';

// Same keys as the web app's localStorage, so the data has the same shape on both.
const LANG_KEY = 'chess-quiz:lang';
const BEST_KEY = 'chess-quiz:best';

const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

/** Saved choice, else the device language, else English. */
export function loadLang(): Lang {
  try {
    const saved = Storage.getItemSync(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Storage unavailable — fall through to the device language.
  }
  const device = getLocales()[0]?.languageCode;
  return isLang(device) ? device : 'en';
}

export function saveLang(lang: Lang) {
  try {
    Storage.setItemSync(LANG_KEY, lang);
  } catch {
    // Storage unavailable — language just won't persist.
  }
}

export function loadBest(): Record<string, number> {
  try {
    return JSON.parse(Storage.getItemSync(BEST_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function saveBest(value: Record<string, number>) {
  try {
    Storage.setItemSync(BEST_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable — best scores just won't persist.
  }
}
