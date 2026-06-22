import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { patronImage } from "@/lib/patron-images";
import { PatronSaleToggle } from "./sale-toggle";
export const metadata = { title: "Patrons — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPatronsPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("patrons")
    .select("id, titre, prix_dzd, preview_url, formateur:users(nom)")
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("titre", `%${q}%`);
  const { data: patrons } = await query.limit(200);

  // Produits boutique liés aux patrons → savoir lesquels sont en vente
  const { data: prods } = await admin.from("products").select("patron_id, is_active").eq("type", "patron_pdf");
  const onSaleByPatron = new Map<string, boolean>();
  for (const p of prods ?? []) if (p.patron_id) onSaleByPatron.set(p.patron_id, !!p.is_active);
  const onSaleCount = (patrons ?? []).filter((p) => onSaleByPatron.get(p.id)).length;

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Patrons</h1>
      <p className="text-gray-500 mb-6 font-dm">{patrons?.length ?? 0} patron(s) · {onSaleCount} en vente. Le patronniste publie, l'admin met en vente.</p>

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher un patron…"
          className="flex-1 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="shiny-cta bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Patron</TableHead>
              <TableHead className="px-5 py-3 font-medium">Patronniste</TableHead>
              <TableHead className="px-5 py-3 font-medium">Prix</TableHead>
              <TableHead className="px-5 py-3 font-medium">En vente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {!patrons?.length ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-gray-400">Aucun patron.</TableCell></TableRow>
            ) : patrons.map((p) => (
              <TableRow key={p.id} className="hover:bg-gray-50 font-dm">
                <TableCell className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.preview_url || patronImage(p.id)} alt="" className="w-10 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate max-w-xs">{p.titre}</span>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-3 text-gray-600">{(p.formateur as any)?.nom ?? "—"}</TableCell>
                <TableCell className="px-5 py-3 text-gray-600">{Number(p.prix_dzd).toLocaleString("fr-DZ")} DA</TableCell>
                <TableCell className="px-5 py-3"><PatronSaleToggle patronId={p.id} onSale={onSaleByPatron.get(p.id) ?? false} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
