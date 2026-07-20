"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scissors, Sparkles, Film, Search, Wand2, Bot, FolderTree, Server,
  CircleDot, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { StudioAPI, mediaThumb, ENGINE_URL, type Reel } from "@/lib/studio-api";

type Status = "loading" | "on" | "off";

const NAV = [
  { key: "reels", href: "/studio/reels", label: "Les Reels", desc: "Bibliothèque, dossiers, montage", icon: Film, soon: false },
  { key: "analyze", href: "/studio/analyze", label: "Analyse du cours", desc: "Timeline colorée, validation", icon: Wand2, soon: false },
  { key: "search", href: "", label: "Recherche IA", desc: "Trouver un passage par sujet", icon: Search, soon: true },
  { key: "agents", href: "/studio/agents", label: "AI Director", desc: "Chef d'orchestre & agents", icon: Bot, soon: false },
  { key: "pillars", href: "/studio/reels", label: "Dossiers", desc: "Angle · Technique · Source", icon: FolderTree, soon: false },
] as const;

export default function StudioPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [count, setCount] = useState(0);
  const [reels, setReels] = useState<Reel[]>([]);

  async function load() {
    setStatus("loading");
    try {
      const h = await StudioAPI.health();
      setCount(h.reels);
      setStatus("on");
      const r = await StudioAPI.reels();
      setReels(r.reels.slice(0, 8));
    } catch {
      setStatus("off");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      {/* En-tête */}
      <header className="flex flex-wrap items-center gap-4 border-b border-dashed border-border pb-7">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary/10 text-secondary">
          <Scissors className="size-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Arazzo <em className="not-italic text-primary">Studio</em>
          </h1>
          <p className="text-sm text-muted-foreground">
            Assistant IA de montage — module du site Formation.
          </p>
        </div>
        <EnginePill status={status} onRetry={() => void load()} />
      </header>

      {status === "off" ? (
        <EngineOff />
      ) : (
        <>
          {/* Résumé */}
          <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Reels" value={status === "loading" ? "…" : String(count)} icon={Film} />
            <Stat label="Moteur" value="local" icon={Server} />
            <Stat label="Traitement" value="0 € · sur ton PC" icon={Sparkles} />
            <Stat label="Vidéos" value="jamais modifiées" icon={CircleDot} />
          </section>

          {/* Aperçu des reels */}
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Tes derniers Reels</h2>
            {reels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {status === "loading" ? "Chargement…" : "Aucun reel pour l'instant."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {reels.map((r) => (
                  <ReelCard key={r.id} reel={r} />
                ))}
              </div>
            )}
          </section>

          {/* Carte du module */}
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Le Studio</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NAV.map(({ key, ...n }) => (
                <NavCard key={key} {...n} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EnginePill({ status, onRetry }: { status: Status; onRetry: () => void }) {
  const map = {
    loading: { c: "border-border text-muted-foreground", t: "Connexion…" },
    on: { c: "border-emerald-500/40 text-emerald-600", t: "Engine connecté" },
    off: { c: "border-destructive/40 text-destructive", t: "Engine hors ligne" },
  }[status];
  return (
    <button
      onClick={onRetry}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium ${map.c}`}
    >
      <CircleDot className="size-3.5" />
      {map.t}
      {status === "off" && <RefreshCw className="size-3.5" />}
    </button>
  );
}

function EngineOff() {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h2 className="text-xl font-bold">Démarre ton Arazzo Engine</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Le Studio dialogue avec ton moteur local (Python). Lance-le sur ton PC, puis reviens :
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-secondary/5 p-4 text-sm text-secondary">
        <code>cd arazzo-ai-studio{"\n"}python app.py</code>
      </pre>
      <p className="mt-3 text-xs text-muted-foreground">
        En attente sur <code className="text-secondary">{ENGINE_URL}</code>. Rien ne quitte ton ordinateur.
      </p>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Film }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="size-4 text-muted-foreground" />
      <div className="mt-2 text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ReelCard({ reel }: { reel: Reel }) {
  const score = reel.ai_score ?? reel.score;
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaThumb(reel.id)}
        alt=""
        className="aspect-[9/16] w-full object-cover"
        onError={(e) => ((e.currentTarget.style.opacity = "0.15"))}
      />
      <div className="p-3">
        <div className="line-clamp-2 min-h-[2.4rem] text-[13px] font-medium">
          {(reel.ai_badges || []).join(" ")} {reel.best_title || reel.category || "مقطع"}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="rounded-full bg-primary px-2 py-0.5 font-mono font-semibold text-primary-foreground">
            {score ?? "-"}
          </span>
          <span className="tabular-nums">{Math.round(reel.duration || 0)}s</span>
        </div>
      </div>
    </div>
  );
}

function NavCard({
  label,
  desc,
  href,
  icon: Icon,
  soon,
}: {
  label: string;
  desc: string;
  href?: string;
  icon: typeof Film;
  soon?: boolean;
}) {
  const inner = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/10 text-secondary">
        <Icon className="size-5" />
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2 font-semibold">
          {label}
          {soon ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              bientôt
            </span>
          ) : (
            <ArrowUpRight className="size-4 text-muted-foreground" />
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </>
  );
  const cls =
    "relative flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition";
  if (soon || !href) return <div className={`${cls} opacity-70`}>{inner}</div>;
  return (
    <Link href={href} className={`${cls} hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-sm`}>
      {inner}
    </Link>
  );
}
