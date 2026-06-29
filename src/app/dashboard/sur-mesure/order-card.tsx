"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Download, Upload, Loader2, Clock, Hammer, Hourglass, Ruler, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import {
  acceptCustomPrice, refuseCustomPrice,
  createCustomPaymentUploadUrl, submitCustomPayment, getCustomPatronDownload,
} from "./actions";
import { SUR_MESURE, type SurMesureType } from "./constants";

export interface ClientOrder {
  id: string;
  titre: string;
  tissu: string | null;
  taille: string | null;
  statut: string;
  proposed_price_dzd: number | null;
  created_at: string;
}

const BADGE: Record<string, string> = {
  price_requested: "bg-gray-100 text-gray-600",
  price_proposed: "bg-orange-50 text-orange-700",
  awaiting_patronniste: "bg-blue-50 text-blue-700",
  en_cours: "bg-violet-50 text-violet-700",
  delivered: "bg-amber-50 text-amber-700",
  payment_review: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  refused: "bg-gray-100 text-gray-500",
  annule: "bg-gray-100 text-gray-500",
};
const LABEL: Record<string, string> = {
  price_requested: "En attente du prix",
  price_proposed: "Prix proposé",
  awaiting_patronniste: "Recherche d'une patronniste",
  en_cours: "En cours de réalisation",
  delivered: "Prêt — à régler",
  payment_review: "Paiement en validation",
  completed: "Terminé",
  refused: "Refusé",
  annule: "Annulé",
};

export function CustomOrderCard({ o, type = "patron" }: { o: ClientOrder; type?: SurMesureType }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [payBusy, setPayBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;
  const noun = SUR_MESURE[type].noun; // « patron » ou « placement »
  const TypeIcon = type === "placement" ? LayoutGrid : Ruler;

  function accept() {
    start(async () => {
      const r = await acceptCustomPrice(o.id);
      if (r.ok) { toast("Prix accepté — recherche d'une patronniste ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }
  function refuse() {
    if (!confirm("Refuser ce prix et annuler la demande ?")) return;
    start(async () => {
      const r = await refuseCustomPrice(o.id);
      if (r.ok) { toast("Prix refusé", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  async function download() {
    const r = await getCustomPatronDownload(o.id);
    if (r.ok) window.open(r.url, "_blank");
    else toast(r.error ?? "Indisponible", "error");
  }

  async function onPayFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPayBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const prep = await createCustomPaymentUploadUrl(o.id, ext);
      if (!prep.ok) { toast(prep.error, "error"); return; }
      const supabase = createClient();
      const { error } = await supabase.storage.from("proofs").uploadToSignedUrl(prep.path, prep.token, file);
      if (error) { toast("Envoi échoué : " + error.message, "error"); return; }
      const rec = await submitCustomPayment(o.id, prep.path);
      if (rec.ok) { toast("Preuve envoyée — validation sous 24-48 h ✅", "success"); router.refresh(); }
      else toast(rec.error ?? "Erreur", "error");
    } finally {
      setPayBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 ${type === "placement" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"}`}>
            <TypeIcon size={11} /> {SUR_MESURE[type].short}
          </span>
          <h3 className="font-semibold truncate">{o.titre}</h3>
        </div>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ${BADGE[o.statut] ?? "bg-gray-100 text-gray-500"}`}>
          {LABEL[o.statut] ?? o.statut}
        </span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {new Date(o.created_at).toLocaleDateString("fr-FR")}
        {o.taille ? ` · Taille ${o.taille}` : ""}{o.tissu ? ` · ${o.tissu}` : ""}
      </div>

      {/* Prix proposé → accepter / refuser */}
      {o.statut === "price_proposed" && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-500/10 p-3">
          <p className="text-sm text-gray-700 dark:text-white/80">
            Prix proposé : <strong className="text-orange-700">{fmt(o.proposed_price_dzd ?? 0)}</strong>
          </p>
          <div className="flex gap-2 mt-2.5">
            <button onClick={accept} disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Accepter
            </button>
            <button onClick={refuse} disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-60">
              <X size={15} /> Refuser
            </button>
          </div>
        </div>
      )}

      {o.statut === "price_requested" && (
        <p className="mt-3 text-sm text-gray-500 inline-flex items-center gap-1.5"><Clock size={14} /> En attente de la proposition de prix.</p>
      )}
      {o.statut === "awaiting_patronniste" && (
        <p className="mt-3 text-sm text-blue-600 inline-flex items-center gap-1.5"><Hourglass size={14} /> Recherche d'une patronniste disponible…</p>
      )}
      {o.statut === "en_cours" && (
        <p className="mt-3 text-sm text-violet-600 inline-flex items-center gap-1.5"><Hammer size={14} /> Une patronniste réalise votre {noun} {o.proposed_price_dzd ? `· ${fmt(o.proposed_price_dzd)}` : ""}.</p>
      )}

      {/* Livré → régler le paiement pour débloquer le téléchargement */}
      {o.statut === "delivered" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-3">
          <p className="text-sm text-gray-700 dark:text-white/80">
            Votre {noun} est prêt ! Réglez <strong>{fmt(o.proposed_price_dzd ?? 0)}</strong> puis déposez votre preuve de paiement pour télécharger.
          </p>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" hidden onChange={onPayFile} />
          <button onClick={() => fileRef.current?.click()} disabled={payBusy}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
            {payBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Déposer ma preuve de paiement
          </button>
        </div>
      )}
      {o.statut === "payment_review" && (
        <p className="mt-3 text-sm text-blue-600 inline-flex items-center gap-1.5"><Clock size={14} /> Paiement en cours de validation (24-48 h).</p>
      )}

      {/* Paiement validé → téléchargement */}
      {o.statut === "completed" && (
        <button onClick={download}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700">
          <Download size={16} /> Télécharger mon {noun}
        </button>
      )}
    </div>
  );
}
