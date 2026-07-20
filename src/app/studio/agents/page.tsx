"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { StudioAPI, type Agent, type CoachResp, type PipelineResp } from "@/lib/studio-api";

export default function StudioAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [coach, setCoach] = useState<CoachResp | null>(null);
  const [pipe, setPipe] = useState<PipelineResp | null>(null);
  const [err, setErr] = useState(false);

  async function load() {
    try {
      const [a, c, p] = await Promise.all([
        StudioAPI.agents(),
        StudioAPI.agentsCoach(),
        StudioAPI.agentsPipeline(),
      ]);
      setAgents(a.agents);
      setCoach(c);
      setPipe(p);
    } catch {
      setErr(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(id: string, on: boolean) {
    await StudioAPI.setAgentEnabled(id, on);
    setAgents((xs) => xs.map((x) => (x.id === id ? { ...x, enabled: on } : x)));
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-10">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/studio" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <Bot className="size-5 text-secondary" />
        <h1 className="text-2xl font-bold">AI Director</h1>
        {pipe && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {pipe.agents_actifs}/{pipe.agents_total} agents actifs
          </span>
        )}
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
          Engine hors ligne — lance <code>python app.py</code>.
        </p>
      ) : (
        <>
          {/* Pipeline */}
          {pipe && (
            <div className="mb-5 rounded-xl border border-border bg-card p-4">
              <div className="mb-2 text-xs font-semibold text-secondary">Chef d&apos;orchestre — pipeline de décision</div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                {pipe.pipeline.map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="rounded bg-secondary/10 px-2 py-0.5 text-muted-foreground">{i + 1}. {s}</span>
                    {i < pipe.pipeline.length - 1 && <span className="text-primary">→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Coach */}
          {coach && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <div className="mb-2 text-sm font-semibold">🎓 AI Coach — recommandations</div>
              <ul className="space-y-1 text-sm">
                {coach.recommendations.map((r, i) => (
                  <li key={i} className={
                    r.level === "warn" ? "text-amber-600" :
                    r.level === "good" ? "text-emerald-600" : "text-muted-foreground"
                  }>
                    • {r.msg}
                  </li>
                ))}
              </ul>
              {coach.note && <p className="mt-2 text-xs text-muted-foreground">{coach.note}</p>}
            </div>
          )}

          {/* Agents */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <AgentCard key={a.id} a={a} onToggle={(on) => toggle(a.id, on)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AgentCard({ a, onToggle }: { a: Agent; onToggle: (on: boolean) => void }) {
  const conf = Math.round((a.confidence || 0) * 100);
  const st = a.stats || {};
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${a.enabled ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{a.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{a.label}</div>
          <div className="text-[11px] text-muted-foreground">état : {a.state}</div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" checked={a.enabled} onChange={(e) => onToggle(e.target.checked)} className="peer sr-only" />
          <span className="h-5 w-9 rounded-full bg-border transition peer-checked:bg-primary" />
          <span className="absolute left-0.5 size-4 rounded-full bg-white transition peer-checked:translate-x-4" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric v={String(a.weight)} l="poids" />
        <Metric v={`${conf}%`} l="confiance" />
        <Metric v={String(st.calls ?? 0)} l="analyses" />
        <Metric v={st.avg == null ? "–" : String(st.avg)} l="moyenne" />
      </div>
    </div>
  );
}

function Metric({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-lg bg-secondary/5 py-1.5">
      <div className="font-mono text-sm font-semibold text-primary">{v}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{l}</div>
    </div>
  );
}
