"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Play, X, ChevronUp, ChevronDown, Clock, PlusCircle, Loader2, Film } from "lucide-react";
import { filtrerLecons, type LeconBiblio } from "@/lib/lecons/bibliotheque";
import { resolveEmbed } from "@/components/player/bunny-player";
import { toast } from "@/components/ui/toast";
import { creerCoursDepuisLecons } from "./actions";

const carte = "bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10";

/** La liste « Les leçons » : chercher, regarder la vidéo, cocher, puis créer un cours avec les leçons cochées. */
export function BibliothequeLecons({ lecons }: { lecons: LeconBiblio[] }) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [coursId, setCoursId] = useState("");
  const [avecVideo, setAvecVideo] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [apercu, setApercu] = useState<LeconBiblio | null>(null);
  const [composer, setComposer] = useState(false);
  const [titre, setTitre] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const parId = useMemo(() => new Map(lecons.map((l) => [l.id, l])), [lecons]);
  const cours = useMemo(() => {
    const vus = new Map<string, string>();
    for (const l of lecons) if (!vus.has(l.coursId)) vus.set(l.coursId, l.coursTitre);
    return [...vus].map(([id, titre]) => ({ id, titre }));
  }, [lecons]);
  const visibles = useMemo(() => filtrerLecons(lecons, { recherche, coursId, avecVideo }), [lecons, recherche, coursId, avecVideo]);
  const groupes = useMemo(() => {
    const g = new Map<string, LeconBiblio[]>();
    for (const l of visibles) g.set(l.coursId, [...(g.get(l.coursId) ?? []), l]);
    return [...g.values()];
  }, [visibles]);

  const coche = (id: string) => setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const cocherTout = (ids: string[], oui: boolean) =>
    setSelection((s) => (oui ? [...s, ...ids.filter((id) => !s.includes(id))] : s.filter((id) => !ids.includes(id))));
  const deplacer = (i: number, d: -1 | 1) => setSelection((s) => {
    const j = i + d;
    if (j < 0 || j >= s.length) return s;
    const n = [...s];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  async function creer() {
    setEnvoi(true);
    const r = await creerCoursDepuisLecons({ titre, lessonIds: selection });
    if (!r.ok) {
      setEnvoi(false);
      toast(r.error, "error");
      return;
    }
    toast("Cours créé (brouillon) : complétez-le puis publiez-le.", "success");
    router.push(`/formateur/cours/${r.courseId}/edit`);
  }

  return (
    <div className="relative">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Les leçons</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          {lecons.length} leçons dans {cours.length} cours. Cochez les leçons voulues, puis créez un cours avec.
        </p>
      </div>

      {/* Recherche et filtres */}
      <div className={`${carte} p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3`}>
        <label className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher une leçon, un cours, un chapitre…"
            className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/[0.06] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-400" />
        </label>
        <select value={coursId} onChange={(e) => setCoursId(e.target.value)}
          className="sm:w-64 py-2.5 px-3 rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-[#15102b] text-sm text-gray-900 dark:text-white">
          <option value="">Tous les cours</option>
          {cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-white/80 whitespace-nowrap cursor-pointer">
          <input type="checkbox" checked={avecVideo} onChange={(e) => setAvecVideo(e.target.checked)} className="w-4 h-4 accent-orange-600" />
          Avec vidéo seulement
        </label>
      </div>

      {groupes.length === 0 ? (
        <div className={`${carte} text-center py-16 text-gray-400`}>Aucune leçon ne correspond à la recherche.</div>
      ) : (
        <div className="space-y-6">
          {groupes.map((g) => {
            const ids = g.map((l) => l.id);
            const toutes = ids.every((id) => selection.includes(id));
            return (
              <section key={g[0].coursId} className={`${carte} overflow-hidden`}>
                <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-cream-200 dark:border-white/10 bg-cream-50 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate">{g[0].coursTitre}</h2>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${g[0].coursPublie ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {g[0].coursPublie ? "● Publié" : "○ Brouillon"}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{g.length} leçon{g.length > 1 ? "s" : ""}</span>
                  </div>
                  <button type="button" onClick={() => cocherTout(ids, !toutes)} className="text-sm font-semibold text-orange-600 hover:underline">
                    {toutes ? "Tout décocher" : "Tout cocher"}
                  </button>
                </header>
                <ul className="divide-y divide-cream-100 dark:divide-white/5">
                  {g.map((l) => {
                    const rang = selection.indexOf(l.id);
                    return (
                      <li key={l.id} className={`flex items-center gap-3 px-4 py-3 ${rang >= 0 ? "bg-orange-50/70 dark:bg-orange-500/10" : ""}`}>
                        <input type="checkbox" checked={rang >= 0} onChange={() => coche(l.id)} aria-label={`Sélectionner « ${l.titre} »`}
                          className="w-5 h-5 shrink-0 accent-orange-600 cursor-pointer" />
                        <button type="button" onClick={() => l.video && setApercu(l)} disabled={!l.video}
                          aria-label={l.video ? `Voir la vidéo « ${l.titre} »` : "Pas de vidéo"}
                          className="relative w-24 sm:w-28 aspect-video shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-violet-100 to-orange-100 dark:from-violet-900/40 dark:to-orange-900/30 disabled:cursor-default group">
                          {l.miniature ? (
                            <img src={l.miniature} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          ) : null}
                          <span className="absolute inset-0 flex items-center justify-center">
                            {l.video ? (
                              <span className="w-8 h-8 rounded-full bg-black/45 group-hover:bg-orange-600 flex items-center justify-center transition-colors">
                                <Play size={14} className="text-white fill-white ms-0.5" />
                              </span>
                            ) : <Film size={18} className="text-gray-400" />}
                          </span>
                        </button>
                        <button type="button" onClick={() => coche(l.id)} className="flex-1 min-w-0 text-start">
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-2">{l.titre}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                            {l.chapitre ? <span className="truncate">{l.chapitre}</span> : null}
                            {l.duree ? <span className="inline-flex items-center gap-1"><Clock size={11} />{l.duree} min</span> : null}
                            {!l.video ? <span className="text-gray-400 italic">Pas de vidéo</span> : null}
                          </p>
                        </button>
                        {rang >= 0 ? (
                          <span className="w-7 h-7 shrink-0 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center" title="Place dans le nouveau cours">
                            {rang + 1}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Barre de la sélection (reste visible en bas de l'écran) */}
      {selection.length > 0 ? (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-violet-900 text-white px-4 py-3 shadow-xl">
            <span className="font-semibold">{selection.length} leçon{selection.length > 1 ? "s" : ""} sélectionnée{selection.length > 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSelection([])} className="text-sm text-white/70 hover:text-white px-3 py-2">Vider</button>
              <button type="button" onClick={() => setComposer(true)}
                className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 px-5 py-2.5 rounded-xl font-semibold transition-colors">
                <PlusCircle size={18} /> Créer le cours
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Aperçu de la vidéo */}
      {apercu ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setApercu(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-2 text-white">
              <p className="font-semibold truncate">{apercu.titre} <span className="text-white/50 font-normal">· {apercu.coursTitre}</span></p>
              <button type="button" onClick={() => setApercu(null)} aria-label="Fermer" className="p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
            </div>
            {(() => {
              const { src } = resolveEmbed(apercu.video ?? "");
              return src ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe src={src} title={apercu.titre} className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                </div>
              ) : <div className="rounded-xl bg-white p-8 text-center text-gray-500">Cette vidéo ne peut pas être lue ici.</div>;
            })()}
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => coche(apercu.id)}
                className="bg-orange-DEFAULT hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                {selection.includes(apercu.id) ? "Retirer de la sélection" : "Ajouter à la sélection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Créer le cours avec la sélection */}
      {composer ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !envoi && setComposer(false)}>
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-[#15102b] rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white">Nouveau cours</h2>
              <button type="button" onClick={() => setComposer(false)} disabled={envoi} aria-label="Fermer" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X size={20} /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5">Titre du cours *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus placeholder="Ex. Robe d'été — les bases"
              className="w-full px-3 py-2.5 rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:border-orange-400" />

            <p className="text-sm font-medium text-gray-700 dark:text-white/80 mt-5 mb-2">Ordre des leçons ({selection.length})</p>
            <ol className="space-y-1.5">
              {selection.map((id, i) => {
                const l = parId.get(id);
                if (!l) return null;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-xl border border-cream-200 dark:border-white/10 px-3 py-2">
                    <span className="w-6 text-center text-xs font-bold text-orange-600">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{l.titre}</p>
                      <p className="text-[11px] text-gray-400 truncate">{l.coursTitre}</p>
                    </div>
                    <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter" className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronUp size={16} /></button>
                    <button type="button" onClick={() => deplacer(i, 1)} disabled={i === selection.length - 1} aria-label="Descendre" className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronDown size={16} /></button>
                    <button type="button" onClick={() => coche(id)} aria-label="Retirer" className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-white/10"><X size={16} /></button>
                  </li>
                );
              })}
            </ol>

            <p className="text-xs text-gray-500 dark:text-white/50 mt-4 leading-relaxed">
              Les leçons sont <strong>copiées</strong> (même vidéo, même devoir) dans un nouveau cours en <strong>brouillon</strong> ;
              les cours d'origine ne changent pas. Vous pourrez ensuite compléter le cours (description, prix, image),
              le publier, puis l'ajouter à une formation.
            </p>
            <button type="button" onClick={creer} disabled={envoi || titre.trim().length < 2 || selection.length === 0}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
              {envoi ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
              {envoi ? "Création…" : `Créer le cours avec ${selection.length} leçon${selection.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
