"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radio, Square, Copy, Check, Globe, Users, Link2, Loader2 } from "lucide-react";
import { startLive, stopLive } from "./actions";
import { toast } from "@/components/ui/toast";

export interface LiveGroup { id: string; name: string }
export interface CurrentLive { id: string; titre: string; audience: string; shareUrl: string }

const field = "w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";

export function GoLivePanel({ groups, current }: { groups: LiveGroup[]; current: CurrentLive | null }) {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<"public" | "group" | "link">("public");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [live, setLive] = useState<CurrentLive | null>(current);
  const [copied, setCopied] = useState(false);

  function go() {
    if (!titre.trim() || !url.trim()) { toast("Ajoutez un titre et le lien du direct.", "error"); return; }
    if (audience === "group" && !groupId) { toast("Choisissez un groupe.", "error"); return; }
    start(async () => {
      const res = await startLive({ titre: titre.trim(), live_url: url.trim(), audience, group_id: audience === "group" ? groupId : null });
      if (res.ok) { setLive({ id: res.id, titre: titre.trim(), audience, shareUrl: res.shareUrl }); toast("🔴 Vous êtes EN DIRECT !", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }
  function stop() {
    if (!live) return;
    start(async () => {
      const res = await stopLive(live.id);
      if (res.ok) { setLive(null); toast("Direct terminé.", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }
  function copy() {
    if (!live) return;
    navigator.clipboard?.writeText(live.shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  if (live) {
    const audLabel = live.audience === "public" ? "Tout le monde" : live.audience === "group" ? "Un groupe" : "Lien privé";
    return (
      <div className="rounded-2xl border-2 border-red-300 dark:border-red-500/40 bg-red-50/70 dark:bg-red-500/10 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
            <Radio size={13} /> EN DIRECT
          </span>
          <span className="text-sm text-gray-600 dark:text-white/60 font-dm">Audience : <strong>{audLabel}</strong></span>
        </div>
        <p className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-3">{live.titre}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copy} className="inline-flex items-center gap-1.5 bg-white dark:bg-white/10 border border-cream-200 dark:border-white/15 text-gray-700 dark:text-white px-3.5 py-2 rounded-xl text-sm font-semibold">
            {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />} Copier le lien à partager
          </button>
          <button onClick={stop} disabled={pending}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Square size={14} />} Arrêter le direct
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-white/50 mt-2 break-all font-mono">{live.shareUrl}</p>
      </div>
    );
  }

  const AUD = [
    { key: "public" as const, icon: Globe, label: "Tout le monde", desc: "Toutes les élèves" },
    { key: "group" as const, icon: Users, label: "Un groupe", desc: "Seulement ce groupe" },
    { key: "link" as const, icon: Link2, label: "Lien privé", desc: "Qui a le lien seulement" },
  ];

  return (
    <div className="rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-red-600 text-white grid place-items-center"><Radio size={18} /></span>
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white">Passer en direct</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-white/50 font-dm -mt-2">
        Lancez un live (YouTube, Facebook, TikTok ou Instagram) depuis votre téléphone, collez le lien ici, choisissez qui peut regarder.
        YouTube et Facebook s'affichent <strong>dans le site</strong> ; TikTok et Instagram ouvrent un bouton vers l'appli.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">Titre du direct</label>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} className={field} placeholder="Ex. Atelier couture en direct" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">Lien du direct (YouTube / Facebook / TikTok / Instagram)</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" className={field} placeholder="https://youtube.com/live/…  ou  tiktok.com/@vous/live" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-2">Qui peut voir le direct ?</label>
        <div className="grid grid-cols-3 gap-2">
          {AUD.map((a) => {
            const on = audience === a.key;
            return (
              <button key={a.key} type="button" onClick={() => setAudience(a.key)}
                className={`text-start rounded-xl border-2 p-3 transition-all ${on ? "border-violet-DEFAULT bg-violet-50 dark:bg-violet-500/10" : "border-cream-200 dark:border-white/10 hover:border-violet-300"}`}>
                <a.icon size={18} className="text-violet-600 dark:text-violet-300 mb-1" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{a.label}</p>
                <p className="text-[11px] text-gray-500 dark:text-white/50 leading-tight">{a.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {audience === "group" && (
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">Groupe</label>
          {groups.length === 0 ? (
            <p className="text-sm text-orange-600">Aucun groupe disponible. Créez un groupe dans la communauté d'abord.</p>
          ) : (
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={field}>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>
      )}

      <button onClick={go} disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 transition-colors">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />} Démarrer le direct
      </button>
    </div>
  );
}
