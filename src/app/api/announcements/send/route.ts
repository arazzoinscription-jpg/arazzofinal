import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isFormateur, isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tplAnnouncement } from "@/lib/email-templates";
import { emailConfigure, texteVersHtml } from "@/lib/classe/commande";
import { paquets } from "@/lib/student-care/paginate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Schema = z.object({
  titre: z.string().min(2),
  body: z.string().min(2),
  course_id: z.string().uuid().nullable().optional(),
  sendEmail: z.boolean().optional(),
  /** Aperçu : renvoie l'audience et les e-mails possibles SANS rien enregistrer ni envoyer. */
  apercu: z.boolean().optional(),
});

/** Une annonce identique (même autrice, titre, texte, cours) dans ce délai = double envoi refusé. */
const FENETRE_DOUBLON_MIN = 5;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(prof)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { titre, body, course_id, sendEmail: withEmail, apercu } = parsed.data;

  const admin = createAdminClient();

  // Portée : un formateur ne peut annoncer QU'À SES cours. La diffusion à TOUS
  // les élèves (sans course_id) est réservée à l'admin.
  if (!isAdmin(prof)) {
    if (!course_id) return NextResponse.json({ error: "Diffusion générale réservée à l'administration." }, { status: 403 });
    const { data: course } = await admin.from("courses").select("formateur_id").eq("id", course_id).maybeSingle();
    if (!course) return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
    if (course.formateur_id !== user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // 1) Audience (calculée AVANT tout enregistrement, pour l'aperçu)
  let userIds: string[];
  if (course_id) {
    const { data: e } = await admin.from("enrollments").select("user_id").eq("course_id", course_id);
    userIds = [...new Set((e ?? []).map((x) => x.user_id))];
  } else {
    const { data: u } = await admin.from("users").select("id").eq("role", "eleve");
    userIds = (u ?? []).map((x) => x.id);
  }
  const serviceEmail = emailConfigure(process.env.RESEND_API_KEY);

  // Profils (par lots : un `.in()` de centaines d'identifiants fait échouer la requête).
  const profils: { id: string; nom: string | null; email: string | null }[] = [];
  if (withEmail || apercu) {
    for (const lot of paquets(userIds, 100)) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await admin.from("users").select("id, nom, email").in("id", lot);
      profils.push(...((data ?? []) as typeof profils));
    }
  }

  if (apercu) {
    const desinscrites = new Set<string>();
    for (const lot of paquets(userIds, 100)) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await admin.from("email_preferences").select("user_id, announcements").in("user_id", lot);
      for (const p of (data ?? []) as { user_id: string; announcements: boolean | null }[]) if (p.announcements === false) desinscrites.add(p.user_id);
    }
    const cfg = await admin.from("platform_config").select("email_categories").eq("id", 1).maybeSingle();
    const categorieCoupee = ((cfg.data as { email_categories?: Record<string, boolean> } | null)?.email_categories ?? {}).announcements === false;
    const avecEmail = profils.filter((p) => p.email && /@/.test(p.email));
    const possibles = categorieCoupee ? 0 : avecEmail.filter((p) => !desinscrites.has(p.id)).length;
    return NextResponse.json({
      ok: true, apercu: true, audience: userIds.length,
      emailsPossibles: possibles, desinscrites: categorieCoupee ? avecEmail.length : desinscrites.size,
      sansEmail: userIds.length - avecEmail.length, categorieCoupee, serviceEmail,
    });
  }

  // 2) Anti double envoi : la même annonce vient-elle d'être publiée ?
  const depuis = new Date(Date.now() - FENETRE_DOUBLON_MIN * 60_000).toISOString();
  let doublon = admin.from("announcements").select("id").eq("author_id", user.id).eq("titre", titre).eq("body", body).gte("created_at", depuis).limit(1);
  doublon = course_id ? doublon.eq("course_id", course_id) : doublon.is("course_id", null);
  const { data: deja } = await doublon;
  if (deja?.length) {
    return NextResponse.json({ error: `Annonce identique déjà publiée il y a moins de ${FENETRE_DOUBLON_MIN} minutes : rien n'a été renvoyé.` }, { status: 409 });
  }

  // 3) Enregistrer l'annonce
  await admin.from("announcements").insert({ author_id: user.id, course_id: course_id ?? null, titre, body });

  // 4) Canal 1 + 3 : notifications dashboard (Realtime via la table notifications)
  if (userIds.length) {
    await admin.from("notifications").insert(
      userIds.map((uid) => ({
        user_id: uid, type: "announcement", title: `📢 ${titre}`,
        body: body.slice(0, 200), link: "/dashboard/annonces", course_id: course_id ?? null,
      }))
    );
  }

  // 5) Canal 2 : emails (opt-out respecté, journalisé) — jamais tentés si le service n'est pas configuré.
  let emailsSent = 0; let emailsSkipped = 0; let emailsFailed = 0;
  if (withEmail && userIds.length && serviceEmail) {
    for (const p of profils) {
      if (!p.email) { emailsSkipped++; continue; }
      const tpl = tplAnnouncement((p.nom || "").split(" ")[0] || "chère élève", titre, texteVersHtml(body));
      // eslint-disable-next-line no-await-in-loop
      const res = await sendEmail({ userId: p.id, to: p.email, category: "announcements", subject: tpl.subject, html: tpl.html });
      if (res.ok) emailsSent++; else if (res.skipped) emailsSkipped++; else emailsFailed++;
    }
  }

  return NextResponse.json({
    ok: true, audience: userIds.length, notifications: userIds.length,
    emailsSent, emailsSkipped, emailsFailed,
    emailsNonTentes: withEmail && !serviceEmail, serviceEmail,
  });
}
