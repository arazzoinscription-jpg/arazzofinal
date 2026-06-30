"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, Printer, Ruler, ShoppingCart, Loader2, Check, ArrowRight } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/toast";
import { requestPatronFulfilment } from "./actions";

type Choice = "pdf" | "a0" | "placement";

const field =
  "w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const label = "block text-xs font-medium text-gray-500 dark:text-white/50 mb-1";

export function PatronPurchase({
  patronId, productId, price,
}: {
  patronId: string;
  productId: string | null;
  price: number;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>("pdf");

  const options: { key: Choice; Icon: typeof FileDown; title: string; desc: string }[] = [
    { key: "pdf", Icon: FileDown, title: "Fichier PDF", desc: "À télécharger, à imprimer chez vous" },
    { key: "a0", Icon: Printer, title: "Imprimé A0", desc: "Sur papier traceur, livré chez vous" },
    { key: "placement", Icon: Ruler, title: "Placement sur mesure", desc: "Selon votre table & votre tissu" },
  ];

  return (
    <div className="w-full">
      {/* Sélecteur des 3 choix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
        {options.map((o) => {
          const on = choice === o.key;
          return (
            <button key={o.key} onClick={() => setChoice(o.key)}
              className={`text-start rounded-2xl border p-3.5 transition-all ${
                on ? "border-orange-DEFAULT bg-orange-50/70 dark:bg-orange-500/10 ring-1 ring-orange-DEFAULT"
                   : "border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:border-orange-300"
              }`}>
              <o.Icon size={20} className={on ? "text-orange-600 dark:text-orange-300" : "text-gray-400"} />
              <p className="font-semibold text-sm text-gray-900 dark:text-white mt-2">{o.title}</p>
              <p className="text-[11px] text-gray-400 dark:text-white/40 mt-0.5 leading-tight">{o.desc}</p>
            </button>
          );
        })}
      </div>

      {choice === "pdf" && <PdfChoice productId={productId} price={price} />}
      {choice === "a0" && <A0Choice patronId={patronId} onDone={() => router.refresh()} />}
      {choice === "placement" && <PlacementChoice patronId={patronId} onDone={() => router.refresh()} />}
    </div>
  );
}

/* ── Choix 1 : PDF (achat boutique) ─────────────────────────── */
function PdfChoice({ productId, price }: { productId: string | null; price: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);

  if (!productId) {
    return <p className="text-sm text-gray-400 font-dm">Ce patron n'est pas encore disponible à l'achat.</p>;
  }
  function add() {
    start(async () => {
      const res = await addToCart(productId!, 1);
      if (res.ok) {
        setAdded(true);
        toast("Ajouté au panier 🛒", "success");
        if (typeof window !== "undefined") window.dispatchEvent(new Event("cart:changed"));
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });
  }
  return (
    <div className="rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4">
      <p className="text-sm text-gray-500 dark:text-white/60 font-dm mb-3">
        Après le paiement : <strong>bouton de téléchargement</strong> dans votre espace « Mes patrons » + un email avec le lien.
      </p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xl font-bold text-orange-DEFAULT font-playfair">{Number(price).toLocaleString("fr-DZ")} DA</span>
        {added ? (
          <Link href="/panier" className="shiny-cta inline-flex items-center gap-2 bg-violet-700 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-800 transition-colors">
            <ShoppingCart size={18} /> Voir le panier
          </Link>
        ) : (
          <button onClick={add} disabled={pending}
            className="shiny-cta inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-60">
            {pending ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />} Ajouter au panier
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Choix 2 : Impression A0 (livrée) ───────────────────────── */
function A0Choice({ patronId, onDone }: { patronId: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [largeur, setLargeur] = useState("90");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await requestPatronFulfilment({
        patronId, type: "impression_a0", largeur,
        fullName: String(fd.get("fullName") || ""), phone: String(fd.get("phone") || ""),
        wilaya: String(fd.get("wilaya") || ""), address: String(fd.get("address") || ""),
        note: String(fd.get("note") || ""),
      });
      if (res.ok) { setDone(true); onDone(); }
      else setErr(res.error || "Erreur");
    });
  }

  if (done) return <Success text="Demande d'impression A0 envoyée ! Nous vous contactons pour la livraison." />;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 space-y-3">
      <div>
        <span className={label}>Largeur du papier traceur</span>
        <div className="flex gap-2">
          {["90", "180"].map((w) => (
            <button type="button" key={w} onClick={() => setLargeur(w)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                largeur === w ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-200" : "border-cream-200 dark:border-white/15 text-gray-600 dark:text-white/60"
              }`}>
              A0 · {w} cm
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><span className={label}>Nom complet *</span><input name="fullName" required className={field} placeholder="Votre nom" /></div>
        <div><span className={label}>Téléphone *</span><input name="phone" required className={field} placeholder="06 …" /></div>
        <div><span className={label}>Wilaya *</span><input name="wilaya" required className={field} placeholder="Ex. Alger" /></div>
        <div><span className={label}>Adresse</span><input name="address" className={field} placeholder="Adresse de livraison" /></div>
      </div>
      <div><span className={label}>Note (optionnel)</span><input name="note" className={field} placeholder="Précisions…" /></div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button type="submit" disabled={pending}
        className="shiny-cta w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-2xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-60">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} Demander l'impression livrée
      </button>
    </form>
  );
}

/* ── Choix 3 : Placement sur mesure ─────────────────────────── */
function PlacementChoice({ patronId, onDone }: { patronId: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await requestPatronFulfilment({
        patronId, type: "placement",
        tableLongueur: String(fd.get("tableLongueur") || ""), tableLargeur: String(fd.get("tableLargeur") || ""),
        laizeTissu: String(fd.get("laizeTissu") || ""), tissu: String(fd.get("tissu") || ""),
        note: String(fd.get("note") || ""),
      });
      if (res.ok) { setDone(true); onDone(); }
      else setErr(res.error || "Erreur");
    });
  }

  if (done) return <Success href="/dashboard/sur-mesure" text="Demande de placement envoyée ! Vous recevrez un devis (prix PDF + papier imprimé) à accepter dans « Sur mesure »." />;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 space-y-3">
      <p className="text-xs text-gray-500 dark:text-white/50 font-dm">Placement optimisé selon les dimensions de votre table de coupe et la laize de votre rouleau de tissu.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><span className={label}>Longueur de la table (cm) *</span><input name="tableLongueur" type="number" min="0" required className={field} placeholder="Ex. 200" /></div>
        <div><span className={label}>Largeur de la table (cm) *</span><input name="tableLargeur" type="number" min="0" required className={field} placeholder="Ex. 90" /></div>
        <div><span className={label}>Laize du tissu / rouleau (cm) *</span><input name="laizeTissu" type="number" min="0" required className={field} placeholder="Ex. 140" /></div>
        <div><span className={label}>Tissu / matière</span><input name="tissu" className={field} placeholder="Ex. crêpe, satin…" /></div>
      </div>
      <div><span className={label}>Note (optionnel)</span><input name="note" className={field} placeholder="Précisions…" /></div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button type="submit" disabled={pending}
        className="shiny-cta w-full inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-3 rounded-2xl font-bold hover:bg-violet-800 transition-colors disabled:opacity-60">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Ruler size={18} />} Demander mon placement
      </button>
    </form>
  );
}

function Success({ text, href = "/dashboard/commandes" }: { text: string; href?: string }) {
  return (
    <div className="rounded-2xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-4 text-green-700 dark:text-green-300 text-sm font-dm flex items-start gap-2">
      <Check size={18} className="flex-shrink-0 mt-0.5" />
      <span>{text} <Link href={href} className="font-semibold underline inline-flex items-center gap-1">Suivre <ArrowRight size={13} /></Link></span>
    </div>
  );
}
