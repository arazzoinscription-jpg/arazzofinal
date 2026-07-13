"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, GraduationCap, IdCard, Download, Truck, CheckCircle2, Mail } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { searchStudentsForDiploma, studentCourses, manualGenerateDiploma, setDiplomaStatus, getCniSignedUrl, resendDiplomaEmail } from "./actions";

export interface DiplomaRow {
  id: string; status: string; fullName: string; email: string;
  phone: string | null; wilaya: string | null; address: string | null;
  numero: string | null; hasCni: boolean; course: string; createdAt: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  eligible: { label: "Éligible (CNI attendue)", cls: "bg-orange-100 text-orange-700" },
  cni_uploaded: { label: "CNI reçue", cls: "bg-violet-100 text-violet-700" },
  generated: { label: "Diplôme généré", cls: "bg-blue-100 text-blue-700" },
  shipped: { label: "Expédié", cls: "bg-green-100 text-green-700" },
};

export function DiplomesAdmin({ rows }: { rows: DiplomaRow[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();

  // ── Sélection en masse pour l'export ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = rows.length > 0 && selected.size === rows.length;
  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  /** Exporte UNIQUEMENT les diplômes cochés (mêmes colonnes que la feuille de livraison). */
  function exportSelection() {
    const picked = rows.filter((r) => selected.has(r.id));
    if (!picked.length) { toast("Cochez au moins un diplôme à exporter.", "error"); return; }
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Nom", "Prénom", "Téléphone", "Wilaya", "Adresse exacte", "Formation", "N° diplôme", "Statut"];
    const lines = [header.map(cell).join(";")];
    for (const d of picked) {
      const full = (d.fullName ?? "").trim();
      const parts = full.split(/\s+/);
      const prenom = parts.length > 1 ? parts[0] : "";
      const nom = parts.length > 1 ? parts.slice(1).join(" ") : full;
      lines.push([nom, prenom, d.phone ?? "", d.wilaya ?? "", d.address ?? "", d.course, d.numero ?? "", STATUS[d.status]?.label ?? d.status]
        .map(cell).join(";"));
    }
    const csv = "﻿" + lines.join("\r\n"); // BOM UTF-8 pour Excel/arabe
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `diplomes-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`${picked.length} diplôme(s) exporté(s) ✅`, "success");
  }

  // ── Génération manuelle ──
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; nom: string; email: string }[]>([]);
  const [student, setStudent] = useState<{ id: string; nom: string } | null>(null);
  const [courses, setCourses] = useState<{ id: string; titre: string }[]>([]);
  const [courseId, setCourseId] = useState("");

  function search() {
    if (q.trim().length < 2) return;
    start(async () => {
      const r = await searchStudentsForDiploma(q.trim());
      if (r.ok) setResults(r.results);
    });
  }
  function pick(s: { id: string; nom: string }) {
    setStudent(s); setResults([]); setCourses([]); setCourseId("");
    start(async () => {
      const r = await studentCourses(s.id);
      if (r.ok) setCourses(r.courses);
    });
  }
  function generate() {
    if (!student || !courseId) { toast("Choisissez un étudiant et une formation.", "error"); return; }
    start(async () => {
      const r = await manualGenerateDiploma({ userId: student.id, courseId });
      if (r.ok) { toast(r.created ? "Diplôme généré + email CNI envoyé ✅" : "Ce diplôme existe déjà.", r.created ? "success" : "error"); setStudent(null); setQ(""); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  function changeStatus(id: string, status: "generated" | "shipped") {
    start(async () => {
      const r = await setDiplomaStatus(id, status);
      if (r.ok) { toast("Statut mis à jour ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }
  async function viewCni(id: string) {
    const r = await getCniSignedUrl(id);
    if (r.ok) window.open(r.url, "_blank");
    else toast(r.error ?? "Erreur", "error");
  }
  function resendEmail(id: string) {
    start(async () => {
      const r = await resendDiplomaEmail(id);
      if (r.ok) toast(`Email de diplôme renvoyé à ${r.to} ✅`, "success");
      else toast(r.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Génération manuelle ── */}
      <div className="rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><GraduationCap size={18} className="text-violet-600" /> Générer un diplôme manuellement</h2>
        {!student ? (
          <>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Rechercher un étudiant (nom ou email)…"
                className="flex-1 border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={search} disabled={busy} className="inline-flex items-center gap-1.5 bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Chercher
              </button>
            </div>
            {results.length > 0 && (
              <div className="space-y-1">
                {results.map((s) => (
                  <button key={s.id} onClick={() => pick(s)} className="w-full text-start flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-cream-50 dark:hover:bg-white/5">
                    <span className="text-sm text-gray-800 dark:text-white/90">{s.nom}</span>
                    <span className="text-xs text-gray-400">{s.email}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-white/80">Étudiant : <strong>{student.nom}</strong> <button onClick={() => setStudent(null)} className="text-xs text-orange-600 ms-2 hover:underline">changer</button></p>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="w-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-xl px-3 py-2 text-sm">
              <option value="">— Choisir la formation —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
            {courses.length === 0 && <p className="text-xs text-orange-600">Cet étudiant n'a aucune inscription.</p>}
            <button onClick={generate} disabled={busy || !courseId}
              className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <GraduationCap size={15} />} Générer + envoyer l'email CNI
            </button>
          </div>
        )}
      </div>

      {/* ── Feuille de livraison + export de la sélection ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Diplômes ({rows.length})</h2>
          {rows.length > 0 && (
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/60 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-violet-600 w-4 h-4" />
              Tout sélectionner
            </label>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* N'exporte QUE les diplômes cochés dans la liste ci-dessous */}
          <button onClick={exportSelection} disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-800 disabled:opacity-40">
            <Download size={15} /> Exporter la sélection ({selected.size})
          </button>
          <a href="/api/diplomes/export-sheet" className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700">
            <Download size={15} /> Exporter tout (CSV)
          </a>
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Aucun diplôme pour l'instant.</p>
        ) : rows.map((d) => {
          const st = STATUS[d.status] ?? { label: d.status, cls: "bg-gray-100 text-gray-600" };
          return (
            <div key={d.id} className={`rounded-2xl border bg-white dark:bg-white/[0.04] p-4 ${selected.has(d.id) ? "border-violet-300 ring-1 ring-violet-200" : "border-cream-200 dark:border-white/10"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)}
                    aria-label={`Sélectionner le diplôme de ${d.fullName}`}
                    className="accent-violet-600 w-4 h-4 mt-1 shrink-0 cursor-pointer" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{d.fullName} <span className="text-xs text-gray-400 font-normal">· {d.course}</span></p>
                    <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                      {d.numero ?? "—"} · 📞 {d.phone ?? "?"} · {d.wilaya ?? "?"} · {d.address ?? "adresse ?"}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {d.hasCni && (
                  <button onClick={() => viewCni(d.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-100">
                    <IdCard size={14} /> Voir la CNI
                  </button>
                )}
                {/* Renvoi manuel de l'email de diplôme (demande de CNI), autant de fois que voulu */}
                <button onClick={() => resendEmail(d.id)} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 disabled:opacity-50">
                  <Mail size={14} /> Renvoyer l'email
                </button>
                {d.status !== "generated" && d.status !== "shipped" && (
                  <button onClick={() => changeStatus(d.id, "generated")} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                    <CheckCircle2 size={14} /> Marquer généré
                  </button>
                )}
                {d.status !== "shipped" && (
                  <button onClick={() => changeStatus(d.id, "shipped")} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50">
                    <Truck size={14} /> Marquer expédié
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
