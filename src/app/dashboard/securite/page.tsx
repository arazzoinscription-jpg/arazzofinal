import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TwoFactor } from "./two-factor";
import { LogoutOthers } from "./logout-others";

export const metadata = { title: "Sécurité — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function SecuritePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: history } = await supabase
    .from("login_history").select("ip, device, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(15);

  const { data: devices } = await supabase
    .from("user_devices").select("device_label, last_ip, last_seen, revoked")
    .eq("user_id", user.id).order("last_seen", { ascending: false });

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Sécurité</h1>
        <p className="text-gray-500 mt-1 font-dm">Gérez la protection de votre compte.</p>
      </div>

      {/* 2FA */}
      <TwoFactor />

      {/* Appareils */}
      <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💻</span>
          <h2 className="font-playfair text-xl font-bold text-gray-900">Appareils connectés</h2>
        </div>
        <div className="space-y-2 mb-5">
          {!devices?.length ? (
            <p className="text-gray-400 text-sm font-dm">Aucun appareil enregistré.</p>
          ) : devices.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-cream-100 last:border-0">
              <div>
                <div className="font-medium text-gray-900 font-dm">{d.device_label}</div>
                <div className="text-xs text-gray-400 font-dm">IP {d.last_ip} · {fmt(d.last_seen)}</div>
              </div>
              {d.revoked ? (
                <span className="text-xs text-gray-400 font-dm">déconnecté</span>
              ) : (
                <span className="text-xs text-green-600 font-semibold font-dm">actif</span>
              )}
            </div>
          ))}
        </div>
        <LogoutOthers />
      </div>

      {/* Historique des connexions */}
      <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📜</span>
          <h2 className="font-playfair text-xl font-bold text-gray-900">Historique des connexions</h2>
        </div>
        {!history?.length ? (
          <p className="text-gray-400 text-sm font-dm">Aucune connexion enregistrée pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 font-dm">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Appareil</th>
                <th className="pb-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {history.map((h, i) => (
                <tr key={i} className="text-gray-700 font-dm">
                  <td className="py-2">{fmt(h.created_at)}</td>
                  <td className="py-2">{h.device}</td>
                  <td className="py-2 text-gray-400">{h.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
