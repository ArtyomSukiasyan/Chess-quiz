import { useCallback, useEffect, useState } from "react";
import { LANG_LABELS, STRINGS, Strings, loadLang, saveLang } from "./i18n";
import { ALL_CATEGORIES, DATA, LANGS, Lang, RoundItem, buildRound, questionsIn } from "./quiz";

const ROUND_SIZES = [5, 10, 20];
const BEST_KEY = "chess-quiz:best";

type Phase = "setup" | "playing" | "done";
/** `picked` is an index into the question's original options, so it survives a language switch. */
type Result = { item: RoundItem; picked: number };

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function saveBest(value: Record<string, number>) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.) — best scores just won't persist.
  }
}

const isCorrect = (r: Result) => r.picked === r.item.question.answer;

export default function App() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [size, setSize] = useState(ROUND_SIZES[1]);
  const [round, setRound] = useState<RoundItem[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [best, setBest] = useState(loadBest);

  const t = STRINGS[lang];
  const current = round[index];
  const picked = results.length > index ? results[index].picked : null;
  const score = results.filter(isCorrect).length;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.title;
  }, [lang, t]);

  const changeLang = (next: Lang) => {
    setLang(next);
    saveLang(next);
  };

  const start = () => {
    setRound(buildRound(DATA.questions, size, category));
    setIndex(0);
    setResults([]);
    setPhase("playing");
  };

  /** `slot` is the on-screen position of the clicked option. */
  const pick = useCallback(
    (slot: number) => {
      if (phase !== "playing" || picked !== null || !current) return;
      if (slot < 0 || slot >= current.order.length) return;
      setResults((r) => [...r, { item: current, picked: current.order[slot] }]);
    },
    [phase, picked, current]
  );

  const next = useCallback(() => {
    if (picked === null) return;
    if (index + 1 < round.length) {
      setIndex(index + 1);
      return;
    }
    // Best is keyed by category + length so a 5-question run doesn't overwrite a 20-question one.
    const key = `${category}:${round.length}`;
    if (score > (best[key] ?? -1)) {
      const updated = { ...best, [key]: score };
      setBest(updated);
      saveBest(updated);
    }
    setPhase("done");
  }, [picked, index, round.length, category, score, best]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) pick(Number(e.key) - 1);
      else if (e.key === "Enter" && phase === "playing" && picked !== null) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick, next, phase, picked]);

  return (
    <main className="app">
      <nav className="langs" aria-label={t.language}>
        {LANGS.map((l) => (
          <button
            key={l}
            lang={l}
            className={`lang${l === lang ? " active" : ""}`}
            aria-pressed={l === lang}
            onClick={() => changeLang(l)}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </nav>

      <header>
        <h1>{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </header>

      {phase === "setup" && (
        <Setup
          t={t}
          lang={lang}
          category={category}
          setCategory={setCategory}
          size={size}
          setSize={setSize}
          onStart={start}
        />
      )}

      {phase === "playing" && current && (
        <Play t={t} lang={lang} item={current} index={index} total={round.length} score={score} picked={picked} onPick={pick} onNext={next} />
      )}

      {phase === "done" && (
        <Summary
          t={t}
          lang={lang}
          results={results}
          score={score}
          best={best[`${category}:${round.length}`] ?? score}
          onAgain={start}
          onMenu={() => setPhase("setup")}
        />
      )}
    </main>
  );
}

function Setup(props: {
  t: Strings;
  lang: Lang;
  category: string;
  setCategory: (c: string) => void;
  size: number;
  setSize: (n: number) => void;
  onStart: () => void;
}) {
  const { t, lang } = props;
  const available = questionsIn(DATA.questions, props.category).length;
  const options = [
    [ALL_CATEGORIES, t.all],
    ...Object.entries(DATA.categories).map(([key, names]) => [key, names[lang]]),
  ];

  return (
    <section className="setup">
      <div className="field">
        <span className="label">{t.category}</span>
        <div className="chips">
          {options.map(([key, name]) => (
            <button
              key={key}
              className={`chip${key === props.category ? " active" : ""}`}
              onClick={() => props.setCategory(key)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">{t.questions}</span>
        <div className="chips">
          {ROUND_SIZES.map((n) => (
            <button
              key={n}
              className={`chip${n === props.size ? " active" : ""}`}
              onClick={() => props.setSize(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {available < props.size && <p className="hint">{t.fewer(available)}</p>}
      </div>

      <button className="primary" onClick={props.onStart} autoFocus>
        {t.start}
      </button>
    </section>
  );
}

function Play(props: {
  t: Strings;
  lang: Lang;
  item: RoundItem;
  index: number;
  total: number;
  score: number;
  picked: number | null;
  onPick: (slot: number) => void;
  onNext: () => void;
}) {
  const { t, item, picked } = props;
  const { question: q, order } = item;
  const text = q[props.lang];
  const right = picked === q.answer;

  return (
    <section className="play">
      <div className="progress">
        <span>{t.progress(props.index + 1, props.total)}</span>
        <span className="tag">{DATA.categories[q.category][props.lang]}</span>
        <span>
          {t.score} {props.score}
        </span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${(props.index / props.total) * 100}%` }} />
      </div>

      <h2 className="question">{text.question}</h2>

      <div className="options">
        {order.map((original, slot) => {
          let state = "";
          if (picked !== null) {
            if (original === q.answer) state = " correct";
            else if (original === picked) state = " wrong";
          }
          return (
            <button
              key={original}
              className={`option${state}`}
              onClick={() => props.onPick(slot)}
              disabled={picked !== null}
            >
              <kbd>{slot + 1}</kbd>
              <span>{text.options[original]}</span>
            </button>
          );
        })}
      </div>

      <div className="feedback" aria-live="polite">
        {picked !== null && (
          <>
            <strong className={right ? "good" : "bad"}>{right ? t.correct : t.wrong}</strong> {text.explanation}
          </>
        )}
      </div>

      {picked !== null && (
        <button className="primary" onClick={props.onNext} autoFocus>
          {props.index + 1 < props.total ? t.next : t.results} <kbd>Enter</kbd>
        </button>
      )}
    </section>
  );
}

function Summary(props: {
  t: Strings;
  lang: Lang;
  results: Result[];
  score: number;
  best: number;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const { t, lang } = props;
  const total = props.results.length;
  const percent = total ? Math.round((props.score / total) * 100) : 0;
  const missed = props.results.filter((r) => !isCorrect(r));
  const verdict = t.verdicts[percent === 100 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0];

  return (
    <section className="summary">
      <div className="stats">
        <Stat label={t.score} value={`${props.score}/${total}`} />
        <Stat label={t.accuracy} value={`${percent}%`} />
        <Stat label={t.best} value={`${props.best}/${total}`} />
      </div>
      <p className="verdict">{verdict}</p>

      {missed.length > 0 && (
        <div className="review">
          <h3>{t.review}</h3>
          <ul>
            {missed.map(({ item: { question: q }, picked }) => {
              const text = q[lang];
              return (
                <li key={q.id}>
                  <p className="review-q">{text.question}</p>
                  <p className="bad">✗ {text.options[picked]}</p>
                  <p className="good">✓ {text.options[q.answer]}</p>
                  {text.explanation && <p className="muted">{text.explanation}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="actions">
        <button className="primary" onClick={props.onAgain} autoFocus>
          {t.again}
        </button>
        <button className="link" onClick={props.onMenu}>
          {t.settings}
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
