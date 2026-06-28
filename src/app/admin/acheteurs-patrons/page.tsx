import { ShoppingBag } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Acheteurs de patrons — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPatronBuyersPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const { data: purchases } = await admin
    .from("patron_purchases")
    .select("user_id, paid_at, user:users(nom, email, ville)")
    .order("paid_at", { ascending: false })
    .limit(2000);

  // Agrégation par acheteur : nb d'achats + dernier achat.
  type Buyer = { id: string; nom: string; email: string; ville: string | null; count: number; last: string };
  const map = new Map<string, Buyer>();
  for (const p of purchases ?? []) {
    const u = (p as any).user as { nom?: string; email?: string; ville?: string | null } | null;
    if (!p.user_id || !u) continue;
    if (!map.has(p.user_id)) {
      map.set(p.user_id, { id: p.user_id, nom: u.nom ?? "—", email: u.email ?? "", ville: u.ville ?? null, count: 0, last: p.paid_at });
    }
    const b = map.get(p.user_id)!;
    b.count++;
    if (p.paid_at > b.last) b.last = p.paid_at;
  }
  let buyers = [...map.values()].sort((a, b) => b.count - a.count);
  if (q) buyers = buyers.filter((b) => b.nom.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <ShoppingBag size={28} className="text-orange-600" /> Acheteurs de patrons
      </h1>
      <p className="text-gray-500 mb-6 font-dm">{buyers.length} acheteur(s) · {purchases?.length ?? 0} achat(s) au total.</p>

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Rechercher un acheteur…"
          className="flex-1 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      {!buyers.length ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center text-gray-400">Aucun acheteur de patron.</div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Acheteur</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Ville</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Achats</TableHead>
                <TableHead className="text-left px-5 py-3 text-sm text-gray-500">Dernier achat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {buyers.map((b) => (
                <TableRow key={b.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-3 text-sm">
                    <span className="font-medium text-gray-900">{b.nom}</span><br />
                    <span className="text-xs text-gray-400">{b.email}</span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-sm text-gray-500">{b.ville ?? "—"}</TableCell>
                  <TableCell className="px-5 py-3 text-sm"><strong className="text-orange-600">{b.count}</strong></TableCell>
                  <TableCell className="px-5 py-3 text-sm text-gray-500">{new Date(b.last).toLocaleDateString("fr-FR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
