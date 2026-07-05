import Link from "next/link";
import { Package } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublishToggle } from "./publish-toggle";
import { SaleToggle } from "./sale-toggle";
import { VisibleToggle } from "./visible-toggle";
import { SubscriptionToggle } from "./subscription-toggle";
import { FormateurSelect } from "./formateur-select";
import { PackSellButton, type PackSellState } from "@/app/formateur/packs/pack-sell-button";
import { PackPublishToggle } from "@/app/admin/packs/pack-publish-toggle";
import { PackSubscriptionToggle } from "./pack-subscription-toggle";
export const metadata = { title: "Formations — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("courses")
    .select("*, formateur:users(nom)")
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

  // ── Packs de formation (catalogue global) ───────────────────────────────
  let packsQuery = admin
    .from("course_packs")
    .select("id, titre_fr, prix_dzd, prix_eur, published, created_at, formateur:users(nom), items:course_pack_items(course_id)")
    .order("created_at", { ascending: false });
  if (q) packsQuery = packsQuery.ilike("titre_fr", `%${q}%`);
  const { data: packs } = await packsQuery.limit(200);

  // État « en vente » : produit boutique de type 'bundle' référençant le pack via files ["pack:<id>"]
  const saleByPack = new Map<string, { id: string; price: number; active: boolean }>();
  const { data: bundleProds } = await admin.from("products").select("id, price, is_active, files").eq("type", "bundle");
  for (const p of bundleProds ?? []) {
    const ref = ((p.files as string[]) ?? []).find((f) => f.startsWith("pack:"));
    if (ref) saleByPack.set(ref.slice(5), { id: p.id, price: Number(p.price), active: !!p.is_active });
  }
  const packsOnSale = (packs ?? []).filter((p) => saleByPack.get(p.id)?.active).length;

  // Abonnement pack (colonnes migration 047) — lecture résiliente (vide si non appliquée)
  const packSubMeta = new Map<string, { enabled: boolean; months: number | null }>();
  const packIds = (packs ?? []).map((p) => p.id);
  if (packIds.length) {
    const { data: ps } = await admin.from("course_packs").select("id, subscription_enabled, duration_months").in("id", packIds);
    for (const r of ps ?? []) {
      packSubMeta.set(r.id, {
        enabled: (r as { subscription_enabled?: boolean }).subscription_enabled === true,
        months: (r as { duration_months?: number | null }).duration_months ?? null,
      });
    }
  }
  // Nb de chapitres par pack (somme des chapitres de tous les cours inclus)
  const packChapters = new Map<string, number>();
  {
    const allPackCourseIds = [...new Set((packs ?? []).flatMap((p) => ((p.items as { course_id: string }[]) ?? []).map((it) => it.course_id).filter(Boolean)))];
    const chapByCourse = new Map<string, number>();
    if (allPackCourseIds.length) {
      const { data: chs } = await admin.from("chapters").select("course_id").in("course_id", allPackCourseIds);
      for (const c of chs ?? []) if (c.course_id) chapByCourse.set(c.course_id, (chapByCourse.get(c.course_id) ?? 0) + 1);
    }
    for (const p of packs ?? []) {
      let n = 0;
      for (const it of (p.items as { course_id: string }[]) ?? []) n += chapByCourse.get(it.course_id) ?? 0;
      packChapters.set(p.id, n);
    }
  }

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
                    fullDiscount={(c as any).full_payment_discount ?? true}
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

      {/* ── Packs de formation ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-12 mb-1">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-100 text-orange-600"><Package size={18} /></span>
        <h2 className="font-playfair text-2xl font-bold text-gray-900">Packs de formation</h2>
      </div>
      <p className="text-gray-500 mb-5 font-dm">
        {packs?.length ?? 0} pack(s) · {packsOnSale} en vente. Publiez un pack puis mettez-le en vente (achat complet).
        <span className="text-gray-400"> L'abonnement par tranches des packs arrive prochainement.</span>
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Pack</TableHead>
              <TableHead className="px-5 py-3 font-medium">Formateur</TableHead>
              <TableHead className="px-5 py-3 font-medium">Cours inclus</TableHead>
              <TableHead className="px-5 py-3 font-medium">Publié</TableHead>
              <TableHead className="px-5 py-3 font-medium">En vente</TableHead>
              <TableHead className="px-5 py-3 font-medium">Abonnement</TableHead>
              <TableHead className="px-5 py-3 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {!packs?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Aucun pack. Créez-en un dans l'espace formateur.</TableCell></TableRow>
            ) : packs.map((p) => {
              const prod = saleByPack.get(p.id);
              const sale: PackSellState = {
                active: !!prod?.active,
                productId: prod?.id ?? null,
                currentPrice: prod?.price ?? null,
                defaultPrice: Number(p.prix_dzd) || 0,
              };
              return (
                <TableRow key={p.id} className="hover:bg-gray-50 font-dm">
                  <TableCell className="px-5 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-xs">{p.titre_fr}</div>
                    <div className="text-xs text-gray-400">{Number(p.prix_dzd).toLocaleString("fr-DZ")} DA · {Number(p.prix_eur).toFixed(0)} €</div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{(p.formateur as { nom?: string } | null)?.nom ?? "—"}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{((p.items as any[]) ?? []).length} cours</TableCell>
                  <TableCell className="px-5 py-3"><PackPublishToggle packId={p.id} published={!!p.published} /></TableCell>
                  <TableCell className="px-5 py-3"><PackSellButton packId={p.id} sale={sale} /></TableCell>
                  <TableCell className="px-5 py-3">
                    <PackSubscriptionToggle
                      packId={p.id}
                      enabled={packSubMeta.get(p.id)?.enabled ?? false}
                      durationMonths={packSubMeta.get(p.id)?.months ?? null}
                      chaptersCount={packChapters.get(p.id) ?? 0}
                    />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <Link href={`/formateur/packs/${p.id}/edit`} className="text-orange-600 font-semibold hover:underline">Modifier</Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
