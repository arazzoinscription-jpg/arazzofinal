import Link from "next/link";
import { GraduationCap, BookOpen, Users, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormateurCommissionRate, netForPrice, getGainsStartDate, countsForGains } from "@/lib/commissions";
import { CommissionForm } from "../patronnistes/commission-form";
import { GainsDateForm } from "./gains-date-form";

export const metadata = { title: "Formateurs — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminFormateursPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("users")
    .select("id, nom, email, ville, avatar_url, created_at")
    .contains("roles", ["formateur"])
    .order("created_at", { ascending: false });
  if (q) query = query.or(`nom.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: formateurs } = await query.limit(200);

  // Cours + inscrits + revenu (montant payé DZD) par formateur
  const rate = await getFormateurCommissionRate(admin);
  const gainsStart = await getGainsStartDate(admin);
  const { data: courses } = await admin.from("courses").select("formateur_id, enrollments(amount, currency, paid_at)");
  const nbCours = new Map<string, number>();
  const nbEleves = new Map<string, number>();
  const netByFormateur = new Map<string, number>();
  for (const c of courses ?? []) {
    const fid = (c as any).formateur_id as string | null;
    if (!fid) continue;
    nbCours.set(fid, (nbCours.get(fid) ?? 0) + 1);
    const enrs = ((c as any).enrollments as { amount: number | null; currency: string | null; paid_at: string | null }[]) ?? [];
    nbEleves.set(fid, (nbEleves.get(fid) ?? 0) + enrs.length);
    // Revenu compté seulement à partir de la date de départ des gains.
    const grossDzd = enrs
      .filter((e) => e.currency !== "EUR" && countsForGains(e.paid_at, gainsStart))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    netByFormateur.set(fid, (netByFormateur.get(fid) ?? 0) + netForPrice(grossDzd, rate));
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <GraduationCap size={28} className="text-orange-600" /> Formateurs
      </h1>
      <p className="text-gray-500 mb-6 font-dm">{formateurs?.length ?? 0} formateur(s) · commission formations {rate}%.</p>

      <CommissionForm rate={rate} scope="formateur" />
      <GainsDateForm initial={gainsStart} />

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher un formateur…"
          className="flex-1 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="shiny-cta bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      {!formateurs?.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          Aucun formateur. Promouvez un utilisateur depuis <Link href="/admin/utilisateurs?role=eleve" className="text-orange-600 underline">Utilisateurs</Link>.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {formateurs.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
              <span className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <GraduationCap size={22} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{f.nom ?? "—"}</p>
                <p className="text-xs text-gray-400 truncate">{f.email}</p>
                {f.ville && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {f.ville}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-violet-700 font-semibold"><BookOpen size={15} /> {nbCours.get(f.id) ?? 0} cours</span>
                  <span className="inline-flex items-center gap-1.5 text-gray-500"><Users size={15} /> {nbEleves.get(f.id) ?? 0} inscrits</span>
                </div>
                <p className="mt-2 text-sm"><span className="text-xs text-gray-400">Gains nets : </span><strong className="text-green-600">{(netByFormateur.get(f.id) ?? 0).toLocaleString("fr-DZ")} DA</strong></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
