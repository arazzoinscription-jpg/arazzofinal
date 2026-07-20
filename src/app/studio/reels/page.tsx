"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import {
  StudioAPI, mediaThumb, type Reel, type Cat,
} from "@/lib/studio-api";

type Axis = "pillar" | "rubric" | "source";

const AXES: { key: Axis; label: string }[] = [
  { key: "pillar", label: "🎭 Angle" },
  { key: "rubric", label: "🧵 Technique" },
  { key: "source", label: "📼 Source" },
];

function srcShort(s?: string) {
  if (!s) return "—";
  const base = s.replace(/\.(mp4|mov|mkv|webm)$/i, "").replace(/_(mp4|mov|MOV|MP4)$/, "");
  return base.length > 20 ? base.slice(0, 20) + "…" : base;
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function StudioReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [axis, setAxis] = useState<Axis>("pillar");
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cur, setCur] = useState("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState(false);

  // charge les reels une fois
  useEffect(() => {
    StudioAPI.reels()
      .then((r) => setReels(r.reels))
      .catch(() => setErr(true));
  }, []);

  // (re)charge la taxonomie de l'axe courant
  useEffect(() => {
    setCur("all");
    if (axis === "pillar") {
      StudioAPI.pillars().then((p) => {
        setCats(p.pillars);
        setCounts(p.counts);
      }).catch(() => {});
    } else if (axis === "rubric") {
      StudioAPI.rubrics().then((p) => {
        setCats(p.rubrics);
        setCounts(p.counts);
      }).catch(() => {});
    } else {
      // axe SOURCE : dérivé côté client des source_video distincts
      const m: Record<string, number> = {};
      reels.forEach((r) => {
        const k = r.source_video || "?";
        m[k] = (m[k] || 0) + 1;
      });
      setCats(Object.keys(m).sort().map((k) => ({ key: k, emoji: "📼", label: srcShort(k) })));
      setCounts(m);
    }
  }, [axis, reels]);

  const field: keyof Reel = axis === "source" ? "source_video" : axis;

  const list = useMemo(() => {
    let l = reels;
    if (cur !== "all") l = l.filter((r) => (r[field] as string) === cur);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      l = l.filter((r) => (r.best_title || r.category || "").toLowerCase().includes(t));
    }
    return l;
  }, [reels, cur, q, field]);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/studio" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Les Reels</h1>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">{reels.length} reels</span>
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
          Engine hors ligne — lance <code>python app.py</code> puis recharge.
        </p>
      ) : (
        <>
          {/* Recherche par titre */}
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer par titre…"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>

          {/* Axe de classement */}
          <div className="mb-3 flex gap-2">
            {AXES.map((a) => (
              <button
                key={a.key}
                onClick={() => setAxis(a.key)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  axis === a.key
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Dossiers */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Chip active={cur === "all"} onClick={() => setCur("all")} label="📁 Tous" n={reels.length} />
            {cats.map((c) => (
              <Chip
                key={c.key}
                active={cur === c.key}
                onClick={() => setCur(c.key)}
                label={`${c.emoji} ${c.label}`}
                n={counts[c.key] || 0}
              />
            ))}
          </div>

          {/* Grille */}
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun reel dans ce dossier.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((r) => (
                <ReelCard key={r.id} reel={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, n }: { active: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-primary bg-primary font-semibold text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label} <b className="opacity-70">{n}</b>
    </button>
  );
}

function ReelCard({ reel }: { reel: Reel }) {
  const score = reel.ai_score ?? reel.score;
  return (
    <Link
      href={`/studio/editor/${reel.id}`}
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-md"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaThumb(reel.id)}
        alt=""
        className="aspect-[9/16] w-full object-cover"
        onError={(e) => (e.currentTarget.style.opacity = "0.15")}
      />
      <div className="p-3">
        <div className="line-clamp-2 min-h-[2.4rem] text-[13px] font-medium">
          {(reel.ai_badges || []).join(" ")} {reel.best_title || reel.category || "مقطع"}
        </div>
        <div className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">
          🎬 {srcShort(reel.source_video)} · 📅 {fmtDate(reel.created_date)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="rounded-full bg-primary px-2 py-0.5 font-mono font-semibold text-primary-foreground">
            {score ?? "-"}
          </span>
          <span className="tabular-nums">{Math.round(reel.duration || 0)}s</span>
        </div>
      </div>
    </Link>
  );
}
