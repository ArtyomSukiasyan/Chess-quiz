import { LANGS, Lang } from "./quiz";

const LANG_KEY = "chess-quiz:lang";

export const LANG_LABELS: Record<Lang, string> = { en: "EN", hy: "ՀԱՅ", ru: "РУ" };

export const STRINGS = {
  en: {
    title: "Chess Quiz",
    subtitle: "Test your chess knowledge",
    language: "Language",
    category: "Category",
    all: "All",
    questions: "Questions",
    fewer: (n: number) => `This category has only ${n} questions — the round will be shorter.`,
    start: "Start quiz",
    progress: (i: number, n: number) => `Question ${i} / ${n}`,
    score: "Score",
    correct: "Correct!",
    wrong: "Not quite.",
    next: "Next",
    results: "See results",
    accuracy: "Accuracy",
    best: "Best",
    verdicts: ["Time to hit the books.", "Not bad — keep studying.", "Strong play!", "Perfect — grandmaster!"],
    review: "Review your mistakes",
    again: "Play again",
    settings: "Change settings",
  },
  hy: {
    title: "Շախմատային վիկտորինա",
    subtitle: "Ստուգեք ձեր շախմատային գիտելիքները",
    language: "Լեզու",
    category: "Կատեգորիա",
    all: "Բոլորը",
    questions: "Հարցեր",
    fewer: (n: number) => `Այս կատեգորիայում կա ընդամենը ${n} հարց․ ռաունդը կլինի ավելի կարճ։`,
    start: "Սկսել",
    progress: (i: number, n: number) => `Հարց ${i} / ${n}`,
    score: "Միավոր",
    correct: "Ճիշտ է։",
    wrong: "Սխալ է։",
    next: "Հաջորդը",
    results: "Արդյունքները",
    accuracy: "Ճշգրտություն",
    best: "Լավագույնը",
    verdicts: ["Ժամանակն է նստել գրքերի մոտ։", "Վատ չէ, շարունակեք սովորել։", "Ուժեղ խաղ։", "Կատարյալ է՝ գրոսմայստեր։"],
    review: "Վերանայեք ձեր սխալները",
    again: "Խաղալ նորից",
    settings: "Փոխել կարգավորումները",
  },
  ru: {
    title: "Шахматная викторина",
    subtitle: "Проверьте свои знания о шахматах",
    language: "Язык",
    category: "Категория",
    all: "Все",
    questions: "Вопросы",
    fewer: (n: number) => `В этой категории вопросов: ${n} — раунд будет короче.`,
    start: "Начать",
    progress: (i: number, n: number) => `Вопрос ${i} / ${n}`,
    score: "Счёт",
    correct: "Верно!",
    wrong: "Неверно.",
    next: "Далее",
    results: "Результаты",
    accuracy: "Точность",
    best: "Рекорд",
    verdicts: ["Пора засесть за книги.", "Неплохо — продолжайте учиться.", "Сильная игра!", "Идеально — гроссмейстер!"],
    review: "Разбор ошибок",
    again: "Сыграть ещё",
    settings: "Изменить настройки",
  },
} satisfies Record<Lang, unknown>;

export type Strings = (typeof STRINGS)[Lang];

const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

/** Saved choice, else the browser language, else English. */
export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Storage unavailable — fall through to the browser language.
  }
  const browser = navigator.language?.slice(0, 2);
  return isLang(browser) ? browser : "en";
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage unavailable — language just won't persist.
  }
}
