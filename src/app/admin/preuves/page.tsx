import Link from "next/link";
import { getPaymentProofs } from "@/app/actions/admin/payments";
import { ProofReview, type ProofRow } from "./proof-review";

export const metadata = { title: "Preuves de paiement — Admin" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending", label: "À vérifier" },
  { value: "approved", label: "Approuvées" },
  { value: "rejected", label: "Refusées" },
  { value: "needs_resubmit", label: "À renvoyer" },
  { value: "", label: "Toutes" },
];

export default async function AdminPreuvesPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status ?? "pending";
  const res = await getPaymentProofs(status || undefined);
  const proofs = (res.ok ? res.proofs : []) as unknown as ProofRow[];

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Preuves de paiement</h1>
      <p className="text-gray-500 mb-6 font-dm">Vérifiez les reçus CCP / BaridiMob et validez les commandes.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <Link key={t.value} href={t.value ? `/admin/preuves?status=${t.value}` : "/admin/preuves?status="}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold font-dm transition-colors ${
              status === t.value ? "bg-orange-DEFAULT text-white" : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {!res.ok ? (
        <p className="text-red-500">{res.error}</p>
      ) : proofs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🧾</div>
          <p className="text-gray-400 font-dm">Aucune preuve dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proofs.map((p) => <ProofReview key={p.id} proof={p} />)}
        </div>
      )}
    </div>
  );
}
