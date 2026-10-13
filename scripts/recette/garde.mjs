/**
 * GARDE-FOU RECETTE — à importer par TOUS les scripts de recette.
 *
 * Refuse toute exécution qui ne vise pas, de façon VÉRIFIABLE, un projet
 * Supabase distinct de la production :
 *   - la cible vient de variables dédiées (RECETTE_*), jamais des variables de
 *     l'application (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) ;
 *   - l'hôte de production est relu dans PROD_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL
 *     et les fichiers .env.local / .env en remontant les dossiers (seule l'URL
 *     publique est lue, aucune clé) ; s'il est introuvable, la distinction n'est
 *     pas vérifiable → refus ;
 *   - la cible doit différer de la production (hôte ET référence de projet) ;
 *   - RECETTE_CONFIRME=oui est exigé.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function stop(message) {
  console.error(`⛔ ${message}`);
  process.exit(3);
}

function hote(url) {
  try { return new URL(String(url ?? "").trim().replace(/^["']|["']$/g, "")).host.toLowerCase(); } catch { return null; }
}

const reference = (h) => (h ? h.split(".")[0] : null);

/** Hôtes Supabase de PRODUCTION connus sur ce poste (URL publiques seulement). */
export function hotesProduction() {
  const hotes = new Set();
  for (const v of [process.env.PROD_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
    const h = hote(v);
    if (h) hotes.add(h);
  }
  let dossier = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    for (const nom of [".env.local", ".env"]) {
      const chemin = join(dossier, nom);
      if (!existsSync(chemin)) continue;
      const m = readFileSync(chemin, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
      const h = m ? hote(m[1]) : null;
      if (h) hotes.add(h);
    }
    const parent = dirname(dossier);
    if (parent === dossier) break;
    dossier = parent;
  }
  return hotes;
}

/**
 * Vérifie la cible et rend { url, hote, ref }. `base: true` exige aussi
 * RECETTE_DATABASE_URL (connexion Postgres) du MÊME projet de recette.
 */
export function cibleRecette({ base = false } = {}) {
  const url = String(process.env.RECETTE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const h = hote(url);
  if (!h) stop("RECETTE_SUPABASE_URL manquante ou invalide.");
  if (process.env.RECETTE_CONFIRME !== "oui") stop("Ajoutez RECETTE_CONFIRME=oui pour confirmer que la cible est le projet de RECETTE.");
  const prod = hotesProduction();
  if (prod.size === 0) stop("Hôte de production introuvable (PROD_SUPABASE_URL ou .env.local) : impossible de vérifier que la cible est distincte → refus.");
  const ref = reference(h);
  for (const p of prod) {
    if (p === h || reference(p) === ref) stop("La cible correspond au projet de PRODUCTION. Refus.");
  }
  if (base) {
    const db = String(process.env.RECETTE_DATABASE_URL ?? "");
    if (!db) stop("RECETTE_DATABASE_URL manquante.");
    for (const p of prod) {
      const r = reference(p);
      if (r && db.includes(r)) stop("RECETTE_DATABASE_URL contient la référence du projet de PRODUCTION. Refus.");
    }
    if (!db.includes(ref)) stop("RECETTE_DATABASE_URL ne désigne pas le projet de RECETTE_SUPABASE_URL. Refus.");
  }
  console.log(`✅ Cible vérifiée : projet de recette « ${ref} », distinct du projet de production.`);
  return { url, hote: h, ref };
}

/** Clé obligatoire, lue dans une variable RECETTE_* (jamais affichée). */
export function cle(nom) {
  const v = String(process.env[nom] ?? "").trim();
  if (!v) stop(`${nom} manquante.`);
  return v;
}
