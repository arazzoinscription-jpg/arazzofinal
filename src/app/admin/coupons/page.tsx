import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CouponForm, ToggleCoupon } from "./coupon-form";
export const metadata = { title: "Coupons — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const admin = createAdminClient();
  const { data: coupons } = await admin
    .from("coupons")
    .select("id, code, type, value, max_uses, used_count, expires_at, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Coupons promotionnels</h1>
      <p className="text-gray-500 mb-6 font-dm">Créez des codes de réduction (% ou montant fixe).</p>

      <CouponForm />

      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">Coupons ({coupons?.length ?? 0})</h2>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Code</TableHead>
              <TableHead className="px-5 py-3 font-medium">Remise</TableHead>
              <TableHead className="px-5 py-3 font-medium">Utilisations</TableHead>
              <TableHead className="px-5 py-3 font-medium">Expiration</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {!coupons?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucun coupon.</TableCell></TableRow>
            ) : coupons.map((c) => (
              <TableRow key={c.id} className="hover:bg-gray-50 font-dm">
                <TableCell className="px-5 py-3 font-mono font-semibold text-orange-600">{c.code}</TableCell>
                <TableCell className="px-5 py-3 text-gray-700">{c.type === "percent" ? `${c.value}%` : `${Number(c.value).toLocaleString("fr-DZ")} DA`}</TableCell>
                <TableCell className="px-5 py-3 text-gray-500">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</TableCell>
                <TableCell className="px-5 py-3 text-gray-400">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell className="px-5 py-3"><ToggleCoupon id={c.id} active={c.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
