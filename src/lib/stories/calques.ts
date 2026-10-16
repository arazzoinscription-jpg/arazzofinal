/**
 * Stories « comme Instagram » — les CALQUES posés sur une story (module PUR, testable) :
 * texte, dessin, autocollant, question, sondage, compte à rebours, lien.
 * Positions et tailles en proportions (0 → 1) de l'image : identiques sur téléphone et ordinateur.
 * Tout ce qui vient du navigateur est revalidé ici (jamais de confiance).
 */

export const COULEURS = ["#FFFFFF", "#111111", "#5B16F9", "#FE7223", "#E1306C", "#16A34A", "#FACC15", "#0EA5E9"] as const;
export const FONDS = [
  "linear-gradient(160deg,#5B16F9,#FE7223)",
  "linear-gradient(160deg,#2A0880,#5B16F9)",
  "linear-gradient(160deg,#FE7223,#FACC15)",
  "linear-gradient(160deg,#E1306C,#FE7223)",
  "linear-gradient(160deg,#0F766E,#0EA5E9)",
  "#111111",
] as const;
export const AUTOCOLLANTS = ["✂️", "🧵", "🪡", "👗", "👚", "👖", "🧶", "📏", "📐", "🧷", "🎀", "👠", "✨", "❤️", "🔥", "👏", "😍", "🥰", "😂", "🎉", "💯", "🙏", "👀", "🤩", "💪", "🌸", "☕", "📚"] as const;
export const REACTIONS = ["❤️", "🔥", "👏", "😍", "😂", "🎉"] as const;

export const MAX_CALQUES = 25;
export const MAX_POINTS = 4000;

type Base = { id: string; x: number; y: number; taille: number };
export type Calque =
  | (Base & { type: "texte"; texte: string; couleur: string; fond: "aucun" | "plein" | "doux"; align: "gauche" | "centre" | "droite" })
  | (Base & { type: "emoji"; emoji: string })
  | { id: string; type: "dessin"; couleur: string; epaisseur: number; points: [number, number][] }
  | (Base & { type: "question"; question: string })
  | (Base & { type: "sondage"; question: string; choix: [string, string] })
  | (Base & { type: "compte"; titre: string; fin: string })
  | (Base & { type: "lien"; texte: string; url: string });

const borne = (v: unknown, min: number, max: number, defaut: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : defaut;
  return Math.min(max, Math.max(min, n));
};
const texte = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const texteMultiligne = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "");
const couleur = (v: unknown) => ((COULEURS as readonly string[]).includes(v as string) ? (v as string) : COULEURS[0]);
const ident = (v: unknown, i: number) => (typeof v === "string" && /^[a-z0-9-]{1,24}$/i.test(v) ? v : `c${i}`);
const base = (c: Record<string, unknown>, i: number): Base => ({
  id: ident(c.id, i), x: borne(c.x, 0.03, 0.97, 0.5), y: borne(c.y, 0.03, 0.97, 0.5), taille: borne(c.taille, 0.5, 3, 1),
});

/** Lien autorisé : une page du site (« /… ») pour toutes ; une adresse https:// pour l'équipe seulement. */
export function lienAutorise(url: unknown, equipe: boolean): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(u)) return u.slice(0, 300);
  if (!equipe) return null;
  try {
    const p = new URL(u);
    return p.protocol === "https:" ? p.toString().slice(0, 300) : null;
  } catch {
    return null;
  }
}

/** Lit les calques envoyés par le navigateur ; ignore ce qui n'est pas valide. */
export function lireCalques(brut: unknown, opts: { equipe: boolean; maintenant: Date }): Calque[] {
  const liste = Array.isArray(brut) ? brut.slice(0, MAX_CALQUES) : [];
  const out: Calque[] = [];
  let points = 0;
  liste.forEach((x, i) => {
    const c = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    switch (c.type) {
      case "texte": {
        const t = texteMultiligne(c.texte, 200);
        if (!t) return;
        const fond = c.fond === "plein" || c.fond === "doux" ? c.fond : "aucun";
        const align = c.align === "gauche" || c.align === "droite" ? c.align : "centre";
        out.push({ ...base(c, i), type: "texte", texte: t, couleur: couleur(c.couleur), fond, align });
        return;
      }
      case "emoji": {
        const e = typeof c.emoji === "string" ? c.emoji.trim() : "";
        if (!e || e.length > 12 || !/\p{Extended_Pictographic}/u.test(e)) return;
        out.push({ ...base(c, i), type: "emoji", emoji: e });
        return;
      }
      case "dessin": {
        const pts = (Array.isArray(c.points) ? c.points : [])
          .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && Number.isFinite(v)))
          .map(([a, b]) => [Math.round(borne(a, 0, 1, 0) * 1000) / 1000, Math.round(borne(b, 0, 1, 0) * 1000) / 1000] as [number, number]);
        if (pts.length < 2 || points + pts.length > MAX_POINTS) return;
        points += pts.length;
        out.push({ id: ident(c.id, i), type: "dessin", couleur: couleur(c.couleur), epaisseur: borne(c.epaisseur, 0.004, 0.04, 0.012), points: pts });
        return;
      }
      case "question": {
        const q = texte(c.question, 120);
        if (!q) return;
        out.push({ ...base(c, i), type: "question", question: q });
        return;
      }
      case "sondage": {
        const q = texte(c.question, 120);
        const ch = Array.isArray(c.choix) ? c.choix.map((v) => texte(v, 40)) : [];
        if (!q || ch.length !== 2 || !ch[0] || !ch[1]) return;
        out.push({ ...base(c, i), type: "sondage", question: q, choix: [ch[0], ch[1]] });
        return;
      }
      case "compte": {
        const t = texte(c.titre, 60);
        const fin = typeof c.fin === "string" ? new Date(c.fin) : null;
        if (!t || !fin || Number.isNaN(fin.getTime())) return;
        const ms = fin.getTime() - opts.maintenant.getTime();
        if (ms < 60_000 || ms > 30 * 86_400_000) return;
        out.push({ ...base(c, i), type: "compte", titre: t, fin: fin.toISOString() });
        return;
      }
      case "lien": {
        const url = lienAutorise(c.url, opts.equipe);
        if (!url) return;
        out.push({ ...base(c, i), type: "lien", texte: texte(c.texte, 40) || "Voir", url });
        return;
      }
      default:
    }
  });
  return out;
}

/** Vrai si un lien demandé est refusé (adresse externe d'une élève) : on le dit au lieu de l'effacer en silence. */
export function lienRefuse(brut: unknown, equipe: boolean): boolean {
  return (Array.isArray(brut) ? brut.slice(0, MAX_CALQUES) : []).some((x) => {
    const c = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    return c.type === "lien" && !lienAutorise(c.url, equipe);
  });
}

export function lireFond(brut: unknown): string | null {
  return (FONDS as readonly string[]).includes(brut as string) ? (brut as string) : null;
}

/** Une interaction envoyée par une personne qui regarde la story. */
export function lireInteraction(brut: unknown, calques: Calque[]): { calqueId: string; kind: "reponse" | "vote" | "reaction"; valeur: string } | null {
  const r = (brut && typeof brut === "object" ? brut : {}) as { calqueId?: unknown; kind?: unknown; valeur?: unknown };
  if (r.kind === "reaction") {
    return (REACTIONS as readonly string[]).includes(r.valeur as string) ? { calqueId: "", kind: "reaction", valeur: r.valeur as string } : null;
  }
  const c = calques.find((x) => x.id === r.calqueId);
  if (!c) return null;
  if (r.kind === "reponse" && c.type === "question") {
    const v = texteMultiligne(r.valeur, 300);
    return v ? { calqueId: c.id, kind: "reponse", valeur: v } : null;
  }
  if (r.kind === "vote" && c.type === "sondage") return r.valeur === "0" || r.valeur === "1" ? { calqueId: c.id, kind: "vote", valeur: r.valeur } : null;
  return null;
}

/** Résultat d'un sondage : nombres et pourcentages (arrondis, total 100 s'il y a des votes). */
export function resultatSondage(votes: string[]): { nombres: [number, number]; pct: [number, number]; total: number } {
  const a = votes.filter((v) => v === "0").length;
  const b = votes.filter((v) => v === "1").length;
  const total = a + b;
  if (!total) return { nombres: [0, 0], pct: [0, 0], total: 0 };
  const pa = Math.round((a / total) * 100);
  return { nombres: [a, b], pct: [pa, 100 - pa], total };
}

/** « 2 j 3 h », « 3 h 05 », « 12 min », « Terminé ». */
export function tempsRestant(fin: string, maintenant: Date): string {
  const ms = new Date(fin).getTime() - maintenant.getTime();
  if (!(ms > 0)) return "Terminé";
  const min = Math.floor(ms / 60_000);
  const j = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (j > 0) return `${j} j ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  return `${Math.max(1, m)} min`;
}
