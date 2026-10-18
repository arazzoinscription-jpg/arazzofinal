"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/roles";
import { VIE_STORY_MS, lireLegende, verifierPhotoStory } from "@/lib/stories/regles";
import { MIGRATION_103, chargerMissions, estInscrite, migration103, niveauDuTest, type MissionsVue } from "@/lib/visiteuses/load";
import { formationSuggeree, lireDefi } from "@/lib/visiteuses/regles";
import { signalerAValider, statutPourAuteur } from "@/lib/visiteuses/moderation";
import { prevenirLaCour } from "@/lib/cour-notifications-envoi";

/**
 * Comptes SANS formation (« visiteuses ») : missions du feed, envies, défi de la semaine,
 * et la validation de leurs publications par l'administration (B).
 * Aucune action n'envoie d'e-mail : seulement des notifications dans le site.
 */

type Reponse = { ok: true } | { ok: false; erreur: string };
const ID = /^[0-9a-f-]{36}$/i;

async function connectee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function administratrice(): Promise<{ id: string } | null> {
  const user = await connectee();
  if (!user) return null;
  const { data } = await createAdminClient().from("users").select("role, roles").eq("id", user.id).maybeSingle();
  return isAdmin(data) ? { id: user.id } : null;
}

async function notifier(userId: string, title: string, body: string | null, link: string) {
  try { await createAdminClient().from("notifications").insert({ user_id: userId, type: "moderation", title, body, link }); } catch { /* sans gravité */ }
}

// ─── Missions (visiteuse connectée) ─────────────────────────────────────────

/** Le panneau « Missions » à jour (après un geste). Rien pour une élève inscrite. */
export async function missionsDuFeed(): Promise<MissionsVue | null> {
  const user = await connectee();
  if (!user) return null;
  const admin = createAdminClient();
  if (await estInscrite(admin, user.id)) return null;
  return chargerMissions(admin, { id: user.id, email: user.email ?? null });
}

/** Mission 4 : « J'aimerais apprendre ce modèle » (une 2ᵉ pression retire l'envie). */
export async function basculerEnvie(mediaId: unknown): Promise<{ ok: true; envie: boolean } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour garder ce modèle." };
  if (typeof mediaId !== "string" || !ID.test(mediaId)) return { ok: false, erreur: "Modèle introuvable." };
  const admin = createAdminClient();
  const deja = await admin.from("feed_envies").select("id").eq("user_id", user.id).eq("media_id", mediaId).maybeSingle();
  if (deja.error) return { ok: false, erreur: MIGRATION_103 };
  if (deja.data) {
    await admin.from("feed_envies").delete().eq("id", deja.data.id as string);
    return { ok: true, envie: false };
  }
  const [{ data: m }, { data: u }, test] = await Promise.all([
    admin.from("community_media").select("id, course:courses(slug, titre_fr), post:posts(content)").eq("id", mediaId).maybeSingle(),
    admin.from("users").select("nom, email").eq("id", user.id).maybeSingle(),
    niveauDuTest(admin, user.email),
  ]);
  if (!m) return { ok: false, erreur: "Modèle introuvable." };
  const media = m as unknown as { course: { slug: string | null; titre_fr: string | null } | null; post: { content: string | null } | null };
  const formation = formationSuggeree({ courseSlug: media.course?.slug ?? null, courseTitre: media.course?.titre_fr ?? null }, test.niveau);
  const r = await admin.from("feed_envies").insert({
    user_id: user.id, media_id: mediaId, email: (u?.email as string | null) ?? user.email ?? null, nom: (u?.nom as string | null) ?? null,
    titre: (media.post?.content ?? "").replace(/\s+/g, " ").trim().slice(0, 140) || null, niveau_suggere: formation.titre,
  });
  if (r.error && !/duplicate|23505/i.test(r.error.message)) return { ok: false, erreur: r.error.message };
  return { ok: true, envie: true };
}

/** Mission 3 : participer au défi de la semaine avec une photo (visiteuse : validée par l'équipe). */
export async function participerDefi(fd: FormData): Promise<{ ok: true; enAttente: boolean } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour participer au défi." };
  const defiId = fd.get("defiId");
  if (typeof defiId !== "string" || !ID.test(defiId)) return { ok: false, erreur: "Défi introuvable." };
  const f = fd.get("photo");
  if (!(f instanceof File)) return { ok: false, erreur: "Choisissez la photo de votre réalisation." };
  const pb = verifierPhotoStory({ type: f.type, size: f.size });
  if (pb) return { ok: false, erreur: pb };
  const admin = createAdminClient();
  const { data: defi, error } = await admin.from("defis").select("id, titre, debut, fin").eq("id", defiId).maybeSingle();
  if (error) return { ok: false, erreur: MIGRATION_103 };
  const t = Date.now();
  if (!defi || new Date(defi.debut as string).getTime() > t || new Date(defi.fin as string).getTime() <= t) return { ok: false, erreur: "Ce défi est terminé." };
  const { data: deja } = await admin.from("community_media").select("id, post:posts!inner(author_id)").eq("defi_id", defiId).eq("post.author_id", user.id).limit(1);
  if (deja?.length) return { ok: false, erreur: "Vous participez déjà à ce défi : une photo par personne." };
  const st = await statutPourAuteur(admin, user.id);
  if (!st.ok) return st;

  const ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const chemin = `defis/${user.id}/${randomUUID()}.${ext}`;
  const up = await admin.storage.from("posts").upload(chemin, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: false });
  if (up.error) return { ok: false, erreur: "Envoi de la photo impossible, réessayez." };
  const { data: pub } = admin.storage.from("posts").getPublicUrl(chemin);
  const legende = lireLegende(fd.get("legende"));
  const { data: post, error: e1 } = await admin.from("posts")
    .insert({ author_id: user.id, group_id: null, content: legende ? `${legende} · Défi : ${defi.titre}` : `Défi : ${defi.titre}`, published: st.published, ...(st.a_valider ? { a_valider: true } : {}) })
    .select("id").single();
  if (e1 || !post) { await admin.storage.from("posts").remove([chemin]); return { ok: false, erreur: "Participation impossible, réessayez." }; }
  const cm = await admin.from("community_media").insert({
    post_id: post.id, source_type: "student_reel", media_kind: "image", media_url: pub.publicUrl, thumbnail_url: pub.publicUrl, defi_id: defiId, status: "ready",
  });
  if (cm.error) {
    await admin.from("posts").delete().eq("id", post.id);
    await admin.storage.from("posts").remove([chemin]);
    return { ok: false, erreur: cm.error.message };
  }
  if (st.a_valider) await signalerAValider(admin, `Une participation au défi « ${defi.titre} »`);
  revalidatePath("/communaute");
  return { ok: true, enAttente: st.a_valider };
}

// ─── Validation par l'administration (B) ────────────────────────────────────

export async function validerPublication(postId: unknown): Promise<Reponse> {
  if (!(await administratrice())) return { ok: false, erreur: "Réservé à l'administration." };
  if (typeof postId !== "string" || !ID.test(postId)) return { ok: false, erreur: "Publication introuvable." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("posts").update({ published: true, a_valider: false }).eq("id", postId).eq("a_valider", true).select("author_id");
  if (error) return { ok: false, erreur: error.message };
  const auteur = (data?.[0] as { author_id: string } | undefined)?.author_id;
  if (!auteur) return { ok: false, erreur: "Déjà traitée." };
  await notifier(auteur, "✅ Votre publication est en ligne", "L'équipe Arazzo l'a validée : toute la communauté peut la voir.", `/communaute/u/${auteur}`);
  await prevenirLaCour(admin, { auteurId: auteur, quoi: "publication" });
  revalidatePath("/communaute");
  revalidatePath("/admin/communaute");
  return { ok: true };
}

export async function refuserPublication(postId: unknown, motif?: unknown): Promise<Reponse> {
  if (!(await administratrice())) return { ok: false, erreur: "Réservé à l'administration." };
  if (typeof postId !== "string" || !ID.test(postId)) return { ok: false, erreur: "Publication introuvable." };
  const admin = createAdminClient();
  const { data: post } = await admin.from("posts").select("author_id, a_valider, media:community_media(media_url)").eq("id", postId).maybeSingle();
  if (!post || !(post as { a_valider?: boolean }).a_valider) return { ok: false, erreur: "Déjà traitée." };
  const del = await admin.from("posts").delete().eq("id", postId);
  if (del.error) return { ok: false, erreur: del.error.message };
  // Photo envoyée sur le site (défi, résultat) : on la retire aussi du stockage.
  const medias = ((post as { media?: { media_url: string | null }[] | { media_url: string | null } | null }).media);
  const chemins = (Array.isArray(medias) ? medias : medias ? [medias] : [])
    .map((m) => m.media_url?.split("/object/public/posts/")[1]).filter((x): x is string => Boolean(x));
  if (chemins.length) await admin.storage.from("posts").remove(chemins.map(decodeURIComponent));
  const raison = typeof motif === "string" ? motif.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  await notifier((post as { author_id: string }).author_id, "Votre publication n'a pas été retenue", raison || "Elle ne correspond pas aux règles de la communauté. Vous pouvez en proposer une autre.", "/communaute");
  revalidatePath("/admin/communaute");
  return { ok: true };
}

export async function validerStory(id: unknown): Promise<Reponse> {
  if (!(await administratrice())) return { ok: false, erreur: "Réservé à l'administration." };
  if (typeof id !== "string" || !ID.test(id)) return { ok: false, erreur: "Story introuvable." };
  const admin = createAdminClient();
  // Ses 24 h commencent à la validation.
  const maintenant = new Date();
  const { data, error } = await admin.from("stories")
    .update({ a_valider: false, created_at: maintenant.toISOString(), expires_at: new Date(maintenant.getTime() + VIE_STORY_MS).toISOString() })
    .eq("id", id).eq("a_valider", true).select("user_id");
  if (error) return { ok: false, erreur: error.message };
  const auteur = (data?.[0] as { user_id: string } | undefined)?.user_id;
  if (!auteur) return { ok: false, erreur: "Déjà traitée." };
  await notifier(auteur, "✅ Votre story est en ligne", "L'équipe Arazzo l'a validée : elle est visible 24 h.", "/communaute");
  await prevenirLaCour(admin, { auteurId: auteur, quoi: "story" });
  revalidatePath("/communaute");
  revalidatePath("/admin/communaute");
  return { ok: true };
}

export async function refuserStory(id: unknown, motif?: unknown): Promise<Reponse> {
  if (!(await administratrice())) return { ok: false, erreur: "Réservé à l'administration." };
  if (typeof id !== "string" || !ID.test(id)) return { ok: false, erreur: "Story introuvable." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("stories").select("user_id, storage_path, a_valider").eq("id", id).maybeSingle();
  if (!s || !s.a_valider) return { ok: false, erreur: "Déjà traitée." };
  const del = await admin.from("stories").delete().eq("id", id);
  if (del.error) return { ok: false, erreur: del.error.message };
  if (s.storage_path) await admin.storage.from("posts").remove([s.storage_path as string]);
  const raison = typeof motif === "string" ? motif.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  await notifier(s.user_id as string, "Votre story n'a pas été retenue", raison || "Elle ne correspond pas aux règles de la communauté.", "/communaute");
  revalidatePath("/admin/communaute");
  return { ok: true };
}

// ─── Défi de la semaine (administration) ────────────────────────────────────

export async function creerDefi(entree: { titre: unknown; consigne: unknown; recompense: unknown; fin: unknown }): Promise<Reponse> {
  const moi = await administratrice();
  if (!moi) return { ok: false, erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!(await migration103(admin))) return { ok: false, erreur: MIGRATION_103 };
  const d = lireDefi(entree, new Date());
  if (!d.ok) return d;
  const r = await admin.from("defis").insert({ ...d.defi, debut: new Date().toISOString(), created_by: moi.id });
  if (r.error) return { ok: false, erreur: r.error.message };
  revalidatePath("/admin/communaute");
  revalidatePath("/communaute");
  return { ok: true };
}

export async function terminerDefi(id: unknown): Promise<Reponse> {
  if (!(await administratrice())) return { ok: false, erreur: "Réservé à l'administration." };
  if (typeof id !== "string" || !ID.test(id)) return { ok: false, erreur: "Défi introuvable." };
  const admin = createAdminClient();
  const { data: d } = await admin.from("defis").select("debut").eq("id", id).maybeSingle();
  if (!d) return { ok: false, erreur: "Défi introuvable." };
  // La fin doit rester après le début (contrainte de la table).
  const fin = new Date(Math.max(Date.now(), new Date(d.debut as string).getTime() + 1000)).toISOString();
  const r = await admin.from("defis").update({ fin }).eq("id", id);
  if (r.error) return { ok: false, erreur: r.error.message };
  revalidatePath("/admin/communaute");
  revalidatePath("/communaute");
  return { ok: true };
}

/** Désigne la plus belle réalisation : sa créatrice reçoit une notification avec la récompense. */
export async function designerGagnante(defiId: unknown, mediaId: unknown): Promise<Reponse> {
  if (!(await administratrice())) return { ok: false, erreur: "Réservé à l'administration." };
  if (typeof defiId !== "string" || !ID.test(defiId) || typeof mediaId !== "string" || !ID.test(mediaId)) return { ok: false, erreur: "Participation introuvable." };
  const admin = createAdminClient();
  const [{ data: d }, { data: m }] = await Promise.all([
    admin.from("defis").select("titre, recompense, gagnant_media_id").eq("id", defiId).maybeSingle(),
    admin.from("community_media").select("id, defi_id, post:posts!inner(author_id, published)").eq("id", mediaId).maybeSingle(),
  ]);
  const media = m as unknown as { defi_id: string | null; post: { author_id: string; published: boolean | null } | null } | null;
  if (!d || !media || media.defi_id !== defiId || media.post?.published === false) return { ok: false, erreur: "Participation introuvable (ou pas encore validée)." };
  if (d.gagnant_media_id) return { ok: false, erreur: "La gagnante de ce défi est déjà désignée." };
  const r = await admin.from("defis").update({ gagnant_media_id: mediaId }).eq("id", defiId);
  if (r.error) return { ok: false, erreur: r.error.message };
  const recompense = (d.recompense as string | null)?.trim();
  await notifier(media.post!.author_id, `🏆 Bravo ! Vous avez gagné le défi « ${d.titre as string} »`,
    recompense ? `Votre récompense : ${recompense}` : "L'équipe Arazzo vous contacte pour votre récompense.", "/communaute");
  revalidatePath("/admin/communaute");
  return { ok: true };
}
