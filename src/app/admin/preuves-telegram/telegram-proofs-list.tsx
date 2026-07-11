"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, XCircle, Loader2, RotateCcw, CreditCard, CalendarClock } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { getTelegramProofUrls, setTelegramProofStatus } from "@/app/dashboard/telegram-proof-actions";

export interface TgProofRow {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  fileType: string | null;
  paymentType: "total" | "abonnement";
  photoCount: number;
  studentName: string;
  studentEmail: string;
  courses: string[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  received: { label: "Reçue", cls: "bg-orange-100 text-orange-700" },
  verified: { label: "Vérifiée ✓", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rejetée", cls: "bg-red-100 text-red-700" },
};

const PAY: Record<string, { label: string; cls: string; Icon: typeof CreditCard }> = {
  total: { label: "Paiement total", cls: "bg-orange-50 text-orange-700", Icon: CreditCard },
  abonnement: { label: "Abonnement", cls: "bg-violet-50 text-violet-700", Icon: CalendarClock },
};

export function TelegramProofsList({ rows }: { rows: TgProofRow[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();

  async function view(id: string) {
    const r = await getTelegramProofUrls(id);
    if (r.ok) r.urls.forEach((u) => window.open(u, "_blank"));
    else toast(r.error ?? "Erreur", "error");
  }
  function setStatus(id: string, status: "verified" | "rejected" | "received") {
    start(async () => {
      const r = await setTelegramProofStatus(id, status);
      if (r.ok) { toast("Statut mis à jour ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-10 text-center">Aucune preuve Telegram pour l'instant.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-500 dark:text-white/50 mb-2">{rows.length} preuve(s)</div>
      {rows.map((d) => {
        const st = STATUS[d.status] ?? { label: d.status, cls: "bg-gray-100 text-gray-600" };
        return (
          <div key={d.id} className="rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {d.studentName} <span className="text-xs text-gray-400 font-normal">· {d.studentEmail}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                  {d.courses.length ? d.courses.join(" · ") : "—"} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </p>
                {d.note && <p className="text-xs text-gray-400 mt-1 italic">« {d.note} »</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(() => {
                  const pt = PAY[d.paymentType] ?? PAY.total;
                  return (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${pt.cls}`}>
                      <pt.Icon size={12} /> {pt.label}{d.photoCount > 1 ? ` · ${d.photoCount} photos` : ""}
                    </span>
                  );
                })()}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button onClick={() => view(d.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-100">
                <FileText size={14} /> {d.photoCount > 1 ? `Voir les ${d.photoCount} photos` : "Voir la preuve"}
              </button>
              {d.status !== "verified" && (
                <button onClick={() => setStatus(d.id, "verified")} disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Marquer vérifiée
                </button>
              )}
              {d.status !== "rejected" && (
                <button onClick={() => setStatus(d.id, "rejected")} disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50">
                  <XCircle size={14} /> Rejeter
                </button>
              )}
              {d.status !== "received" && (
                <button onClick={() => setStatus(d.id, "received")} disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50">
                  <RotateCcw size={14} /> Réinitialiser
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
