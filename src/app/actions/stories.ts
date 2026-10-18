"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoles, isAdmin } from "@/lib/roles";
import { bunnyPlaybackUrls, bunnyTusAuth, createBunnyVideo, isBunnyConfigured } from "@/lib/bunny/stream";
import { VIE_STORY_MS, decouperVideo, lireCommentaire, lireLegende, verifierDureeStory, verifierPhotoStory } from "@/lib/stories/regles";
import { lienRefuse, lireCalques, lireFond, lireInteraction, resultatSondage, type Calque } from "@/lib/stories/calques";
import { etatMigrationStories } from "@/lib/stories/load";
import { nomPublic } from "@/lib/nom-public";
import { avatarSur } from "@/lib/classe/vue";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { signalerAValider, statutPourAuteur } from "@/lib/visiteuses/moderation";

/**
 * Stories : élèves ET enseignantes, connectées. Photo (stockage « posts », dossier stories/), vidéo de
 * 30 s au plus (Bunny Stream ; une vidéo plus longue devient plusieurs stories à la suite) ou « texte seul » sur un fond. Calques comme Instagram (texte, dessin,
 * autocollants, question, sondage, compte à rebours, lien) revalidés ici. Visibles 24 h.
 * Chacune supprime les siennes ; l'administration peut supprimer n'importe quelle story (modération).
 */

const INDISPONIBLE = "Les stories ne sont pas encore activées sur ce site (migration 099 à appliquer).";
const CREATIVES_INDISPONIBLES = "Texte, dessin et autocollants ne sont pas encore activés sur ce site (migration 102 à appliquer).";
const DECOUPAGE_INDISPONIBLE = "Les vidéos longues (découpées en plusieurs stories) ne sont pas encore activées sur ce site (migration 105 à appliquer). En attendant : une vidéo de 30 s au plus.";
/** Question, sondage, compte à rebours : sur la 1re partie seulement (sinon les réponses seraient éparpillées). */
const INTERACTIFS: ReadonlySet<string> = new Set(["question", "sondage", "compte"]);

type Reponse = { ok: true; enAttente?: boolean } | { ok: false; erreur: string };

async function connectee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function estEquipe(userId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("users").select("role, roles").eq("id", userId).maybeSingle();
  return getRoles(data).some((r) => r === "formateur" || r === "admin");
}

const LIEN_EXTERNE = "Les liens vers un autre site sont réservés à l'équipe : choisissez une page du site Arazzo (par exemple /communaute).";

function calquesDepuis(brut: unknown, equipe: boolean): { ok: true; calques: Calque[] } | { ok: false; erreur: string } {
  let v = brut;
  if (typeof brut === "string") { try { v = JSON.parse(brut); } catch { v = []; } }
  if (lienRefuse(v, equipe)) return { ok: false, erreur: LIEN_EXTERNE };
  return { ok: true, calques: lireCalques(v, { equipe, maintenant: new Date() }) };
}

/**
 * Enregistre la story ; si la migration 102 manque, la story part quand même SANS calques (s'il n'y en a pas).
 * B. La story d'une visiteuse (compte sans formation) attend la validation de l'équipe ; ses 24 h partent de la validation.
 */
async function inserer(ligne: Record<string, unknown>, calques: Calque[], fond: string | null): Promise<Reponse> {
  const admin = createAdminClient();
  const st = await statutPourAuteur(admin, ligne.user_id as string);
  if (!st.ok) return st;
  const complete = { ...ligne, calques, fond, expires_at: new Date(Date.now() + VIE_STORY_MS).toISOString(), ...(st.a_valider ? { a_valider: true } : {}) };
  const r = await admin.from("stories").insert(complete);
  if (!r.error) {
    if (st.a_valider) await signalerAValider(admin, "Une story");
    return { ok: true, enAttente: st.a_valider };
  }
  if (/calques|fond|column|schema cache|media_kind|stories_media/i.test(r.error.message)) {
    if (calques.length || fond || ligne.media_kind === "texte") return { ok: false, erreur: CREATIVES_INDISPONIBLES };
    const { calques: _c, fond: _f, ...simple } = complete;
    const r2 = await admin.from("stories").insert(simple);
    if (r2.error) return { ok: false, erreur: r2.error.message };
    if (st.a_valider) await signalerAValider(admin, "Une story");
    return { ok: true, enAttente: st.a_valider };
  }
  return { ok: false, erreur: r.error.message };
}

export async function publierStoryPhoto(fd: FormData): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  const f = fd.get("photo");
  if (!(f instanceof File)) return { ok: false, erreur: "Choisissez une photo." };
  const pb = verifierPhotoStory({ type: f.type, size: f.size });
  if (pb) return { ok: false, erreur: pb };
  const cq = calquesDepuis(fd.get("calques"), await estEquipe(user.id));
  if (!cq.ok) return cq;
  const admin = createAdminClient();
  if (await etatMigrationStories(admin)) return { ok: false, erreur: INDISPONIBLE };

  const ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const chemin = `stories/${user.id}/${randomUUID()}.${ext}`;
  const up = await admin.storage.from("posts").upload(chemin, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: false });
  if (up.error) return { ok: false, erreur: "Envoi de la photo impossible, réessayez." };
  const { data: pub } = admin.storage.from("posts").getPublicUrl(chemin);
  const r = await inserer(
    { user_id: user.id, media_kind: "image", media_url: pub.publicUrl, storage_path: chemin, legende: lireLegende(fd.get("legende")) },
    cq.calques, null,
  );
  if (!r.ok) { await admin.storage.from("posts").remove([chemin]); return r; }
  revalidatePath("/dashboard/classe");
  revalidatePath("/communaute");
  return r;
}

/** Story « texte seul » : un fond de couleur + des calques (au moins un). */
export async function publierStoryTexte(entree: { fond: unknown; calques: unknown }): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  const fond = lireFond(entree.fond);
  const cq = calquesDepuis(entree.calques, await estEquipe(user.id));
  if (!cq.ok) return cq;
  const calques = cq.calques;
  if (!fond) return { ok: false, erreur: "Choisissez un fond." };
  if (!calques.length) return { ok: false, erreur: "Ajoutez au moins un texte, un dessin ou un autocollant." };
  if (await etatMigrationStories(createAdminClient())) return { ok: false, erreur: INDISPONIBLE };
  const r = await inserer({ user_id: user.id, media_kind: "texte" }, calques, fond);
  if (r.ok) { revalidatePath("/dashboard/classe"); revalidatePath("/communaute"); }
  return r;
}

/** `parties` > 1 : vidéo longue (vérifie AVANT l'envoi que le découpage est activé). */
export async function demarrerStoryVideo(opts?: { parties?: unknown }): Promise<
  { ok: true; videoId: string; tus: ReturnType<typeof bunnyTusAuth> } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  if (!isBunnyConfigured()) return { ok: false, erreur: "Les vidéos ne sont pas disponibles sur ce serveur : publiez une photo." };
  if (await etatMigrationStories(createAdminClient())) return { ok: false, erreur: INDISPONIBLE };
  if (typeof opts?.parties === "number" && opts.parties > 1) {
    const t = await createAdminClient().from("stories").select("debut_s").limit(1);
    if (t.error) return { ok: false, erreur: DECOUPAGE_INDISPONIBLE };
  }
  const st = await statutPourAuteur(createAdminClient(), user.id);
  if (!st.ok) return st;
  const v = await createBunnyVideo(`Story ${user.id.slice(0, 8)}`);
  if (!v.ok) return { ok: false, erreur: v.error };
  return { ok: true, videoId: v.videoId, tus: bunnyTusAuth(v.videoId) };
}

export async function finaliserStoryVideo(entree: { videoId: unknown; duree: unknown; legende: unknown; calques?: unknown }): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  if (typeof entree.videoId !== "string" || !/^[0-9a-f-]{8,64}$/i.test(entree.videoId)) return { ok: false, erreur: "Vidéo invalide." };
  const d = verifierDureeStory(entree.duree);
  if (!d.ok) return { ok: false, erreur: d.erreur };
  const cq = calquesDepuis(entree.calques, await estEquipe(user.id));
  if (!cq.ok) return cq;
  const r = await inserer({
    user_id: user.id, media_kind: "video", bunny_video_id: entree.videoId, thumbnail_url: bunnyPlaybackUrls(entree.videoId).thumbnail,
    duration_seconds: d.duree, legende: lireLegende(entree.legende),
  }, cq.calques, null);
  if (r.ok) { revalidatePath("/dashboard/classe"); revalidatePath("/communaute"); }
  return r;
}

/**
 * Vidéo LONGUE : une seule vidéo Bunny, plusieurs stories (une par partie de 30 s au plus), publiées ensemble
 * et à la suite. Les calques visuels (texte, dessin, autocollants, lien) sont sur chaque partie ; question,
 * sondage et compte à rebours sur la première seulement.
 */
export async function finaliserStoryVideoLongue(entree: { videoId: unknown; duree: unknown; legende: unknown; calques?: unknown }): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  if (typeof entree.videoId !== "string" || !/^[0-9a-f-]{8,64}$/i.test(entree.videoId)) return { ok: false, erreur: "Vidéo invalide." };
  const dec = decouperVideo(entree.duree);
  if (!dec.ok) return dec;
  if (dec.parties.length === 1) return finaliserStoryVideo({ videoId: entree.videoId, duree: dec.duree, legende: entree.legende, calques: entree.calques });
  const cq = calquesDepuis(entree.calques, await estEquipe(user.id));
  if (!cq.ok) return cq;
  const admin = createAdminClient();
  const st = await statutPourAuteur(admin, user.id);
  if (!st.ok) return st;

  const videoId = entree.videoId;
  const legende = lireLegende(entree.legende);
  const thumbnail_url = bunnyPlaybackUrls(videoId).thumbnail;
  const maintenant = Date.now();
  // Insertion groupée : toutes les lignes ont les MÊMES colonnes. Sans aucun calque, la colonne n'est pas
  // envoyée (la story part même si la migration 102 manque).
  const avecCalques = cq.calques.length > 0;
  const lignes = dec.parties.map((p, k) => {
    const calques = k === 0 ? cq.calques : cq.calques.filter((c) => !INTERACTIFS.has(c.type));
    return {
      user_id: user.id, media_kind: "video", bunny_video_id: videoId, thumbnail_url,
      duration_seconds: p.duree, debut_s: p.debut, legende,
      ...(avecCalques ? { calques } : {}),
      // Dans l'ordre de la vidéo : la visionneuse trie par date de création.
      created_at: new Date(maintenant + k * 1000).toISOString(),
      expires_at: new Date(maintenant + k * 1000 + VIE_STORY_MS).toISOString(),
      ...(st.a_valider ? { a_valider: true } : {}),
    };
  });
  const r = await admin.from("stories").insert(lignes);
  if (r.error) {
    if (/debut_s/i.test(r.error.message)) return { ok: false, erreur: DECOUPAGE_INDISPONIBLE };
    if (/calques|column|schema cache/i.test(r.error.message)) return { ok: false, erreur: CREATIVES_INDISPONIBLES };
    return { ok: false, erreur: r.error.message };
  }
  if (st.a_valider) await signalerAValider(admin, `Une vidéo en ${lignes.length} stories`);
  revalidatePath("/dashboard/classe");
  revalidatePath("/communaute");
  return { ok: true, enAttente: st.a_valider };
}

export async function supprimerStory(id: unknown): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Non connectée." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erreur: "Story invalide." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("stories").select("user_id, storage_path").eq("id", id).maybeSingle();
  if (!s) return { ok: false, erreur: "Story introuvable." };
  if (s.user_id !== user.id) {
    const { data: prof } = await admin.from("users").select("role, roles").eq("id", user.id).maybeSingle();
    if (!isAdmin(prof)) return { ok: false, erreur: "Vous ne pouvez supprimer que vos stories." };
  }
  const del = await admin.from("stories").delete().eq("id", id);
  if (del.error) return { ok: false, erreur: del.error.message };
  if (s.storage_path) await admin.storage.from("posts").remove([s.storage_path as string]);
  return { ok: true };
}

// ─── Vues et interactions (migration 102) ──────────────────────────────────

async function storyActive(id: unknown): Promise<{ id: string; user_id: string; calques: Calque[] } | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("stories").select("id, user_id, calques, expires_at").eq("id", id).maybeSingle();
  if (!data || new Date(data.expires_at as string).getTime() <= Date.now()) return null;
  return { id: data.id as string, user_id: data.user_id as string, calques: Array.isArray(data.calques) ? (data.calques as Calque[]) : [] };
}

/** « Vue » : enregistrée une fois par personne (jamais pour l'autrice). Silencieuse si indisponible. */
export async function voirStory(id: unknown): Promise<void> {
  const user = await connectee();
  if (!user) return;
  const s = await storyActive(id);
  if (!s || s.user_id === user.id) return;
  await createAdminClient().from("story_vues").upsert({ story_id: s.id, user_id: user.id, vue_le: new Date().toISOString() }, { onConflict: "story_id,user_id", ignoreDuplicates: true });
}

/** Réponse à une question, vote à un sondage, réaction (la dernière remplace la précédente). */
export async function interagirStory(entree: { storyId: unknown; calqueId?: unknown; kind: unknown; valeur: unknown }): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour répondre." };
  const s = await storyActive(entree.storyId);
  if (!s) return { ok: false, erreur: "Cette story n'est plus disponible." };
  if (s.user_id === user.id) return { ok: false, erreur: "C'est votre story." };
  const i = lireInteraction({ calqueId: entree.calqueId, kind: entree.kind, valeur: entree.valeur }, s.calques);
  if (!i) return { ok: false, erreur: "Réponse invalide." };
  const admin = createAdminClient();
  const r = await admin.from("story_interactions").upsert(
    { story_id: s.id, calque_id: i.calqueId, user_id: user.id, kind: i.kind, valeur: i.valeur, created_at: new Date().toISOString() },
    { onConflict: "story_id,calque_id,user_id,kind" },
  );
  if (r.error) return { ok: false, erreur: /story_interactions|schema cache/i.test(r.error.message) ? CREATIVES_INDISPONIBLES : r.error.message };
  // L'autrice est prévenue d'une RÉPONSE à sa question (pas des votes ni des réactions).
  if (i.kind === "reponse") {
    await admin.from("notifications").insert({
      user_id: s.user_id, type: "story", title: "💬 Nouvelle réponse à votre story", body: i.valeur.slice(0, 200), link: `/communaute/u/${s.user_id}`,
    });
  }
  return { ok: true };
}

export interface EtatStoryVue {
  /** Mon vote par sondage, ma réaction. */
  mesVotes: Record<string, string>;
  maReaction: string | null;
  /** Résultats des sondages (montrés après avoir voté, et toujours à l'autrice). */
  sondages: Record<string, { pct: [number, number]; total: number }>;
}

/** Ce que la personne connectée a déjà fait sur ces stories + résultats des sondages. */
export async function etatStories(ids: unknown): Promise<Record<string, EtatStoryVue>> {
  const user = await connectee();
  if (!user || !Array.isArray(ids)) return {};
  const liste = ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 100);
  if (!liste.length) return {};
  const { data, error } = await createAdminClient().from("story_interactions").select("story_id, calque_id, user_id, kind, valeur").in("story_id", liste).in("kind", ["vote", "reaction"]);
  if (error) return {};
  const out: Record<string, EtatStoryVue> = {};
  const votes = new Map<string, string[]>();
  for (const r of (data ?? []) as { story_id: string; calque_id: string; user_id: string; kind: string; valeur: string }[]) {
    const e = (out[r.story_id] ??= { mesVotes: {}, maReaction: null, sondages: {} });
    if (r.kind === "vote") {
      votes.set(`${r.story_id}|${r.calque_id}`, [...(votes.get(`${r.story_id}|${r.calque_id}`) ?? []), r.valeur]);
      if (r.user_id === user.id) e.mesVotes[r.calque_id] = r.valeur;
    } else if (r.user_id === user.id) e.maReaction = r.valeur;
  }
  for (const [cle, v] of votes) {
    const [sid, cid] = cle.split("|");
    const res = resultatSondage(v);
    out[sid].sondages[cid] = { pct: res.pct, total: res.total };
  }
  return out;
}

export interface StatsStory {
  vues: { nom: string; quand: string }[];
  reponses: { calqueId: string; nom: string; texte: string; quand: string }[];
  reactions: { emoji: string; nom: string }[];
  sondages: Record<string, { nombres: [number, number]; pct: [number, number]; total: number }>;
}

/** Pour l'autrice (ou l'administration) : qui a vu, les réponses, les réactions, les sondages. */
export async function statsStory(id: unknown): Promise<{ ok: true; stats: StatsStory } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Non connectée." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erreur: "Story invalide." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("stories").select("user_id").eq("id", id).maybeSingle();
  if (!s) return { ok: false, erreur: "Story introuvable." };
  const { data: prof } = await admin.from("users").select("role, roles").eq("id", user.id).maybeSingle();
  const equipe = getRoles(prof).some((r) => r === "formateur" || r === "admin");
  if (s.user_id !== user.id && !isAdmin(prof)) return { ok: false, erreur: "Ces informations sont réservées à l'autrice de la story." };
  const [v, it] = await Promise.all([
    admin.from("story_vues").select("user_id, vue_le").eq("story_id", id).order("vue_le", { ascending: false }).limit(500),
    admin.from("story_interactions").select("calque_id, user_id, kind, valeur, created_at").eq("story_id", id).limit(1000),
  ]);
  if (v.error || it.error) return { ok: false, erreur: CREATIVES_INDISPONIBLES };
  const vues = (v.data ?? []) as { user_id: string; vue_le: string }[];
  const inter = (it.data ?? []) as { calque_id: string; user_id: string; kind: string; valeur: string; created_at: string }[];
  const ids = [...new Set([...vues.map((x) => x.user_id), ...inter.map((x) => x.user_id)])];
  const noms = new Map<string, string>();
  if (ids.length) {
    const u = await admin.from("users").select("id, nom, username, role, roles").in("id", ids.slice(0, 500));
    // L'équipe voit les vrais noms ; une élève voit les noms publics (pseudos).
    for (const p of (u.data ?? []) as { id: string; nom: string | null; username: string | null; role: string | null; roles: string[] | null }[]) {
      noms.set(p.id, equipe ? ((p.nom ?? "").trim() || nomPublic(p)) : nomPublic(p));
    }
  }
  const nom = (uid: string) => noms.get(uid) ?? "Membre";
  const votes = new Map<string, string[]>();
  for (const x of inter.filter((y) => y.kind === "vote")) votes.set(x.calque_id, [...(votes.get(x.calque_id) ?? []), x.valeur]);
  return {
    ok: true,
    stats: {
      vues: vues.map((x) => ({ nom: nom(x.user_id), quand: x.vue_le })),
      reponses: inter.filter((x) => x.kind === "reponse").sort((a, b) => b.created_at.localeCompare(a.created_at)).map((x) => ({ calqueId: x.calque_id, nom: nom(x.user_id), texte: x.valeur, quand: x.created_at })),
      reactions: inter.filter((x) => x.kind === "reaction").map((x) => ({ emoji: x.valeur, nom: nom(x.user_id) })),
      sondages: Object.fromEntries([...votes].map(([cid, vs]) => [cid, resultatSondage(vs)])),
    },
  };
}

// ─── Commentaires (migration 106) ──────────────────────────────────────────
// Toute personne connectée commente une story qu'elle peut voir — pendant ses 24 h ET dans l'historique du profil.
// L'autrice est prévenue ; chacune supprime ses commentaires, l'autrice ceux de ses stories, l'administration tous.

const COMMENTAIRES_INDISPONIBLES = "Les commentaires des stories ne sont pas encore activés sur ce site (migration 106 à appliquer).";

export interface CommentaireStory {
  id: string;
  userId: string;
  nom: string;
  avatar: string | null;
  texte: string;
  createdAt: string;
  peutSupprimer: boolean;
}

type Personne = { id: string; nom: string | null; username: string | null; role: string | null; roles: string[] | null; avatar_url: string | null };

/** La story, si la personne peut la voir (une story en attente de validation : l'autrice et l'administration). */
async function storyVisible(id: unknown, userId: string): Promise<{ id: string; user_id: string; admin: boolean } | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = createAdminClient();
  const [{ data: s }, { data: prof }] = await Promise.all([
    db.from("stories").select("*").eq("id", id).maybeSingle(),
    db.from("users").select("role, roles").eq("id", userId).maybeSingle(),
  ]);
  if (!s) return null;
  const admin = isAdmin(prof);
  if ((s as { a_valider?: boolean | null }).a_valider === true && s.user_id !== userId && !admin) return null;
  return { id: s.id as string, user_id: s.user_id as string, admin };
}

export async function commentairesStory(id: unknown): Promise<{ ok: true; commentaires: CommentaireStory[] } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour voir les commentaires." };
  const s = await storyVisible(id, user.id);
  if (!s) return { ok: false, erreur: "Story introuvable." };
  const db = createAdminClient();
  const r = await db.from("story_commentaires").select("id, user_id, texte, created_at").eq("story_id", s.id).order("created_at", { ascending: true }).limit(300);
  if (r.error) return { ok: false, erreur: COMMENTAIRES_INDISPONIBLES };
  const lignes = (r.data ?? []) as { id: string; user_id: string; texte: string; created_at: string }[];
  const ids = [...new Set(lignes.map((l) => l.user_id))];
  const u = ids.length ? await db.from("users").select("id, nom, username, role, roles, avatar_url").in("id", ids.slice(0, 300)) : { data: [] };
  const gens = new Map(((u.data ?? []) as Personne[]).map((p) => [p.id, p]));
  return {
    ok: true,
    commentaires: lignes.map((l) => {
      const p = gens.get(l.user_id);
      return {
        id: l.id, userId: l.user_id, nom: p ? nomPublic(p) : "Membre", avatar: p ? avatarSur(p.avatar_url) : null,
        texte: l.texte, createdAt: l.created_at, peutSupprimer: l.user_id === user.id || s.user_id === user.id || s.admin,
      };
    }),
  };
}

export async function commenterStory(entree: { storyId: unknown; texte: unknown }): Promise<{ ok: true; commentaire: CommentaireStory } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour commenter." };
  const texte = lireCommentaire(entree.texte);
  if (!texte) return { ok: false, erreur: "Écrivez votre commentaire." };
  if (!(await checkRateLimit("commentaire", user.id)).ok) return { ok: false, erreur: "Beaucoup de commentaires d'un coup : réessayez dans quelques minutes." };
  const s = await storyVisible(entree.storyId, user.id);
  if (!s) return { ok: false, erreur: "Cette story n'est plus disponible." };
  const db = createAdminClient();
  const r = await db.from("story_commentaires").insert({ story_id: s.id, user_id: user.id, texte }).select("id, created_at").single();
  if (r.error || !r.data) {
    return { ok: false, erreur: /story_commentaires|schema cache|relation|does not exist/i.test(r.error?.message ?? "") ? COMMENTAIRES_INDISPONIBLES : "Commentaire non envoyé, réessayez." };
  }
  const { data: moi } = await db.from("users").select("id, nom, username, role, roles, avatar_url").eq("id", user.id).maybeSingle();
  const nom = moi ? nomPublic(moi as Personne) : "Membre";
  // L'autrice est prévenue (cloche du site ; la notification du téléphone part du webhook des notifications).
  if (s.user_id !== user.id) {
    try {
      await db.from("notifications").insert({
        user_id: s.user_id, type: "story", title: `💬 ${nom} a commenté votre story`, body: texte.slice(0, 120),
        link: `/communaute/u/${s.user_id}?onglet=stories`,
      });
    } catch { /* la notification ne bloque jamais le commentaire */ }
  }
  revalidatePath(`/communaute/u/${s.user_id}`);
  return {
    ok: true,
    commentaire: {
      id: r.data.id as string, userId: user.id, nom, avatar: moi ? avatarSur((moi as Personne).avatar_url) : null,
      texte, createdAt: r.data.created_at as string, peutSupprimer: true,
    },
  };
}

export async function supprimerCommentaireStory(id: unknown): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Non connectée." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erreur: "Commentaire invalide." };
  const db = createAdminClient();
  const { data: c } = await db.from("story_commentaires").select("id, user_id, story_id").eq("id", id).maybeSingle();
  if (!c) return { ok: false, erreur: "Commentaire introuvable." };
  if (c.user_id !== user.id) {
    const s = await storyVisible(c.story_id, user.id);
    if (!s || (s.user_id !== user.id && !s.admin)) return { ok: false, erreur: "Vous ne pouvez supprimer que vos commentaires (ou ceux de vos stories)." };
  }
  const del = await db.from("story_commentaires").delete().eq("id", id);
  if (del.error) return { ok: false, erreur: del.error.message };
  return { ok: true };
}
