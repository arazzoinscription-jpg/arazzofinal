import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublishToggle } from "./publish-toggle";

export const metadata = { title: "Formations — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("courses")
    .select("id, titre_fr, prix_dzd, published, formateur:users(nom), enrollments(id)")
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("titre_fr", `%${q}%`);
  const { data: courses } = await query.limit(200);

  const pub = (courses ?? []).filter((c) => c.published).length;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Formations</h1>
      <p className="text-gray-500 mb-6 font-dm">{courses?.length ?? 0} formations · {pub} publiées.</p>

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher une formation…"
          className="flex-1 border border-cream-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50">
            <tr className="text-left text-gray-500 font-dm">
              <th className="px-5 py-3 font-medium">Formation</th>
              <th className="px-5 py-3 font-medium">Prix</th>
              <th className="px-5 py-3 font-medium">Inscrites</th>
              <th className="px-5 py-3 font-medium">Publiée</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {!courses?.length ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucune formation.</td></tr>
            ) : courses.map((c) => (
              <tr key={c.id} className="hover:bg-cream-50 font-dm">
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-xs">{c.titre_fr}</div>
                  <div className="text-xs text-gray-400">par {(c.formateur as any)?.nom ?? "—"}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">{Number(c.prix_dzd).toLocaleString("fr-DZ")} DA</td>
                <td className="px-5 py-3 text-gray-600">{(c.enrollments as any[])?.length ?? 0}</td>
                <td className="px-5 py-3"><PublishToggle courseId={c.id} published={c.published} /></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/formateur/cours/${c.id}/edit`} className="text-orange-600 font-semibold hover:underline">Modifier</Link>
                    <Link href={`/formateur/cours/${c.id}/inscrits`} className="text-gray-500 hover:text-orange-600 hover:underline">Inscrits</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
