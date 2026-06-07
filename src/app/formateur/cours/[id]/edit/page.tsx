import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CourseEditForm, type EditableCourse } from "./course-edit-form";
import { CourseCategoryEditor } from "../category-editor";

export const metadata = { title: "Modifier le cours — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, titre_fr, titre_ar, description_fr, description_ar, niveau, duree, prix_dzd, prix_eur, thumbnail, published, formateur_id")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  // Autorisation : propriétaire OU admin
  if (course.formateur_id !== user.id && !isAdmin) redirect("/formateur");

  const { data: cc } = await admin.from("course_categories").select("category_id").eq("course_id", course.id);
  const initialCats = (cc ?? []).map((r) => r.category_id);

  const backHref = isAdmin ? "/admin/formations" : "/formateur";

  return (
    <div className="max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Modifier le cours</h1>
      <p className="text-gray-500 mb-8 font-dm">
        Mettez à jour les informations de « {course.titre_fr} ».
      </p>
      <CourseEditForm course={course as EditableCourse} backHref={backHref} />
      <CourseCategoryEditor courseId={course.id} initial={initialCats} />
    </div>
  );
}
