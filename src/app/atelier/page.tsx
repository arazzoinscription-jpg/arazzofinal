import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Mail, Bell, Plus, Download, Lock, Sparkles, CheckCircle2, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/atelier/Sidebar";
import { StatCard } from "@/components/atelier/StatCard";
import { ActivityChart } from "@/components/atelier/ActivityChart";
import { DonutChart } from "@/components/atelier/DonutChart";
import { OrderList } from "@/components/atelier/OrderList";
import { TeamSection } from "@/components/atelier/TeamSection";
import { TimeTracker } from "@/components/atelier/TimeTracker";
import { CoinShootingCard } from "@/components/atelier/CoinShootingCard";

export const metadata = { title: "Atelier — Tableau de bord" };
export const dynamic = "force-dynamic";

type ReqCourse = { id: string; titre_fr: string; slug: string; total: number; done: number; ok: boolean };

export default async function AtelierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/atelier");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isStaff = ["formateur", "admin", "patronniste"].includes(prof?.role ?? "");

  // Cours requis pour débloquer l'Atelier (migration 027). Résilient si non appliquée.
  const admin = createAdminClient();
  const { data: reqRaw } = await admin
    .from("courses")
    .select("id, titre_fr, slug, chapters(lessons(id))")
    .eq("atelier_required", true)
    .eq("published", true);

  const { data: enr } = await supabase.from("enrollments").select("course_id").eq("user_id", user.id);
  const enrolled = new Set((enr ?? []).map((e) => e.course_id));
  const { data: prog } = await supabase.from("progress").select("lesson_id").eq("user_id", user.id);
  const doneLessons = new Set((prog ?? []).map((p) => p.lesson_id));

  const required: ReqCourse[] = ((reqRaw as any[]) ?? []).map((c) => {
    const lessons: { id: string }[] = (c.chapters ?? []).flatMap((ch: any) => ch.lessons ?? []);
    const total = lessons.length;
    const done = lessons.filter((l) => doneLessons.has(l.id)).length;
    const ok = enrolled.has(c.id) && total > 0 && done === total;
    return { id: c.id, titre_fr: c.titre_fr, slug: c.slug, total, done, ok };
  });

  const completedCount = required.filter((r) => r.ok).length;
  const unlocked = required.length > 0 && completedCount === required.length;
  const access = isStaff || unlocked;

  if (!access) {
    return <AtelierLocked required={required} completedCount={completedCount} />;
  }

  return (
    <div className="min-h-screen bg-[#faf7ff]">
      <Sidebar />

      <div className="lg:ml-60 min-w-0">
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-[#faf7ff]/80 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-md mx-auto relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher une commande..."
              className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-14 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B21C8]/30 shadow-sm"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6B21C8] transition-colors">
              <Mail size={18} />
            </button>
            <button className="relative w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6B21C8] transition-colors">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-2.5 pl-1">
              <span className="w-9 h-9 rounded-full bg-[#6B21C8] text-white text-sm font-semibold flex items-center justify-center">AA</span>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-[#1a1a1a]">Atelier Arazzo</p>
                <p className="text-xs text-gray-400">contact@arazzo.shop</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Contenu ── */}
        <main className="px-4 lg:px-8 pb-10 pt-2 space-y-6">
          {/* Titre + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#1a1a1a]">Tableau de bord</h1>
              <p className="text-gray-500 mt-1">Gérez vos commandes et votre atelier avec facilité.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 bg-[#6B21C8] hover:bg-[#5a1aad] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
                <Plus size={16} /> Nouvelle Commande
              </button>
              <button className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Download size={16} /> Importer
              </button>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Commandes" value={38} trend="Hausse ce mois" highlighted />
            <StatCard title="Commandes Livrées" value={15} trend="Hausse ce mois" />
            <StatCard title="En Cours" value={19} trend="Hausse ce mois" />
            <StatCard title="En Attente" value={4} trend="En discussion" />
          </div>

          {/* Activité + Essayages */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3"><ActivityChart /></div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                <h3 className="font-bold text-lg text-[#1a1a1a] mb-4">Essayages</h3>
                <div className="rounded-xl bg-[#faf7ff] border border-[#ede9fe] p-4">
                  <p className="text-sm font-semibold text-[#1a1a1a]">Essayage avec Mme Karima</p>
                  <p className="text-xs text-gray-400 mt-1">10h00 — 11h30</p>
                  <button className="mt-4 w-full bg-[#1e0a3c] hover:bg-[#2a0f52] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    Rejoindre
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Équipe + Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3"><TeamSection /></div>
            <div className="lg:col-span-2"><DonutChart /></div>
          </div>

          {/* Commandes + Coin Shooting + Minuterie */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            <div className="lg:col-span-4"><OrderList /></div>
            <div className="lg:col-span-3"><CoinShootingCard /></div>
            <div className="lg:col-span-3"><TimeTracker /></div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Écran « récompense à débloquer » quand l'élève n'a pas terminé les cours requis. */
function AtelierLocked({ required, completedCount }: { required: ReqCourse[]; completedCount: number }) {
  const total = required.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-cream-DEFAULT flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b0c3c] via-violet-900 to-[#2a1245] text-white p-8 sm:p-10 shadow-[0_34px_80px_-34px_rgba(43,18,69,0.8)] ring-1 ring-white/10">
          <div aria-hidden className="absolute -top-20 end-[-4rem] w-72 h-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/15 mb-5">
              <Lock size={26} className="text-orange-300" />
            </span>
            <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.28em] uppercase text-orange-300 mb-2">
              <Sparkles size={13} /> Récompense
            </span>
            <h1 className="font-playfair text-3xl font-bold leading-tight">Débloquez votre Atelier 🎁</h1>
            <p className="text-violet-200/80 font-dm mt-3">
              {total === 0
                ? "L'accès à l'Atelier sera bientôt disponible. Vos formatrices définissent actuellement les cours à terminer."
                : "Terminez les cours sélectionnés par votre formatrice pour accéder au tableau de bord Atelier (gestion de vos commandes et de votre activité)."}
            </p>

            {total > 0 && (
              <>
                {/* Progression */}
                <div className="mt-7">
                  <div className="flex items-center justify-between text-sm font-dm mb-1.5">
                    <span className="text-white/70">{completedCount}/{total} cours terminés</span>
                    <span className="font-mono text-orange-300">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-DEFAULT to-orange-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Liste des cours requis */}
                <div className="mt-6 space-y-2">
                  {required.map((c) => (
                    <Link key={c.id} href={`/formations/${c.slug}`}
                      className="flex items-center gap-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/10 px-4 py-3 transition-colors">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${c.ok ? "bg-green-500 text-white" : "bg-white/10 text-white/50"}`}>
                        {c.ok ? <CheckCircle2 size={15} /> : <span className="text-[11px] font-mono">{c.done}/{c.total || "—"}</span>}
                      </span>
                      <span className={`flex-1 min-w-0 truncate text-sm font-dm ${c.ok ? "text-white/60 line-through" : "text-white"}`}>{c.titre_fr}</span>
                      {!c.ok && <ArrowUpRight size={16} className="text-white/40 flex-shrink-0" />}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <Link href="/dashboard" className="inline-flex items-center gap-2 mt-8 bg-orange-DEFAULT hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold font-dm transition-colors">
              Continuer mes cours
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
