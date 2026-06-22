import { createClient } from "@/lib/supabase/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
export const metadata = { title: "Étudiantes inactives — Arazzo Formation" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;

export default async function InactivesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // Cours du formateur → étudiantes inscrites
  const { data: courses } = await admin
    .from("courses")
    .select("id")
    .eq("formateur_id", user!.id);
  const courseIds = (courses ?? []).map((c) => c.id);

  const { data: enrolls } = await admin
    .from("enrollments")
    .select("user_id, course:courses(titre_fr)")
    .in("course_id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);

  // Regrouper par étudiante
  const byStudent = new Map<string, Set<string>>();
  (enrolls ?? []).forEach((e) => {
    const set = byStudent.get(e.user_id) ?? new Set<string>();
    const t = (e.course as { titre_fr?: string } | null)?.titre_fr;
    if (t) set.add(t);
    byStudent.set(e.user_id, set);
  });

  // last_sign_in_at via auth
  const lastSignin = new Map<string, string | null>();
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data || data.users.length === 0) break;
    data.users.forEach((u) => lastSignin.set(u.id, u.last_sign_in_at ?? null));
    if (data.users.length < 1000) break;
    page++;
  }

  // Profils
  const ids = [...byStudent.keys()];
  const { data: profiles } = await admin
    .from("users")
    .select("id, nom, email, role")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const now = Date.now();
  const rows = (profiles ?? [])
    .filter((p) => p.role === "eleve")
    .map((p) => {
      const lsi = lastSignin.get(p.id);
      const days = lsi ? Math.floor((now - new Date(lsi).getTime()) / DAY) : null;
      return {
        nom: p.nom, email: p.email,
        cours: [...(byStudent.get(p.id) ?? [])],
        days, lsi,
      };
    })
    .filter((r) => r.days === null || r.days >= 7)
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));

  function badge(days: number | null) {
    if (days === null) return { label: "Jamais connectée", cls: "bg-gray-100 text-gray-500" };
    if (days >= 60) return { label: `${days}j · critique`, cls: "bg-red-100 text-red-700" };
    if (days >= 30) return { label: `${days}j · élevé`, cls: "bg-orange-100 text-orange-700" };
    if (days >= 14) return { label: `${days}j · moyen`, cls: "bg-yellow-100 text-yellow-700" };
    return { label: `${days}j`, cls: "bg-blue-100 text-blue-700" };
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Étudiantes inactives</h1>
        <p className="text-gray-500 mt-1 font-dm">
          Étudiantes sans connexion depuis 7 jours ou plus. Les relances automatiques
          (7/14/30j) sont envoyées par email ; à 60j vous êtes notifiée.
        </p>
      </div>

      {/* Récap paliers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "7j+", n: rows.filter((r) => r.days !== null && r.days >= 7 && r.days < 14).length, c: "text-blue-600" },
          { label: "14j+", n: rows.filter((r) => r.days !== null && r.days >= 14 && r.days < 30).length, c: "text-yellow-600" },
          { label: "30j+", n: rows.filter((r) => r.days !== null && r.days >= 30 && r.days < 60).length, c: "text-orange-600" },
          { label: "60j+", n: rows.filter((r) => r.days !== null && r.days >= 60).length, c: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
            <div className={`text-3xl font-bold font-playfair ${s.c}`}>{s.n}</div>
            <div className="text-sm text-gray-500 mt-1 font-dm">{s.label} inactives</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🎉</div>
            <p>Aucune étudiante inactive. Bravo !</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader className="bg-cream-50">
              <TableRow>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500 font-dm">Étudiante</TableHead>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500 font-dm">Inactivité</TableHead>
                <TableHead className="text-left px-6 py-3 text-sm text-gray-500 font-dm">Formations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-cream-100">
              {rows.slice(0, 100).map((r, i) => {
                const b = badge(r.days);
                return (
                  <TableRow key={i} className="hover:bg-cream-50">
                    <TableCell className="px-6 py-3">
                      <div className="font-medium text-gray-900 font-dm">{r.nom}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${b.cls}`}>
                        {b.label}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-sm text-gray-500 font-dm">
                      {r.cours.slice(0, 2).join(", ")}{r.cours.length > 2 ? `  +${r.cours.length - 2}` : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
