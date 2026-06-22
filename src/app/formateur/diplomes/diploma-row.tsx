"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, IdCard, Award, Truck, Download } from "lucide-react";
import { generateDiploma, markDiplomaShipped } from "./actions";
import { toast } from "@/components/ui/toast";

export interface DiplomaRowData {
  id: string;
  studentName: string;
  email: string;
  courseTitre: string;
  status: string;
  cniUrl: string | null;
  diplomaUrl: string | null;
}

const BADGE: Record<string, string> = {
  eligible: "bg-amber-100 text-amber-700",
  cni_uploaded: "bg-violet-100 text-violet-700",
  generated: "bg-green-100 text-green-700",
  shipped: "bg-gray-200 text-gray-600",
};
const LABEL: Record<string, string> = {
  eligible: "En attente CNI",
  cni_uploaded: "CNI reçue · à générer",
  generated: "Généré",
  shipped: "Expédié",
};

export function DiplomaRow({ d }: { d: DiplomaRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function generate() {
    if (!confirm(`Générer le diplôme officiel de ${d.studentName} ? Vérifiez d'abord que la CNI correspond au nom.`)) return;
    start(async () => {
      const res = await generateDiploma(d.id);
      if (res.ok) { toast("Diplôme généré ✓ — élève notifiée", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }
  function ship() {
    start(async () => {
      const res = await markDiplomaShipped(d.id);
      if (res.ok) { toast("Marqué comme expédié 📦", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3 justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{d.studentName}</p>
        <p className="text-xs text-gray-400">{d.email} · {d.courseTitre}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${BADGE[d.status] ?? "bg-gray-100 text-gray-500"}`}>{LABEL[d.status] ?? d.status}</span>

        {d.cniUrl && (
          <a href={d.cniUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            <IdCard size={15} /> Voir la CNI
          </a>
        )}
        {d.status === "cni_uploaded" && (
          <button onClick={generate} disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm bg-violet-600 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-violet-700 disabled:opacity-60">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />} Générer le diplôme
          </button>
        )}
        {d.status === "generated" && (
          <>
            {d.diplomaUrl && (
              <a href={d.diplomaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                <Download size={15} /> PDF
              </a>
            )}
            <button onClick={ship} disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm bg-orange-DEFAULT text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-orange-600 disabled:opacity-60">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />} Marquer expédié
            </button>
          </>
        )}
      </div>
    </div>
  );
}
