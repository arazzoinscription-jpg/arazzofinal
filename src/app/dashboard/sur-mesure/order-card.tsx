"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Download, Upload, Loader2, Clock, Hammer, Hourglass, Ruler, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import {
  acceptCustomPrice, refuseCustomPrice,
  createCustomPaymentUploadUrl, submitCustomPayment, getCustomPatronDownload,
  submitPlacementDelivery,
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
  mesures?: Record<string, any> | null;
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

  // Placement patron : devis à 2 prix (PDF / papier imprimé) → choix du format à l'acceptation.
  const m = (o.mesures ?? {}) as Record<string, any>;
  const isPlacementPatron = m.kind === "placement_patron";
  const pdfPrice = Number(m.prix_pdf_dzd ?? o.proposed_price_dzd ?? 0);
  const paperPrice = Number(m.prix_papier_dzd ?? 0);
  const [format, setFormat] = useState<"pdf" | "papier">("pdf");
  // Livraison papier (placement) : coordonnées + statut d'expédition.
  const isPaperPlacement = isPlacementPatron && m.format_choisi === "papier";
  const livraison = m.livraison as { nom?: string; phone?: string; wilaya?: string; adresse?: string } | undefined;
  const livStatut = m.livraison_statut as string | undefined;
  const [ship, setShip] = useState({ nom: "", phone: "", wilaya: "", adresse: "" });
  const [shipBusy, setShipBusy] = useState(false);

  function submitShipping() {
    setShipBusy(true);
    start(async () => {
      const r = await submitPlacementDelivery(o.id, ship);
      if (r.ok) { toast("Coordonnées envoyées — expédition en préparation 📦", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
      setShipBusy(false);
    });
  }

  function accept() {
    start(async () => {
      const r = await acceptCustomPrice(o.id, isPlacementPatron ? format : undefined);
      if (r.ok) { toast("Devis accepté — recherche d'une patronniste ✅", "success"); router.refresh(); }
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
      {isPaperPlacement && ["awaiting_patronniste", "en_cours"].includes(o.statut) && (
        <p className="mt-2 text-xs text-violet-600 dark:text-violet-300 inline-flex items-start gap-1.5">
          <Upload size={13} className="mt-px shrink-0" /> Format papier imprimé — vous renseignerez l'adresse de livraison une fois le patron prêt (paiement à la livraison).
        </p>
      )}

      {/* Prix proposé → (placement : choix du format) accepter / refuser */}
      {o.statut === "price_proposed" && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-500/10 p-3">
          {isPlacementPatron ? (
            <>
              <p className="text-sm text-gray-700 dark:text-white/80 mb-2">Devis prêt — choisissez votre format :</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormat("pdf")}
                  className={`rounded-lg border p-2.5 text-start transition-colors ${format === "pdf" ? "border-orange-DEFAULT bg-white dark:bg-white/10 ring-1 ring-orange-DEFAULT" : "border-gray-200 dark:border-white/15"}`}>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white"><Download size={13} /> PDF</span>
                  <span className="block text-sm font-bold text-orange-700 dark:text-orange-300 mt-0.5">{fmt(pdfPrice)}</span>
                  <span className="block text-[10px] text-gray-400">À télécharger</span>
                </button>
                <button type="button" onClick={() => setFormat("papier")}
                  className={`rounded-lg border p-2.5 text-start transition-colors ${format === "papier" ? "border-orange-DEFAULT bg-white dark:bg-white/10 ring-1 ring-orange-DEFAULT" : "border-gray-200 dark:border-white/15"}`}>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white"><Upload size={13} /> Papier imprimé</span>
                  <span className="block text-sm font-bold text-orange-700 dark:text-orange-300 mt-0.5">{fmt(paperPrice)}</span>
                  <span className="block text-[10px] text-gray-400">Livré chez vous</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700 dark:text-white/80">
              Prix proposé : <strong className="text-orange-700">{fmt(o.proposed_price_dzd ?? 0)}</strong>
            </p>
          )}
          <div className="flex gap-2 mt-2.5">
            <button onClick={accept} disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {isPlacementPatron ? "Accepter ce format" : "Accepter"}
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

      {/* Livré → (papier : coordonnées de livraison) OU (numérique : paiement) */}
      {o.statut === "delivered" && isPaperPlacement && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-3">
          <p className="text-sm text-gray-700 dark:text-white/80 mb-2.5">
            Votre placement papier est prêt ! Renseignez vos coordonnées pour la livraison par transporteur (paiement à la livraison).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input value={ship.nom} onChange={(e) => setShip((s) => ({ ...s, nom: e.target.value }))} placeholder="Nom complet *" className="col-span-2 rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
            <input value={ship.phone} onChange={(e) => setShip((s) => ({ ...s, phone: e.target.value }))} placeholder="Téléphone *" className="rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
            <input value={ship.wilaya} onChange={(e) => setShip((s) => ({ ...s, wilaya: e.target.value }))} placeholder="Wilaya *" className="rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
            <input value={ship.adresse} onChange={(e) => setShip((s) => ({ ...s, adresse: e.target.value }))} placeholder="Adresse de livraison" className="col-span-2 rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
          </div>
          <button onClick={submitShipping} disabled={shipBusy || pending}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
            {shipBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Valider mes coordonnées de livraison
          </button>
        </div>
      )}
      {o.statut === "delivered" && !isPaperPlacement && (
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

      {/* Terminé → (papier : suivi d'expédition) OU (numérique : téléchargement) */}
      {o.statut === "completed" && isPaperPlacement && (
        <div className="mt-3 rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3 text-sm">
          {livStatut === "livre" ? (
            <p className="text-green-700 dark:text-green-300 inline-flex items-center gap-1.5"><Check size={15} /> Colis livré. Merci !</p>
          ) : livStatut === "expedie" ? (
            <p className="text-blue-600 dark:text-blue-300 inline-flex items-center gap-1.5"><Clock size={15} /> Colis expédié — en cours d'acheminement.</p>
          ) : (
            <p className="text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5"><Clock size={15} /> Coordonnées reçues — expédition en préparation.</p>
          )}
          {livraison?.wilaya && <p className="text-gray-500 dark:text-white/50 mt-1">Livraison : {livraison.nom} · {livraison.wilaya}</p>}
        </div>
      )}
      {o.statut === "completed" && !isPaperPlacement && (
        <button onClick={download}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700">
          <Download size={16} /> Télécharger mon {noun}
        </button>
      )}
    </div>
  );
}
