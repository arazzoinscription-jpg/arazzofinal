import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFormateur, isAdmin as hasAdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireTout } from "@/lib/student-care/paginate";
import { type PracticalRow } from "./review-card";
import { PracticalsBoard } from "./practicals-board";

export const metadata = { title: "Travaux pratiques — Arazzo Formation" };
export const dynamic = "force-dynamic";

// Récupère des lignes par `.in(col, ids)` en LOTS : un `.in()` avec des centaines
// d'ids produit une URL trop longue et fait échouer la requête (fetch failed).
async function fetchInChunks(
  admin: any,
  table: string, cols: string, col: string, ids: string[], size = 150,
): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const { data } = await admin.from(table).select(cols).in(col, ids.slice(i, i + size));
    if (data) out.push(...data);
  }
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PratiquesPage({ searchParams }: { searchParams: { eleve?: string | string[] } }) {
  // « ?eleve=<id> » : seulement les travaux de cette élève (lien depuis sa fiche de suivi / Ma classe).
  const brutEleve = Array.isArray(searchParams.eleve) ? searchParams.eleve[0] : searchParams.eleve;
  const eleve = brutEleve && UUID.test(brutEleve) ? brutEleve : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(profile)) redirect("/dashboard");
  const isAdmin = hasAdminRole(profile);

  const admin = createAdminClient();

  // 1) Travaux à corriger (submitted/reviewed) + travaux déjà validés (approved, récents).
  //    Les validés RESTENT visibles afin de pouvoir les partager sur le feed à tout moment.
  //    La base ne renvoie que 1 000 lignes par demande (même avec `.limit(2000)`) → lecture page par page.
  const TRAVAUX_SELECT = "id, photo_url, video_url, annotation_url, note, feedback, status, created_at, lesson_id, student:users(nom)";
  const travauxBase = () => {
    const q = admin.from("lesson_practicals").select(TRAVAUX_SELECT);
    return eleve ? q.eq("user_id", eleve) : q;
  };
  const { lignes: pendingSubs } = await lireTout((de, a) => travauxBase()
    .in("status", ["submitted", "reviewed"])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(de, a));
  // Validés (les 2 000 plus récents) : triés par VALIDATION récente (reviewed_at) pour que le travail
  // qu'on vient de valider apparaisse tout en haut de « À partager ». Fallback
  // sur created_at si la colonne reviewed_at n'existe pas encore (migration 076).
  const lireValides = (parValidation: boolean) => lireTout((de, a) => {
    const q = travauxBase().eq("status", "approved");
    return (parValidation ? q.order("reviewed_at", { ascending: false, nullsFirst: false }) : q)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(de, a);
  }, { pagesMax: 2 });
  const { lignes: approvedSubs } = await lireValides(true).catch(() => lireValides(false));
  const subs = [...pendingSubs, ...approvedSubs];

  // 2) Leçon → cours → formateur, uniquement pour les leçons concernées.
  const lessonTitle = new Map<string, string>();
  const lessonCourse = new Map<string, string>();
  const courseTitle = new Map<string, string>();
  const courseFormateur = new Map<string, string | null>();
  const lessonIds = [...new Set(subs.map((s: any) => s.lesson_id).filter(Boolean))];
  if (lessonIds.length) {
    const lessons = await fetchInChunks(admin, "lessons", "id, titre, chapter_id", "id", lessonIds);
    const chapterIds = [...new Set((lessons ?? []).map((l: any) => l.chapter_id).filter(Boolean))];
    const chapterCourse = new Map<string, string>();
    if (chapterIds.length) {
      const chapters = await fetchInChunks(admin, "chapters", "id, course_id", "id", chapterIds);
      for (const ch of chapters ?? []) chapterCourse.set(ch.id, ch.course_id);
      const courseIds = [...new Set((chapters ?? []).map((c: any) => c.course_id).filter(Boolean))];
      if (courseIds.length) {
        const courses = await fetchInChunks(admin, "courses", "id, titre_fr, formateur_id", "id", courseIds);
        for (const c of courses ?? []) { courseTitle.set(c.id, c.titre_fr ?? "Formation"); courseFormateur.set(c.id, c.formateur_id ?? null); }
      }
    }
    for (const l of lessons ?? []) {
      lessonTitle.set(l.id, l.titre ?? "Leçon");
      const cid = chapterCourse.get(l.chapter_id);
      if (cid) lessonCourse.set(l.id, cid);
    }
  }

  // Chaque formateur ne voit QUE les travaux des cours dont il est le propriétaire ; l'admin voit tout.
  const owns = (s: any) => isAdmin || courseFormateur.get(lessonCourse.get(s.lesson_id) ?? "") === user.id;

  // 3) Travaux déjà publiés sur le feed (pour l'état « Publié » du bouton de partage).
  //    On lit directement les community_media de source « practical » (identifiants seulement)
  //    au lieu d'un `.in()` sur des centaines d'ids : un `.in()` trop long fait échouer
  //    la requête (URL trop longue) → sharedSet vidé → les travaux DÉJÀ publiés
  //    affichaient « Partager », et l'action renvoyait ensuite « Déjà publié » (échec).
  //    TOUS, page par page : au-delà de 1 000 travaux publiés, les suivants repassaient à « Partager ».
  const sharedSet = new Set<string>();
  {
    const { lignes: cm } = await lireTout<{ practical_id: string | null }>((de, a) => admin
      .from("community_media").select("practical_id")
      .eq("source_type", "practical").not("practical_id", "is", null)
      .order("id").range(de, a));
    cm.forEach((m) => m.practical_id && sharedSet.add(m.practical_id));
  }

  const toRow = (s: any): PracticalRow => ({
    id: s.id,
    photo_url: s.photo_url,
    video_url: s.video_url,
    annotation_url: s.annotation_url ?? null,
    note: s.note,
    feedback: s.feedback,
    created_at: s.created_at,
    status: s.status,
    studentName: s.student?.nom ?? "Élève",
    lessonTitle: lessonTitle.get(s.lesson_id) ?? "Leçon",
    courseTitle: courseTitle.get(lessonCourse.get(s.lesson_id) ?? "") ?? "",
  });

  const nomEleve = eleve
    ? ((await admin.from("users").select("nom").eq("id", eleve).maybeSingle()).data?.nom as string | undefined) ?? null
    : null;

  const pendingRows = pendingSubs.filter(owns).map(toRow);
  const approvedRows = approvedSubs.filter(owns).map(toRow);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Travaux pratiques</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Corrigez les réalisations de vos élèves : laissez un retour, validez ou demandez à retravailler.
        </p>
      </div>

      {eleve ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <span>Travaux de <b>{nomEleve ?? "cette élève"}</b> seulement.</span>
          <Link href="/formateur/pratiques" className="font-semibold underline">Voir les travaux de toutes les élèves</Link>
        </div>
      ) : null}

      {/* Sélection multiple + suppression en masse (client) */}
      <PracticalsBoard pending={pendingRows} approved={approvedRows} sharedIds={[...sharedSet]} />
    </div>
  );
}
