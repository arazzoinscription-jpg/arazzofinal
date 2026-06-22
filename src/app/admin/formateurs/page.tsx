import Link from "next/link";
import { GraduationCap, BookOpen, Users, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Formateurs — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminFormateursPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("users")
    .select("id, nom, email, ville, avatar_url, created_at")
    .eq("role", "formateur")
    .order("created_at", { ascending: false });
  if (q) query = query.or(`nom.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: formateurs } = await query.limit(200);

  // Cours + inscrits par formateur
  const { data: courses } = await admin.from("courses").select("formateur_id, enrollments(id)");
  const nbCours = new Map<string, number>();
  const nbEleves = new Map<string, number>();
  for (const c of courses ?? []) {
    const fid = (c as any).formateur_id as string | null;
    if (!fid) continue;
    nbCours.set(fid, (nbCours.get(fid) ?? 0) + 1);
    nbEleves.set(fid, (nbEleves.get(fid) ?? 0) + (((c as any).enrollments as any[])?.length ?? 0));
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <GraduationCap size={28} className="text-orange-600" /> Formateurs
      </h1>
      <p className="text-gray-500 mb-6 font-dm">{formateurs?.length ?? 0} formateur(s).</p>

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher un formateur…"
          className="flex-1 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="shiny-cta bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      {!formateurs?.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          Aucun formateur. Promouvez un utilisateur depuis <Link href="/admin/utilisateurs?role=eleve" className="text-orange-600 underline">Utilisateurs</Link>.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {formateurs.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
              <span className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <GraduationCap size={22} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{f.nom ?? "—"}</p>
                <p className="text-xs text-gray-400 truncate">{f.email}</p>
                {f.ville && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {f.ville}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-violet-700 font-semibold"><BookOpen size={15} /> {nbCours.get(f.id) ?? 0} cours</span>
                  <span className="inline-flex items-center gap-1.5 text-gray-500"><Users size={15} /> {nbEleves.get(f.id) ?? 0} inscrits</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
