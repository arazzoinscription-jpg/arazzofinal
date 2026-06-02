import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const admin = createAdminClient();
  const { data: resource } = await admin
    .from("resources").select("id, file_path, course_id").eq("id", params.id).single();
  if (!resource) return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });

  // Contrôle d'accès : staff, ressource générale, ou inscrite au cours
  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).single();
  const isStaff = prof?.role === "formateur" || prof?.role === "admin";
  let allowed = isStaff || !resource.course_id;
  if (!allowed && resource.course_id) {
    const { data: enr } = await admin
      .from("enrollments").select("id").eq("user_id", user.id).eq("course_id", resource.course_id).maybeSingle();
    allowed = !!enr;
  }
  if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  // Compteur + journal de téléchargement
  await admin.rpc("increment_resource_download", { rid: resource.id }).then(undefined, () => {});
  await admin.from("resource_downloads").insert({ resource_id: resource.id, user_id: user.id });
  await logActivity(user.id, "download", { resourceId: resource.id });

  // URL signée (60s)
  const { data: signed, error } = await admin.storage
    .from("resources").createSignedUrl(resource.file_path, 60, { download: true });
  if (error || !signed) return NextResponse.json({ error: "Lien indisponible" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
