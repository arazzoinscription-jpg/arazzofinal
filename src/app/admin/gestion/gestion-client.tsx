"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  setUserStatus, deleteEnrollment, resendStudentAccess,
} from "@/app/admin/actions";
import {
  Users, GraduationCap, UserCheck, UserX, UserCog, Ban, Eye,
  Mail, Trash2, AlertTriangle, Search, Filter, X,
} from "lucide-react";

type Status = "actif" | "inactif" | "veille" | "bloque";

interface Formateur {
  id: string;
  nom: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  ville?: string | null;
  coursCount: number;
  elevesCount: number;
  status: Status;
}

interface Eleve {
  id: string;
  nom: string;
  email: string;
  avatar_url?: string | null;
  status: Status;
  lastSignInAt: string | null;
}

interface Course {
  id: string;
  titre_fr: string;
  formateur_id: string | null;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  formateur_id: string | null;
  paid_at: string | null;
  course_titre: string;
  student_nom: string;
  student_email: string;
}

interface Stats {
  totalFormateurs: number;
  totalEleves: number;
  actifs: number;
  inactifs: number;
  veille: number;
  bloques: number;
}

interface Props {
  initialTab: string;
  formateurs: Formateur[];
  eleves: Eleve[];
  courses: Course[];
  enrollments: Enrollment[];
  stats: Stats;
  initialFilters: {
    formateur: string;
    formation: string;
    status: string;
    q: string;
  };
}

const statusLabel: Record<Status, string> = {
  actif: "Actif",
  inactif: "Inactif",
  veille: "En veille",
  bloque: "Bloqué",
};

const statusClass: Record<Status, string> = {
  actif: "bg-green-100 text-green-700",
  inactif: "bg-gray-100 text-gray-600",
  veille: "bg-amber-100 text-amber-700",
  bloque: "bg-red-100 text-red-700",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ url, nom }: { url?: string | null; nom: string }) {
  if (url) {
    return <img src={url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[#6B21C8] text-white flex items-center justify-center text-sm font-bold ring-2 ring-white shadow-sm">
      {nom?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function GestionClient({
  initialTab, formateurs, eleves, courses, enrollments, stats, initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(initialTab === "etudiants" ? "etudiants" : "formateurs");
  const [pending, start] = useTransition();

  const [filters, setFilters] = useState(initialFilters);

  function updateQuery(next: Partial<typeof filters> & { tab?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab) params.set("tab", next.tab);
    if (next.formateur !== undefined) {
      next.formateur ? params.set("formateur", next.formateur) : params.delete("formateur");
    }
    if (next.formation !== undefined) {
      next.formation ? params.set("formation", next.formation) : params.delete("formation");
    }
    if (next.status !== undefined) {
      next.status ? params.set("status", next.status) : params.delete("status");
    }
    if (next.q !== undefined) {
      next.q ? params.set("q", next.q) : params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function switchTab(next: string) {
    setTab(next);
    updateQuery({ tab: next });
  }

  // ── Filtrage formateurs ───────────────────────────────────────────────────
  const filteredFormateurs = formateurs.filter((f) => {
    const q = filters.q.toLowerCase();
    if (q && !f.nom.toLowerCase().includes(q) && !f.email.toLowerCase().includes(q)) return false;
    if (filters.status && f.status !== filters.status) return false;
    return true;
  });

  // ── Filtrage étudiants (par inscription) ──────────────────────────────────
  const filteredEnrollments = enrollments.filter((e) => {
    const q = filters.q.toLowerCase();
    const matchesQ =
      !q ||
      e.student_nom.toLowerCase().includes(q) ||
      e.student_email.toLowerCase().includes(q) ||
      e.course_titre.toLowerCase().includes(q);
    const f = formateurs.find((x) => x.id === e.formateur_id);
    const matchesFormateur = !filters.formateur || e.formateur_id === filters.formateur;
    const matchesFormation = !filters.formation || e.course_id === filters.formation;
    const student = eleves.find((x) => x.id === e.user_id);
    const matchesStatus = !filters.status || student?.status === filters.status;
    return matchesQ && matchesFormateur && matchesFormation && matchesStatus;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  function setStatus(userId: string, status: Status) {
    const label = statusLabel[status].toLowerCase();
    if (!confirm(`Mettre ce compte ${label} ?`)) return;
    // « inactif » est un statut d'affichage (calculé), non applicable directement par l'admin.
    if (status === "inactif") { toast("Le statut « inactif » n'est pas applicable directement (utilisez Veille ou Bloqué).", "info"); return; }
    // Narrowing capturé dans une const : il ne survit pas à la closure async sinon.
    const applicable: "actif" | "veille" | "bloque" = status;
    start(async () => {
      const r = await setUserStatus({ userId, status: applicable });
      if (r.ok) {
        toast(`Compte ${label} ✅`, "success");
        router.refresh();
      } else toast(r.error ?? "Erreur", "error");
    });
  }

  function removeEnrollment(id: string) {
    if (!confirm("Supprimer définitivement cette inscription ?\nL'élève perdra l'accès à cette formation.")) return;
    start(async () => {
      const r = await deleteEnrollment(id);
      if (r.ok) {
        toast("Inscription supprimée ✅", "success");
        router.refresh();
      } else toast(r.error ?? "Erreur", "error");
    });
  }

  function resendAccess(userId: string) {
    if (!confirm("Renvoyer l'email d'accès à cet élève ?")) return;
    start(async () => {
      const r = await resendStudentAccess(userId);
      if (r.ok) {
        toast("Email d'accès renvoyé ✅", "success");
        router.refresh();
      } else toast(r.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Gestion Formateurs &amp; Étudiants</h1>
      <p className="text-gray-500 mb-6 font-dm">Vue centralisée des formateurs, élèves et inscriptions.</p>

      {/* ── Statistiques ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} label="Formateurs" value={stats.totalFormateurs} color="bg-violet-100 text-violet-700" />
        <StatCard icon={GraduationCap} label="Étudiants" value={stats.totalEleves} color="bg-orange-100 text-orange-700" />
        <StatCard icon={UserCheck} label="Actifs" value={stats.actifs} color="bg-green-100 text-green-700" />
        <StatCard icon={UserX} label="Inactifs" value={stats.inactifs} color="bg-gray-100 text-gray-600" />
        <StatCard icon={UserCog} label="En veille" value={stats.veille} color="bg-amber-100 text-amber-700" />
        <StatCard icon={Ban} label="Bloqués" value={stats.bloques} color="bg-red-100 text-red-700" />
      </div>

      {/* ── Onglets ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100">
        <button
          onClick={() => switchTab("formateurs")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === "formateurs" ? "border-orange-DEFAULT text-orange-DEFAULT" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Formateurs
        </button>
        <button
          onClick={() => switchTab("etudiants")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === "etudiants" ? "border-orange-DEFAULT text-orange-DEFAULT" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Étudiants &amp; Inscriptions
        </button>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Recherche</label>
            <div className="relative">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && updateQuery({ q: filters.q })}
                placeholder={tab === "formateurs" ? "Nom ou email formateur…" : "Nom, email, formation…"}
                className="w-full border border-gray-100 rounded-xl ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          {tab === "etudiants" && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Formateur</label>
                <select
                  value={filters.formateur}
                  onChange={(e) => { setFilters((p) => ({ ...p, formateur: e.target.value })); updateQuery({ formateur: e.target.value }); }}
                  className="border border-gray-100 rounded-xl px-3 py-2 text-sm bg-white min-w-40"
                >
                  <option value="">Tous</option>
                  {formateurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Formation</label>
                <select
                  value={filters.formation}
                  onChange={(e) => { setFilters((p) => ({ ...p, formation: e.target.value })); updateQuery({ formation: e.target.value }); }}
                  className="border border-gray-100 rounded-xl px-3 py-2 text-sm bg-white min-w-44"
                >
                  <option value="">Toutes</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.titre_fr}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => { setFilters((p) => ({ ...p, status: e.target.value })); updateQuery({ status: e.target.value }); }}
              className="border border-gray-100 rounded-xl px-3 py-2 text-sm bg-white min-w-36"
            >
              <option value="">Tous</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="veille">En veille</option>
              <option value="bloque">Bloqué</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              const empty = { formateur: "", formation: "", status: "", q: "" };
              setFilters(empty);
              updateQuery({ ...empty });
            }}
            className="gap-2"
          >
            <X size={15} /> Réinitialiser
          </Button>
        </div>
      </div>

      {/* ── Tableau Formateurs ──────────────────────────────────────────────── */}
      {tab === "formateurs" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gray-50">
              <TableRow className="text-left text-gray-500">
                <TableHead className="px-5 py-3 font-medium">Nom</TableHead>
                <TableHead className="px-5 py-3 font-medium">Email</TableHead>
                <TableHead className="px-5 py-3 font-medium">Formations</TableHead>
                <TableHead className="px-5 py-3 font-medium">Étudiants</TableHead>
                <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
                <TableHead className="px-5 py-3 font-medium">Profil</TableHead>
                <TableHead className="px-5 py-3 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {filteredFormateurs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">Aucun formateur.</TableCell></TableRow>
              ) : filteredFormateurs.map((f) => (
                <TableRow key={f.id} className="hover:bg-gray-50 align-top">
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar url={f.avatar_url} nom={f.nom} />
                      <div>
                        <div className="font-medium text-gray-900">{f.nom}</div>
                        {f.ville && <div className="text-xs text-gray-400">{f.ville}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{f.email}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{f.coursCount}</TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{f.elevesCount}</TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[f.status]}`}>
                      {statusLabel[f.status]}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <Link href={`/communaute/u/${f.id}`} target="_blank" className="text-orange-600 hover:underline text-xs font-semibold">
                      Voir profil →
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                        <Link href={`/communaute/u/${f.id}`} target="_blank"><Eye size={14} /> Profil</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                        <Link href={`/admin/gestion/${f.id}`}><GraduationCap size={14} /> Élèves</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tableau Étudiants / Inscriptions ────────────────────────────────── */}
      {tab === "etudiants" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gray-50">
              <TableRow className="text-left text-gray-500">
                <TableHead className="px-5 py-3 font-medium">Étudiant</TableHead>
                <TableHead className="px-5 py-3 font-medium">Email</TableHead>
                <TableHead className="px-5 py-3 font-medium">Formateur</TableHead>
                <TableHead className="px-5 py-3 font-medium">Formation</TableHead>
                <TableHead className="px-5 py-3 font-medium">Date inscription</TableHead>
                <TableHead className="px-5 py-3 font-medium">Dernière connexion</TableHead>
                <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
                <TableHead className="px-5 py-3 font-medium">Profil</TableHead>
                <TableHead className="px-5 py-3 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {filteredEnrollments.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-400">Aucune inscription.</TableCell></TableRow>
              ) : filteredEnrollments.map((e) => {
                const student = eleves.find((x) => x.id === e.user_id);
                const formateur = formateurs.find((x) => x.id === e.formateur_id);
                return (
                  <TableRow key={e.id} className="hover:bg-gray-50 align-top">
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar url={student?.avatar_url} nom={e.student_nom} />
                        <div className="font-medium text-gray-900">{e.student_nom}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-600">{e.student_email}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-600">{formateur?.nom ?? "—"}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-600">{e.course_titre}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtDate(e.paid_at)}</TableCell>
                    <TableCell className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtDate(student?.lastSignInAt ?? null)}</TableCell>
                    <TableCell className="px-5 py-3">
                      {student && (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[student.status]}`}>
                          {statusLabel[student.status]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <Link href={`/communaute/u/${e.user_id}`} target="_blank" className="text-orange-600 hover:underline text-xs font-semibold">
                        Voir profil →
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" asChild className="gap-1">
                          <Link href={`/communaute/u/${e.user_id}`} target="_blank"><Eye size={13} /></Link>
                        </Button>
                        {student?.status !== "actif" && (
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(e.user_id, "actif")} className="gap-1 text-green-600 border-green-200 hover:bg-green-50">
                            Activer
                          </Button>
                        )}
                        {student?.status !== "inactif" && (
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(e.user_id, "inactif")} className="gap-1">
                            Désactiver
                          </Button>
                        )}
                        {student?.status !== "veille" && (
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(e.user_id, "veille")} className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50">
                            Veille
                          </Button>
                        )}
                        {student?.status !== "bloque" && (
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(e.user_id, "bloque")} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                            Bloquer
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => resendAccess(e.user_id)} className="gap-1 text-violet-600 border-violet-200 hover:bg-violet-50">
                          <Mail size={13} /> Accès
                        </Button>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => removeEnrollment(e.id)} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 size={13} /> Inscription
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
