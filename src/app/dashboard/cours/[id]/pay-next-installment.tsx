"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { payNextInstallment } from "./extras-actions";

/**
 * Bouton « Payer le mois suivant » (en avance). Prépare la commande d'échéance
 * puis emmène l'élève vers ses commandes pour voir la facture + déposer son reçu.
 */
export function PayNextInstallmentButton({ courseId, label, variant = "solid" }: { courseId: string; label?: string; variant?: "solid" | "soft" }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    start(async () => {
      const res = await payNextInstallment(courseId);
      if (res.ok) {
        toast("Échéance prête — déposez votre reçu de paiement. 🧾", "success");
        router.push("/dashboard/commandes");
      } else {
        toast(res.error ?? "Action impossible", res.done ? "info" : "error");
        if (res.done) router.refresh();
      }
    });
  }

  const cls = variant === "soft"
    ? "inline-flex items-center gap-2 border-2 border-orange-DEFAULT text-orange-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-50 disabled:opacity-60 transition-colors"
    : "inline-flex items-center gap-2 bg-orange-DEFAULT bg-orange-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-orange-700 disabled:opacity-60 transition-colors";

  return (
    <button onClick={go} disabled={pending} className={cls}>
      {pending ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
      {label ?? "Payer le mois suivant pour débloquer"}
    </button>
  );
}
