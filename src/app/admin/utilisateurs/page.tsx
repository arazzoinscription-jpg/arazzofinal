import { createAdminClient } from "@/lib/supabase/admin";
import { UsersBulkTable, type UserRowLite } from "./users-bulk-table";
type Status = "actif" | "veille" | "bloque";

export const metadata = { title: "Utilisateurs — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; role?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();
  const roleFilter = searchParams.role ?? "";

  let query = admin.from("users").select("id, nom, email, role, roles, ville, pays, total_points, created_at").order("created_at", { ascending: false });
  if (q) query = query.or(`nom.ilike.%${q}%,email.ilike.%${q}%`);
  // Filtre par rôle : cherche dans l'ENSEMBLE des rôles (un compte peut en cumuler plusieurs).
  if (roleFilter) query = query.contains("roles", [roleFilter]);
  const { data: users } = await query.limit(100);

  const { count: total } = await admin.from("users").select("*", { count: "exact", head: true });

  // Statut des comptes (depuis Supabase Auth : ban natif + app_metadata.status)
  const statusById = new Map<string, Status>();
  await Promise.all((users ?? []).map(async (u) => {
    try {
      const { data } = await admin.auth.admin.getUserById(u.id);
      const m = (data.user?.app_metadata as { status?: string } | undefined)?.status;
      const banned = (data.user as { banned_until?: string } | null)?.banned_until;
      statusById.set(u.id, m === "veille" || m === "bloque" ? (m as Status) : banned ? "bloque" : "actif");
    } catch { statusById.set(u.id, "actif"); }
  }));

  const rows: UserRowLite[] = (users ?? []).map((u) => ({
    id: u.id,
    nom: u.nom ?? u.email?.split("@")[0] ?? "—",
    email: u.email ?? "",
    ville: u.ville ?? null,
    pays: u.pays ?? null,
    points: u.total_points ?? 0,
    role: u.role,
    roles: (u.roles ?? [u.role]) as string[],
    status: statusById.get(u.id) ?? "actif",
    isAdmin: u.role === "admin",
  }));

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Utilisateurs</h1>
      <p className="text-gray-500 mb-6 font-dm">{total} comptes au total.</p>

      {/* Recherche + filtre */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher nom ou email…"
          className="flex-1 min-w-56 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <select name="role" defaultValue={roleFilter} className="border border-gray-100 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Tous les rôles</option>
          <option value="eleve">Élèves</option>
          <option value="formateur">Formateurs</option>
          <option value="patronniste">Patronnistes</option>
          <option value="admin">Admins</option>
        </select>
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Filtrer</button>
      </form>

      <UsersBulkTable rows={rows} />
    </div>
  );
}
