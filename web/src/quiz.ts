import rawData from "./questions.json";

export const LANGS = ["en", "hy", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export type LocalizedQuestion = {
  question: string;
  options: string[];
  explanation?: string;
};

export type Question = {
  id: string;
  category: string;
  /** Index into each language's `options` of the correct answer (same in every language). */
  answer: number;
} & Record<Lang, LocalizedQuestion>;

export type QuizData = {
  categories: Record<string, Record<Lang, string>>;
  questions: Question[];
};

/** A question in a round, with its options displayed in `order` (indices into the original options). */
export type RoundItem = { question: Question; order: number[] };

export const ALL_CATEGORIES = "all";

const isText = (v: unknown) => typeof v === "string" && v.trim() !== "";

/** Throws with a readable message if questions.json was edited into an invalid shape. */
export function validateQuizData(data: unknown): QuizData {
  const d = data as QuizData;
  if (typeof d?.categories !== "object" || d.categories === null)
    throw new Error(`questions.json: "categories" must be an object`);
  if (!Array.isArray(d.questions)) throw new Error(`questions.json: "questions" must be an array`);

  for (const [key, names] of Object.entries(d.categories)) {
    if (key === ALL_CATEGORIES) throw new Error(`questions.json: category key "${ALL_CATEGORIES}" is reserved`);
    for (const lang of LANGS)
      if (!isText(names?.[lang])) throw new Error(`questions.json: category "${key}" is missing a "${lang}" name`);
  }

  const ids = new Set<string>();
  d.questions.forEach((q, i) => {
    const where = `questions.json question #${i + 1}${isText(q?.id) ? ` ("${q.id}")` : ""}`;
    if (!isText(q?.id)) throw new Error(`${where}: "id" must be a non-empty string`);
    if (ids.has(q.id)) throw new Error(`${where}: duplicate id`);
    ids.add(q.id);
    if (!(q.category in d.categories))
      throw new Error(`${where}: unknown category "${q.category}" (add it to "categories")`);

    const count = q.en?.options?.length;
    for (const lang of LANGS) {
      const t = q[lang];
      if (!t) throw new Error(`${where}: missing "${lang}" translation`);
      if (!isText(t.question)) throw new Error(`${where}: "${lang}.question" must be a non-empty string`);
      if (!Array.isArray(t.options) || t.options.length < 2 || !t.options.every(isText))
        throw new Error(`${where}: "${lang}.options" must be an array of at least 2 strings`);
      if (t.options.length !== count)
        throw new Error(`${where}: "${lang}.options" has ${t.options.length} options but "en" has ${count}`);
      if (t.explanation !== undefined && typeof t.explanation !== "string")
        throw new Error(`${where}: "${lang}.explanation" must be a string if present`);
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= count)
      throw new Error(`${where}: "answer" must be an index between 0 and ${count - 1}`);
  });

  return d;
}

export const DATA = validateQuizData(rawData);

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function questionsIn(questions: Question[], category: string): Question[] {
  return category === ALL_CATEGORIES ? questions : questions.filter((q) => q.category === category);
}

/** Picks `count` random questions (optionally from one category) with options shuffled. */
export function buildRound(
  questions: Question[],
  count: number,
  category: string = ALL_CATEGORIES,
  random = Math.random
): RoundItem[] {
  return shuffle(questionsIn(questions, category), random)
    .slice(0, count)
    .map((question) => ({
      question,
      order: shuffle(question.en.options.map((_, i) => i), random),
    }));
}
