import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isFormateur, isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tplAnnouncement } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Schema = z.object({
  titre: z.string().min(2),
  body: z.string().min(2),
  course_id: z.string().uuid().nullable().optional(),
  sendEmail: z.boolean().optional(),
});

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
  const { titre, body, course_id, sendEmail: withEmail } = parsed.data;

  const admin = createAdminClient();

  // Portée : un formateur ne peut annoncer QU'À SES cours. La diffusion à TOUS
  // les élèves (sans course_id) est réservée à l'admin.
  if (!isAdmin(prof)) {
    if (!course_id) return NextResponse.json({ error: "Diffusion générale réservée à l'administration." }, { status: 403 });
    const { data: course } = await admin.from("courses").select("formateur_id").eq("id", course_id).maybeSingle();
    if (!course) return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
    if (course.formateur_id !== user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // 1) Enregistrer l'annonce
  await admin.from("announcements").insert({ author_id: user.id, course_id: course_id ?? null, titre, body });

  // 2) Audience
  let userIds: string[];
  if (course_id) {
    const { data: e } = await admin.from("enrollments").select("user_id").eq("course_id", course_id);
    userIds = [...new Set((e ?? []).map((x) => x.user_id))];
  } else {
    const { data: u } = await admin.from("users").select("id").eq("role", "eleve");
    userIds = (u ?? []).map((x) => x.id);
  }

  // 3) Canal 1 + 3 : notifications dashboard (Realtime via la table notifications)
  if (userIds.length) {
    await admin.from("notifications").insert(
      userIds.map((uid) => ({
        user_id: uid, type: "announcement", title: `📢 ${titre}`,
        body: body.slice(0, 200), link: "/dashboard/annonces", course_id: course_id ?? null,
      }))
    );
  }

  // 4) Canal 2 : emails (opt-out respecté, journalisé)
  let emailsSent = 0;
  if (withEmail && userIds.length) {
    const { data: profiles } = await admin.from("users").select("id, nom, email").in("id", userIds);
    for (const p of profiles ?? []) {
      const tpl = tplAnnouncement((p.nom || "").split(" ")[0] || "chère élève", titre, body);
      const res = await sendEmail({ userId: p.id, to: p.email, category: "announcements", subject: tpl.subject, html: tpl.html });
      if (res.ok) emailsSent++;
    }
  }

  return NextResponse.json({ ok: true, audience: userIds.length, notifications: userIds.length, emailsSent });
}
