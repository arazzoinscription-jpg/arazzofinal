// Calcul du test de niveau — PORT FIDÈLE des fonctions pures d'Arazzo OS
// (`core/services/level-test-service.js` : scoreLevelTest + explainResult).
// Déterministe, sans dépendance. Utilisé côté SERVEUR (server action) pour que
// le barème (points) ne transite jamais par le navigateur.

export type TestOption = { value: string | number; label?: string; points?: number; tag?: string };
export type TestQuestion = {
  key: string; kind?: "skill" | "profile"; q?: string; label?: string;
  description?: string; image_url?: string; required?: boolean;
  options?: TestOption[]; skill?: string;
};
export type TestLevel = {
  key?: string; label?: string; min?: number; max?: number;
  course_ref?: string | null; course_url?: string | null; message?: string | null;
  extra_courses?: any[];
};
export type LevelTest = {
  slug?: string; title?: string; subtitle?: string; description?: string;
  language?: string; questions?: TestQuestion[]; levels?: TestLevel[];
  settings?: { language?: string };
};

export type ScoreResult = {
  score: number;
  max_score: number;
  level: TestLevel | null;
  recommendation: {
    course_ref: string | null; course_url: string | null;
    message: string | null; extra_courses: any[];
  } | null;
  tags: string[];
  skills: Record<string, number>;
};

/** Calcule un résultat. Fonction PURE. `answers` = { [questionKey]: optionValue }. */
export function scoreLevelTest(test: LevelTest, answers: Record<string, unknown> = {}): ScoreResult {
  const questions = Array.isArray(test?.questions) ? test.questions : [];
  const levels = Array.isArray(test?.levels) ? test.levels : [];

  let score = 0;
  let maxScore = 0;
  const tags: string[] = [];
  const skillTally: Record<string, { earned: number; max: number }> = {};

  for (const q of questions) {
    const given = answers[q.key];
    const options = Array.isArray(q.options) ? q.options : [];
    const chosen = options.find((o) => String(o.value) === String(given)) ?? null;
    const kind = q.kind === "profile" ? "profile" : "skill";

    if (kind === "skill") {
      const optMax = options.reduce((m, o) => Math.max(m, Number(o.points) || 0), 0);
      const earned = chosen ? (Number(chosen.points) || 0) : 0;
      score += earned;
      maxScore += optMax;
      if (q.skill) {
        const t = skillTally[q.skill] ?? { earned: 0, max: 0 };
        t.earned += earned; t.max += optMax;
        skillTally[q.skill] = t;
      }
    } else if (chosen?.tag) {
      tags.push(String(chosen.tag));
    }
  }

  const skills: Record<string, number> = {};
  for (const [name, t] of Object.entries(skillTally)) {
    skills[name] = t.max > 0 ? Math.round((t.earned / t.max) * 100) : 0;
  }

  const sorted = [...levels].sort((a, b) => (Number(a.min) || 0) - (Number(b.min) || 0));
  let level: TestLevel | null =
    sorted.find((l) => score >= (Number(l.min) || 0) && score <= (Number(l.max) ?? Infinity)) ?? null;
  if (!level && sorted.length) {
    level = score < (Number(sorted[0].min) || 0) ? sorted[0] : sorted[sorted.length - 1];
  }

  const recommendation = level
    ? {
      course_ref: level.course_ref ?? null,
      course_url: level.course_url ?? null,
      message: level.message ?? null,
      extra_courses: Array.isArray(level.extra_courses) ? level.extra_courses : [],
    }
    : null;

  return { score, max_score: maxScore, level, recommendation, tags, skills };
}

/** Une explication en clair, à partir des faits calculés. Bilingue. `null` sans niveau. */
export function explainResult(test: LevelTest, result: ScoreResult, opts: { lang?: string } = {}): string | null {
  const level = result?.level;
  if (!level) return null;
  const language = opts.lang ?? test?.settings?.language ?? test?.language ?? "fr";
  const ar = language === "ar";

  let skillSentence = "";
  const entries = Object.entries(result.skills ?? {});
  if (entries.length) {
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const [topName, topPct] = sorted[0];
    const [lowName, lowPct] = sorted[sorted.length - 1];
    const uniform = topPct === lowPct;
    if (topPct === 0) {
      skillSentence = ar
        ? "راكِ في البداية، وهذا الوقت المثالي باش تبني الأساس."
        : "Vous partez des bases, et c’est exactement là que cette formation commence.";
    } else if (uniform) {
      skillSentence = ar
        ? `مستواك في ${topName} هو ${topPct}%.`
        : `Votre maîtrise en ${topName} est de ${topPct} %.`;
    } else if (topPct >= 50) {
      skillSentence = ar
        ? `راكِ مليحة في ${topName} (${topPct}%)، وتقدري تطوّري خاصة في ${lowName} (${lowPct}%).`
        : `Vous êtes déjà à l’aise en ${topName} (${topPct} %), et vous progresserez surtout en ${lowName} (${lowPct} %).`;
    } else {
      skillSentence = ar
        ? `عندك أساس في ${topName} (${topPct}%)، وتقدري تطوّري خاصة في ${lowName} (${lowPct}%).`
        : `Vous avez des bases en ${topName} (${topPct} %), et vous progresserez surtout en ${lowName} (${lowPct} %).`;
    }
  }

  const detail = level.message ? ` — ${level.message}` : "";
  const head = ar ? `نتيجتك: ${level.label}.` : `Votre résultat : ${level.label}.`;
  const reco = ar
    ? ` ننصحك بالدورة المناسبة لمستواك${detail}.`
    : ` Nous vous recommandons la formation adaptée à votre niveau${detail}.`;
  return [head, skillSentence, reco].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** La vue « publique » d'un test : questions SANS points ni tags (pour l'affichage). */
export function publicQuestions(test: LevelTest) {
  return (test?.questions ?? []).map((q) => ({
    key: q.key,
    kind: q.kind ?? "skill",
    q: q.q ?? q.label ?? "",
    description: q.description ?? null,
    image_url: q.image_url ?? null,
    required: q.required ?? false,
    options: (q.options ?? []).map((o) => ({ value: o.value, label: o.label ?? String(o.value) })),
  }));
}
