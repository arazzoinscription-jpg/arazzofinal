import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Administration — Arazzo Formation" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const [
    { count: usersCount },
    { count: coursesCount },
    { count: enrollmentsCount },
    { data: recentEnrollments },
    { data: pendingFormateurs },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase
      .from("enrollments")
      .select("amount, currency, paid_at, user:users(nom, email), course:courses(titre_fr)")
      .order("paid_at", { ascending: false })
      .limit(10),
    supabase
      .from("users")
      .select("id, nom, email, created_at")
      .eq("role", "eleve")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  async function promoteToFormateur(userId: string) {
    "use server";
    const s = await createClient();
    await s.from("users").update({ role: "formateur" }).eq("id", userId);
  }

  return (
    <div className="min-h-screen bg-cream-DEFAULT p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">⚙️</span>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">
            Administration
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-10">
          {[
            { label: "Utilisateurs", value: usersCount ?? 0, icon: "👤" },
            { label: "Cours", value: coursesCount ?? 0, icon: "📚" },
            { label: "Inscriptions", value: enrollmentsCount ?? 0, icon: "✅" },
            { label: "Plateforme", value: "En ligne", icon: "🟢" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-cream-200">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-bold font-playfair text-violet-DEFAULT">
                {s.value}
              </div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent sales */}
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
            <div className="p-5 border-b border-cream-100">
              <h2 className="font-semibold text-gray-900">Ventes récentes</h2>
            </div>
            <div className="divide-y divide-cream-100">
              {recentEnrollments?.map((e: any, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {e.user?.nom}
                    </p>
                    <p className="text-xs text-gray-400">{e.course?.titre_fr}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-violet-DEFAULT">
                      {e.currency === "DZD"
                        ? `${Number(e.amount).toLocaleString()} DA`
                        : `${Number(e.amount).toFixed(0)} €`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.paid_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent users + promote */}
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
            <div className="p-5 border-b border-cream-100">
              <h2 className="font-semibold text-gray-900">Utilisateurs récents</h2>
            </div>
            <div className="divide-y divide-cream-100">
              {pendingFormateurs?.map((u: any) => (
                <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.nom}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <form action={async () => { "use server"; await promoteToFormateur(u.id); }}>
                    <button
                      type="submit"
                      className="text-xs text-violet-DEFAULT font-semibold border border-violet-200 px-3 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                    >
                      → Formateur
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
