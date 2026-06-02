import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCertificateEmail } from "@/lib/resend";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { courseId } = await req.json();

  // Get all lessons in this course
  const { data: chapters } = await supabase
    .from("chapters")
    .select("lessons(id)")
    .eq("course_id", courseId);

  const allLessonIds: string[] =
    chapters?.flatMap((ch: any) => ch.lessons?.map((l: any) => l.id) ?? []) ?? [];

  if (!allLessonIds.length) return NextResponse.json({ ok: false });

  // Check user progress
  const { data: progress } = await supabase
    .from("progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .in("lesson_id", allLessonIds);

  const completed = progress?.length ?? 0;
  if (completed < allLessonIds.length) return NextResponse.json({ ok: false });

  // Check if certificate already exists
  const { data: existing } = await supabase
    .from("certificates")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (existing) return NextResponse.json({ ok: true, already: true });

  // Issue certificate
  const uuid = randomUUID();
  await supabase.from("certificates").insert({
    user_id: user.id,
    course_id: courseId,
    issued_at: new Date().toISOString(),
    uuid_public: uuid,
  });

  const { data: profile } = await supabase
    .from("users")
    .select("nom, email")
    .eq("id", user.id)
    .single();

  const { data: course } = await supabase
    .from("courses")
    .select("titre_fr")
    .eq("id", courseId)
    .single();

  if (profile && course) {
    await sendCertificateEmail(
      profile.email,
      profile.nom,
      course.titre_fr,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/certificates/${uuid}`
    );
  }

  return NextResponse.json({ ok: true, uuid });
}
