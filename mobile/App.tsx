import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
// Quiz logic, questions and translations are shared with the web app.
import { LANG_LABELS, STRINGS, type Strings } from '../web/src/i18n';
import { ALL_CATEGORIES, DATA, LANGS, type Lang, type RoundItem, buildRound, questionsIn } from '../web/src/quiz';
import { loadBest, loadLang, saveBest, saveLang } from './src/storage';
import { colors, radius, shadow } from './src/theme';

const ROUND_SIZES = [5, 10, 20];
// The only screen that needs internet; it opens in the browser.
const PRIVACY_URL = 'https://chess-quiz-three.vercel.app/privacy/';

type Phase = 'setup' | 'playing' | 'done';
/** `picked` is an index into the question's original options, so it survives a language switch. */
type Result = { item: RoundItem; picked: number };

const isCorrect = (r: Result) => r.picked === r.item.question.answer;

export default function App() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [phase, setPhase] = useState<Phase>('setup');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [size, setSize] = useState(ROUND_SIZES[1]);
  const [round, setRound] = useState<RoundItem[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [best, setBest] = useState(loadBest);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const t = STRINGS[lang];
  const current = round[index];
  const picked = results.length > index ? results[index].picked : null;
  const score = results.filter(isCorrect).length;

  // Each new question or screen starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [phase, index]);

  // Android's back button/gesture returns to the main page instead of closing the app.
  useEffect(() => {
    if (phase === 'setup') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPhase('setup');
      return true;
    });
    return () => sub.remove();
  }, [phase]);

  const changeLang = (next: Lang) => {
    setLang(next);
    saveLang(next);
  };

  const start = () => {
    setRound(buildRound(DATA.questions, size, category));
    setIndex(0);
    setResults([]);
    setPhase('playing');
  };

  /** `slot` is the on-screen position of the tapped option. */
  const pick = (slot: number) => {
    if (phase !== 'playing' || picked !== null || !current) return;
    setResults((r) => [...r, { item: current, picked: current.order[slot] }]);
  };

  const next = () => {
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
    setPhase('done');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <ScrollView ref={scrollRef} contentContainerStyle={styles.app}>
          <View style={styles.topBar}>
            {phase !== 'setup' ? (
              <Pressable onPress={() => setPhase('setup')} accessibilityRole="button" hitSlop={12}>
                <Text style={styles.back}>← {t.back}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <View style={styles.langs} accessibilityRole="radiogroup" accessibilityLabel={t.language}>
              {LANGS.map((l) => (
                <Pressable
                  key={l}
                  style={[styles.lang, l === lang && styles.langActive]}
                  onPress={() => changeLang(l)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: l === lang }}
                >
                  <Text style={[styles.langText, l === lang && styles.onAccent]}>{LANG_LABELS[l]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          {phase === 'setup' && (
            <Setup t={t} lang={lang} category={category} setCategory={setCategory} size={size} setSize={setSize} onStart={start} />
          )}

          {phase === 'playing' && current && (
            <Play key={index} t={t} lang={lang} item={current} index={index} total={round.length} score={score} picked={picked} onPick={pick} onNext={next} />
          )}

          {phase === 'done' && (
            <Summary
              t={t}
              lang={lang}
              results={results}
              score={score}
              best={best[`${category}:${round.length}`] ?? score}
              onAgain={start}
              onMenu={() => setPhase('setup')}
            />
          )}

          <Pressable style={styles.footer} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
            <Text style={styles.link}>{t.privacy}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
    >
      <Text style={[styles.chipText, active && styles.onAccent]}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button">
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
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
    <View style={styles.section}>
      <View style={styles.field}>
        <Text style={styles.label}>{t.category}</Text>
        <View style={styles.chips}>
          {options.map(([key, name]) => (
            <Chip key={key} label={name} active={key === props.category} onPress={() => props.setCategory(key)} />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t.questions}</Text>
        <View style={styles.chips}>
          {ROUND_SIZES.map((n) => (
            <Chip key={n} label={String(n)} active={n === props.size} onPress={() => props.setSize(n)} />
          ))}
        </View>
        {available < props.size && <Text style={styles.hint}>{t.fewer(available)}</Text>}
      </View>

      <PrimaryButton label={t.start} onPress={props.onStart} />
    </View>
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
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <View style={styles.section}>
      <View style={styles.progress}>
        <Text style={styles.muted}>{t.progress(props.index + 1, props.total)}</Text>
        <Text style={styles.tag}>{DATA.categories[q.category][props.lang]}</Text>
        <Text style={styles.muted}>
          {t.score} {props.score}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${(props.index / props.total) * 100}%` }]} />
      </View>

      <Text style={styles.question}>{text.question}</Text>

      <View style={styles.options}>
        {order.map((original, slot) => {
          const state =
            picked === null ? null : original === q.answer ? styles.correct : original === picked ? styles.wrong : null;
          return (
            <Pressable
              key={original}
              style={({ pressed }) => [styles.option, state, pressed && picked === null && styles.pressed]}
              onPress={() => props.onPick(slot)}
              disabled={picked !== null}
              accessibilityRole="button"
            >
              <Text style={styles.badge}>{slot + 1}</Text>
              <Text style={styles.optionText}>{text.options[original]}</Text>
            </Pressable>
          );
        })}
      </View>

      {picked !== null && (
        <>
          <Text style={[styles.feedback, styles.bold, right ? styles.good : styles.bad]} accessibilityLiveRegion="polite">
            {right ? t.correct : t.wrong}
          </Text>
          {text.explanation ? (
            <View style={styles.dropdown}>
              <Pressable
                style={styles.dropdownHeader}
                onPress={() => setShowExplanation((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showExplanation }}
              >
                <Text style={styles.dropdownTitle}>{t.explanation}</Text>
                <Text style={styles.dropdownTitle}>{showExplanation ? '▴' : '▾'}</Text>
              </Pressable>
              {showExplanation && <Text style={styles.dropdownBody}>{text.explanation}</Text>}
            </View>
          ) : null}
          <PrimaryButton label={props.index + 1 < props.total ? t.next : t.results} onPress={props.onNext} />
        </>
      )}
    </View>
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
    <View style={styles.section}>
      <View style={styles.stats}>
        <Stat label={t.score} value={`${props.score}/${total}`} />
        <Stat label={t.accuracy} value={`${percent}%`} />
        <Stat label={t.best} value={`${props.best}/${total}`} />
      </View>
      <Text style={styles.verdict}>{verdict}</Text>

      {missed.length > 0 && (
        <View style={styles.review}>
          <Text style={styles.reviewTitle}>{t.review}</Text>
          {missed.map(({ item: { question: q }, picked }) => {
            const text = q[lang];
            return (
              <View key={q.id} style={styles.card}>
                <Text style={styles.bold}>{text.question}</Text>
                <Text style={styles.bad}>✗ {text.options[picked]}</Text>
                <Text style={styles.good}>✓ {text.options[q.answer]}</Text>
                {text.explanation ? <Text style={styles.muted}>{text.explanation}</Text> : null}
              </View>
            );
          })}
        </View>
      )}

      <PrimaryButton label={t.again} onPress={props.onAgain} />
      <Pressable onPress={props.onMenu} accessibilityRole="button" style={styles.center}>
        <Text style={styles.link}>{t.settings}</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  app: { padding: 16, gap: 24, paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -12 },
  back: { fontSize: 16, fontWeight: '600', color: colors.accent },
  langs: { flexDirection: 'row', gap: 4 },
  lang: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  langActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  langText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  onAccent: { color: colors.onAccent },
  header: { alignItems: 'center', gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: colors.accent, textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center' },
  section: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  primary: { ...shadow, backgroundColor: colors.accent, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: colors.muted },
  tag: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    flexShrink: 1,
    marginHorizontal: 8,
  },
  bar: { height: 6, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden', marginTop: -8 },
  barFill: { height: '100%', backgroundColor: colors.accent },
  question: { fontSize: 20, fontWeight: '700', lineHeight: 27, color: colors.text },
  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  correct: { borderColor: colors.correct, backgroundColor: colors.correctSoft },
  wrong: { borderColor: colors.wrong, backgroundColor: colors.wrongSoft },
  badge: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  optionText: { flex: 1, fontSize: 16, color: colors.text },
  feedback: { fontSize: 15, lineHeight: 22, color: colors.text },
  dropdown: { borderWidth: 1, borderColor: colors.border, borderRadius: radius, backgroundColor: colors.surface, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownTitle: { fontSize: 15, fontWeight: '600', color: colors.accent },
  dropdownBody: { fontSize: 15, lineHeight: 22, color: colors.text, paddingHorizontal: 16, paddingBottom: 14 },
  bold: { fontWeight: '700', color: colors.text },
  good: { color: colors.correct },
  bad: { color: colors.wrong },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { ...shadow, flex: 1, backgroundColor: colors.surface, borderRadius: radius, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '600', color: colors.text },
  statLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  verdict: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.text },
  review: { gap: 10 },
  reviewTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  card: { ...shadow, backgroundColor: colors.surface, borderRadius: radius, padding: 14, gap: 4 },
  center: { alignItems: 'center' },
  link: { color: colors.muted, textDecorationLine: 'underline', textAlign: 'center' },
  footer: { alignItems: 'center', paddingVertical: 8 },
});
