import { createAdminClient } from "@/lib/supabase/admin";
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
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Coupons promotionnels</h1>
      <p className="text-gray-500 mb-6 font-dm">Créez des codes de réduction (% ou montant fixe).</p>

      <CouponForm />

      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">Coupons ({coupons?.length ?? 0})</h2>
      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50">
            <tr className="text-left text-gray-500 font-dm">
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Remise</th>
              <th className="px-5 py-3 font-medium">Utilisations</th>
              <th className="px-5 py-3 font-medium">Expiration</th>
              <th className="px-5 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {!coupons?.length ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucun coupon.</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id} className="hover:bg-cream-50 font-dm">
                <td className="px-5 py-3 font-mono font-semibold text-violet-DEFAULT">{c.code}</td>
                <td className="px-5 py-3 text-gray-700">{c.type === "percent" ? `${c.value}%` : `${Number(c.value).toLocaleString("fr-DZ")} DA`}</td>
                <td className="px-5 py-3 text-gray-500">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</td>
                <td className="px-5 py-3 text-gray-400">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="px-5 py-3"><ToggleCoupon id={c.id} active={c.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
