"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutOthers() {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    if (!confirm("Déconnecter tous les autres appareils ? Vous resterez connectée ici.")) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signOut({ scope: "others" });
    // Marquer les appareils comme révoqués
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("user_devices").update({ revoked: true }).eq("user_id", user.id);
    setBusy(false);
    setMsg(error ? "Erreur : " + error.message : "Tous les autres appareils ont été déconnectés ✓");
    router.refresh();
  }

  return (
    <div>
      <button onClick={run} disabled={busy}
        className="border border-orange-300 text-orange-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-50 transition-colors disabled:opacity-50">
        {busy ? "…" : "🚪 Déconnecter les autres appareils"}
      </button>
      {msg && <p className="text-sm mt-2 text-green-700">{msg}</p>}
    </div>
  );
}
