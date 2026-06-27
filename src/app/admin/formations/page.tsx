import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublishToggle } from "./publish-toggle";
import { SaleToggle } from "./sale-toggle";
import { VisibleToggle } from "./visible-toggle";
import { SubscriptionToggle } from "./subscription-toggle";
import { FormateurSelect } from "./formateur-select";
export const metadata = { title: "Formations — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("courses")
    .select("id, titre_fr, prix_dzd, published, visible_inscription, subscription_enabled, duration_months, formateur_id, formateur:users(nom)")
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("titre_fr", `%${q}%`);
  const { data: courses } = await query.limit(200);

  // Comptage fiable des inscriptions par cours (évite les faux positifs de l'embed PostgREST)
  const courseIds = (courses ?? []).map((c) => c.id);
  const enrollCounts = new Map<string, number>();
  if (courseIds.length) {
    const { data: enrolls } = await admin
      .from("enrollments")
      .select("course_id")
      .in("course_id", courseIds);
    for (const e of enrolls ?? []) {
      if (e.course_id) enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) ?? 0) + 1);
    }
  }

  // Comptage des chapitres par cours (aperçu de la découpe en mode abonnement)
  const chapterCounts = new Map<string, number>();
  if (courseIds.length) {
    const { data: chaps } = await admin.from("chapters").select("course_id").in("course_id", courseIds);
    for (const ch of chaps ?? []) {
      if (ch.course_id) chapterCounts.set(ch.course_id, (chapterCounts.get(ch.course_id) ?? 0) + 1);
    }
  }

  // Liste des formateurs (pour l'affectation)
  const { data: formateursRaw } = await admin
    .from("users").select("id, nom").in("role", ["formateur", "admin"]).order("nom");
  const formateurs = (formateursRaw ?? []).map((f) => ({ id: f.id, nom: f.nom ?? "—" }));

  // Produits boutique liés aux cours → savoir lesquels sont en vente
  const { data: prods } = await admin.from("products").select("course_id, is_active").eq("type", "course");
  const onSaleByCourse = new Map<string, boolean>();
  for (const p of prods ?? []) if (p.course_id) onSaleByCourse.set(p.course_id, !!p.is_active);

  const pub = (courses ?? []).filter((c) => c.published).length;
  const onSaleCount = (courses ?? []).filter((c) => onSaleByCourse.get(c.id)).length;

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Formations</h1>
      <p className="text-gray-500 mb-6 font-dm">{courses?.length ?? 0} formations · {pub} publiées · {onSaleCount} en vente.</p>

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher une formation…"
          className="flex-1 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="shiny-cta bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Formation</TableHead>
              <TableHead className="px-5 py-3 font-medium">Formateur</TableHead>
              <TableHead className="px-5 py-3 font-medium">Inscrites</TableHead>
              <TableHead className="px-5 py-3 font-medium">Publiée</TableHead>
              <TableHead className="px-5 py-3 font-medium">Inscription</TableHead>
              <TableHead className="px-5 py-3 font-medium">En vente</TableHead>
              <TableHead className="px-5 py-3 font-medium">Abonnement</TableHead>
              <TableHead className="px-5 py-3 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {!courses?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucune formation.</TableCell></TableRow>
            ) : courses.map((c) => (
              <TableRow key={c.id} className="hover:bg-gray-50 font-dm">
                <TableCell className="px-5 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-xs">{c.titre_fr}</div>
                  <div className="text-xs text-gray-400">{Number(c.prix_dzd).toLocaleString("fr-DZ")} DA</div>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <FormateurSelect courseId={c.id} current={(c as any).formateur_id ?? null} formateurs={formateurs} />
                </TableCell>
                <TableCell className="px-5 py-3 text-gray-600">{enrollCounts.get(c.id) ?? 0}</TableCell>
                <TableCell className="px-5 py-3"><PublishToggle courseId={c.id} published={c.published} /></TableCell>
                <TableCell className="px-5 py-3"><VisibleToggle courseId={c.id} visible={c.visible_inscription ?? true} /></TableCell>
                <TableCell className="px-5 py-3"><SaleToggle courseId={c.id} onSale={onSaleByCourse.get(c.id) ?? false} published={c.published} /></TableCell>
                <TableCell className="px-5 py-3">
                  <SubscriptionToggle
                    courseId={c.id}
                    enabled={(c as any).subscription_enabled ?? false}
                    durationMonths={(c as any).duration_months ?? null}
                    chaptersCount={chapterCounts.get(c.id) ?? 0}
                  />
                </TableCell>
                <TableCell className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/formateur/cours/${c.id}/edit`} className="text-orange-600 font-semibold hover:underline">Modifier</Link>
                    <Link href={`/formateur/cours/${c.id}/inscrits`} className="text-gray-500 hover:text-orange-600 hover:underline">Inscrits</Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
