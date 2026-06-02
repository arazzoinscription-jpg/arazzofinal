import { createAdminClient } from "@/lib/supabase/admin";
import { RoleSelect } from "./role-select";

export const metadata = { title: "Utilisateurs — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; role?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();
  const roleFilter = searchParams.role ?? "";

  let query = admin.from("users").select("id, nom, email, role, ville, pays, total_points, created_at").order("created_at", { ascending: false });
  if (q) query = query.or(`nom.ilike.%${q}%,email.ilike.%${q}%`);
  if (roleFilter) query = query.eq("role", roleFilter);
  const { data: users } = await query.limit(100);

  const { count: total } = await admin.from("users").select("*", { count: "exact", head: true });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Utilisateurs</h1>
      <p className="text-gray-500 mb-6 font-dm">{total} comptes au total.</p>

      {/* Recherche + filtre */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher nom ou email…"
          className="flex-1 min-w-56 border border-cream-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <select name="role" defaultValue={roleFilter} className="border border-cream-200 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Tous les rôles</option>
          <option value="eleve">Élèves</option>
          <option value="formateur">Formateurs</option>
          <option value="admin">Admins</option>
        </select>
        <button className="bg-violet-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-violet-700">Filtrer</button>
      </form>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50">
            <tr className="text-left text-gray-500 font-dm">
              <th className="px-5 py-3 font-medium">Utilisatrice</th>
              <th className="px-5 py-3 font-medium">Localisation</th>
              <th className="px-5 py-3 font-medium">Points</th>
              <th className="px-5 py-3 font-medium">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {!users?.length ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Aucun utilisateur.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-cream-50 font-dm">
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{u.nom}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-500">{u.ville ? `${u.ville}, ${u.pays}` : u.pays ?? "—"}</td>
                <td className="px-5 py-3 text-gray-500">{u.total_points ?? 0}</td>
                <td className="px-5 py-3"><RoleSelect userId={u.id} role={u.role} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
