import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTION_LABELS } from "@/lib/activity";
export const metadata = { title: "Journal d'activité — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminActivitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("activity_log")
    .select("action, meta, created_at, user:users(nom, email)")
    .order("created_at", { ascending: false })
    .limit(80);

  // Répartition par type
  const byAction: Record<string, number> = {};
  (rows ?? []).forEach((r) => { byAction[r.action] = (byAction[r.action] ?? 0) + 1; });

  return (
    <div className="min-h-screen bg-[#faf7ff] p-8">
      <div className="px-4 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <h1 className="font-playfair text-3xl font-bold text-gray-900">Journal d'activité</h1>
          </div>
          <Link href="/admin" className="text-sm text-orange-600 hover:underline font-dm">← Retour admin</Link>
        </div>

        {/* Répartition */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(byAction).map(([a, n]) => (
            <div key={a} className="bg-white rounded-xl px-4 py-2 border border-gray-100 text-sm font-dm">
              {ACTION_LABELS[a]?.icon} {ACTION_LABELS[a]?.label ?? a} : <strong>{n}</strong>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {!rows?.length ? (
            <div className="text-center py-16 text-gray-400">Aucune activité enregistrée.</div>
          ) : (
            <Table className="w-full text-sm">
              <TableHeader className="bg-gray-50">
                <TableRow className="text-left text-gray-500 font-dm">
                  <TableHead className="px-5 py-3 font-medium">Action</TableHead>
                  <TableHead className="px-5 py-3 font-medium">Utilisatrice</TableHead>
                  <TableHead className="px-5 py-3 font-medium">Détail</TableHead>
                  <TableHead className="px-5 py-3 font-medium">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-50">
                {rows.map((r, i) => {
                  const m = ACTION_LABELS[r.action] ?? { icon: "•", label: r.action };
                  const meta = r.meta as Record<string, unknown> | null;
                  const detail = (meta?.lessonTitre || meta?.courseTitre || meta?.device || "") as string;
                  return (
                    <TableRow key={i} className="hover:bg-gray-50 font-dm">
                      <TableCell className="px-5 py-2.5 whitespace-nowrap">{m.icon} {m.label}</TableCell>
                      <TableCell className="px-5 py-2.5 text-gray-700">{(r.user as any)?.nom ?? "—"}</TableCell>
                      <TableCell className="px-5 py-2.5 text-gray-400 truncate max-w-[200px]">{detail}</TableCell>
                      <TableCell className="px-5 py-2.5 text-gray-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
