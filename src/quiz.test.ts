import { describe, expect, it } from "vitest";
import { ALL_CATEGORIES, DATA, LANGS, buildRound, validateQuizData } from "./quiz";
import { STRINGS } from "./i18n";

const t = (question: string, options: string[]) => ({ question, options });
const q = (id: string, category: string, options: string[], answer: number) => ({
  id,
  category,
  answer,
  en: t(id, options),
  hy: t(id, options),
  ru: t(id, options),
});
const names = { en: "x", hy: "x", ru: "x" };
const valid = () => ({
  categories: { a: names, b: names },
  questions: [q("1", "a", ["x", "y", "z"], 2), q("2", "a", ["x", "y"], 0), q("3", "b", ["x", "y", "z", "w"], 1)],
});

describe("validateQuizData", () => {
  it("accepts the bundled questions.json", () => {
    expect(DATA.questions.length).toBeGreaterThan(0);
  });

  it("accepts a valid sample", () => {
    expect(() => validateQuizData(valid())).not.toThrow();
  });

  it.each([
    ["not an object", () => []],
    ["unknown category", () => ({ ...valid(), questions: [q("1", "zzz", ["x", "y"], 0)] })],
    ["duplicate id", () => ({ ...valid(), questions: [q("1", "a", ["x", "y"], 0), q("1", "a", ["x", "y"], 0)] })],
    ["answer out of range", () => ({ ...valid(), questions: [q("1", "a", ["x", "y"], 2)] })],
    ["too few options", () => ({ ...valid(), questions: [q("1", "a", ["x"], 0)] })],
    ["missing translation", () => {
      const d = valid();
      delete (d.questions[0] as Partial<(typeof d.questions)[0]>).hy;
      return d;
    }],
    ["option count mismatch between languages", () => {
      const d = valid();
      d.questions[0].ru = t("1", ["x", "y"]);
      return d;
    }],
    ["category missing a translation", () => ({ ...valid(), categories: { a: { en: "x" }, b: names } })],
  ])("rejects %s", (_, make) => {
    expect(() => validateQuizData(make())).toThrow();
  });
});

describe("buildRound", () => {
  const { questions } = valid();

  it("order is a permutation of the original options", () => {
    for (let run = 0; run < 50; run++) {
      for (const { question, order } of buildRound(questions, questions.length)) {
        expect([...order].sort()).toEqual(question.en.options.map((_, i) => i));
      }
    }
  });

  it("limits to count and filters by category", () => {
    expect(buildRound(questions, 2)).toHaveLength(2);
    expect(buildRound(questions, 10)).toHaveLength(3);
    expect(buildRound(questions, 10, "a").every((r) => r.question.category === "a")).toBe(true);
    expect(buildRound(questions, 10, ALL_CATEGORIES)).toHaveLength(3);
  });

  it("does not repeat questions in a round", () => {
    const round = buildRound(DATA.questions, DATA.questions.length);
    expect(new Set(round.map((r) => r.question.id)).size).toBe(DATA.questions.length);
  });
});

describe("STRINGS", () => {
  it("has the same keys in every language", () => {
    const keys = Object.keys(STRINGS.en).sort();
    for (const lang of LANGS) expect(Object.keys(STRINGS[lang]).sort()).toEqual(keys);
  });
});
