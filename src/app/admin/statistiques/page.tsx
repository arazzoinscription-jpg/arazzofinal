import { BarChart3, Users, Eye, Clock, MousePointerClick, Smartphone, Monitor, AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isFormateur } from "@/lib/roles";
import { avatarSur } from "@/lib/classe/vue";
import { inscritesParmi } from "@/lib/visiteuses/load";
import { comptesParNavigateur, enCeMoment, jourAlger, libellePage, lirePeriode, paquetsDeLecture, personneDe, quiEstVenu, type Visite } from "@/lib/statistiques-visites";
import { VisitsChart } from "./visits-chart";
import { ChoixPeriode, EnCeMoment, ListePersonnes, PiedAnonymes, type Profil } from "./qui-est-venu";

export const metadata = { title: "Statistiques — Admin" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

type Row = Visite;

const COLONNES = "path, source, session_id, user_id, duration_sec, device, created_at";
/** Garde-fou mémoire : au-delà, seules les pages vues les plus récentes sont lues. */
const MAX_LIGNES = 150_000;

/**
 * TOUTES les pages vues depuis `depuis`. La base ne renvoie que 1 000 lignes par demande : on compte d'abord,
 * puis on lit par paquets de 1 000 (8 à la fois). Avant, une seule demande → seulement les 1 000 dernières
 * pages vues (environ une journée) : totaux faux et graphique limité à aujourd'hui.
 */
async function chargerVisites(admin: ReturnType<typeof createAdminClient>, depuis: string): Promise<{ rows: Row[]; erreur: boolean; tronque: boolean }> {
  const { count, error } = await admin.from("page_visits").select("id", { count: "exact", head: true }).gte("created_at", depuis);
  if (error) return { rows: [], erreur: true, tronque: false };
  const total = count ?? 0;
  const debuts = paquetsDeLecture(total, MAX_LIGNES);
  const rows: Row[] = [];
  for (let i = 0; i < debuts.length; i += 8) {
    // eslint-disable-next-line no-await-in-loop
    const lots = await Promise.all(debuts.slice(i, i + 8).map((de) => admin
      .from("page_visits")
      .select(COLONNES)
      .gte("created_at", depuis)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(de, de + 999)));
    for (const lot of lots) if (!lot.error) rows.push(...((lot.data ?? []) as Row[]));
  }
  return { rows, erreur: false, tronque: total > MAX_LIGNES };
}

/** Nom, photo et pastille des personnes vues ; l'équipe d'administration est mise à part (non comptée). */
async function chargerProfils(admin: ReturnType<typeof createAdminClient>, ids: string[]): Promise<{ profils: Map<string, Profil>; equipe: Set<string> }> {
  const profils = new Map<string, Profil>();
  const equipe = new Set<string>();
  const lignes: { id: string; nom: string | null; avatar_url: string | null; role: string | null; roles: string[] | null }[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await admin.from("users").select("id, nom, avatar_url, role, roles").in("id", ids.slice(i, i + 200));
    lignes.push(...((data ?? []) as typeof lignes));
  }
  const inscrites = await inscritesParmi(admin, lignes.map((u) => u.id));
  for (const u of lignes) {
    if (isAdmin(u)) { equipe.add(u.id); continue; }
    profils.set(u.id, {
      nom: u.nom?.trim() || "Sans nom",
      avatar: avatarSur(u.avatar_url),
      badge: isFormateur(u) ? "Formatrice" : inscrites.has(u.id) ? "Élève" : "Visiteuse",
    });
  }
  return { profils, equipe };
}

const SOURCE_LABEL: Record<string, string> = {
  google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo", facebook: "Facebook", instagram: "Instagram",
  tiktok: "TikTok", youtube: "YouTube", whatsapp: "WhatsApp", telegram: "Telegram", twitter: "X / Twitter",
  direct: "Accès direct", other: "Autres sites", internal: "Navigation interne",
};

function fmtDur(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

export default async function AdminStatsPage({ searchParams }: { searchParams: { periode?: string } }) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const periode = lirePeriode(searchParams?.periode);

  const { rows, erreur, tronque } = await chargerVisites(admin, since);

  // Migration 028 non appliquée (table absente) → message d'activation.
  if (erreur) {
    return (
      <div className="px-4 lg:px-8 py-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Statistiques du site</h1>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2"><AlertTriangle size={18} /> Statistiques non encore activées</div>
          <p className="text-sm text-amber-800/90 font-dm">
            Exécutez la migration <strong>028_analytics.sql</strong> dans Supabase → SQL Editor pour créer la table de suivi.
            Le traçage des visites commencera dès qu'elle sera en place.
          </p>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const aujourdhui = jourAlger(now);

  // ── Qui est venu (personnes connectées, reconnues aussi par leur navigateur) ──
  const navigateurs = comptesParNavigateur(rows);
  const ids = [...new Set(rows.map((r) => personneDe(r, navigateurs)).filter((x): x is string => Boolean(x)))];
  const { profils, equipe } = await chargerProfils(admin, ids);
  const { personnes, anonymes } = quiEstVenu(rows, { depuis: now - periode * DAY, exclure: equipe });
  const personnesCour = personnes
    .filter((p) => p.derniereCour)
    .sort((a, b) => (b.derniereCour ?? "").localeCompare(a.derniereCour ?? ""));
  const maintenant = enCeMoment(rows, { maintenant: now, exclure: equipe });
  const nomPeriode = periode === 1 ? "les dernières 24 h" : `les ${periode} derniers jours`;

  // ── Indicateurs ──
  const totalViews = rows.length;
  const sessions = new Set(rows.map((r) => r.session_id ?? r.path));
  const visitors = sessions.size;
  const viewsToday = rows.filter((r) => jourAlger(r.created_at) === aujourdhui).length; // depuis minuit (heure d'Alger)
  const views7d = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * DAY).length;

  // ── Pages : vues + durée moyenne ──
  const pageAgg = new Map<string, { views: number; dur: number; durCount: number }>();
  rows.forEach((r) => {
    const cle = libellePage(r.path); // les profils, cours… regroupés sous un nom lisible
    const a = pageAgg.get(cle) ?? { views: 0, dur: 0, durCount: 0 };
    a.views++;
    if (r.duration_sec && r.duration_sec > 0) { a.dur += r.duration_sec; a.durCount++; }
    pageAgg.set(cle, a);
  });
  const pageRows = [...pageAgg.entries()].map(([path, a]) => ({
    path, views: a.views, avg: a.durCount ? a.dur / a.durCount : 0,
  }));
  const topPages = [...pageRows].sort((x, y) => y.views - x.views).slice(0, 12);
  const longestPages = [...pageRows].filter((p) => p.views >= 3).sort((x, y) => y.avg - x.avg).slice(0, 8);

  // ── Sources d'entrée (hors navigation interne) ──
  const srcAgg = new Map<string, number>();
  rows.forEach((r) => {
    const s = r.source ?? "direct";
    if (s === "internal") return;
    srcAgg.set(s, (srcAgg.get(s) ?? 0) + 1);
  });
  const entries = [...srcAgg.values()].reduce((a, b) => a + b, 0) || 1;
  const sources = [...srcAgg.entries()].map(([s, n]) => ({ s, n, pct: Math.round((n / entries) * 100) })).sort((a, b) => b.n - a.n);

  // ── Durée moyenne de session ──
  const sessDur = new Map<string, number>();
  rows.forEach((r) => {
    const k = r.session_id ?? r.path;
    sessDur.set(k, (sessDur.get(k) ?? 0) + (r.duration_sec ?? 0));
  });
  const durations = [...sessDur.values()];
  const avgSession = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // ── Appareils ──
  const mobile = rows.filter((r) => r.device === "mobile").length;
  const desktop = totalViews - mobile;
  const mobilePct = totalViews ? Math.round((mobile / totalViews) * 100) : 0;

  // ── Série 14 jours (pour le graphique), jour par jour à l'heure d'Alger ──
  const parJour = new Map<string, Row[]>();
  for (const r of rows) {
    const j = jourAlger(r.created_at);
    const l = parJour.get(j);
    if (l) l.push(r); else parJour.set(j, [r]);
  }
  const series: { day: string; visites: number; visiteurs: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const dayRows = parJour.get(jourAlger(d)) ?? [];
    series.push({
      day: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Algiers" }),
      visites: dayRows.length,
      visiteurs: new Set(dayRows.map((r) => r.session_id ?? r.path)).size,
    });
  }

  const card = "bg-white rounded-2xl border border-gray-100 p-5";
  const kpis = [
    { Icon: Eye, label: "Pages vues (30 j)", value: totalViews.toLocaleString("fr-FR") },
    { Icon: Users, label: "Visiteurs (sessions)", value: visitors.toLocaleString("fr-FR") },
    { Icon: MousePointerClick, label: "Vues aujourd'hui", value: viewsToday.toLocaleString("fr-FR") },
    { Icon: Clock, label: "Durée moy. / visite", value: fmtDur(avgSession) },
  ];

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/10 text-orange-600 flex items-center justify-center"><BarChart3 size={18} /></span>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Statistiques du site</h1>
      </div>
      <p className="text-gray-500 mb-5 font-dm">Qui regarde La Cour, qui entre sur le site, d'où viennent les visiteurs et combien de temps ils restent.</p>

      {/* ── Qui est venu ── */}
      <EnCeMoment {...maintenant} profils={profils} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-playfair text-xl font-bold text-gray-900">Qui est venu ?</h2>
        <ChoixPeriode periode={periode} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-3">
        <ListePersonnes
          titre="🏛️ Qui regarde La Cour"
          sousTitre={`Les personnes connectées qui ont ouvert le feed, ${nomPeriode} — la plus récente en haut.`}
          personnes={personnesCour} profils={profils} maintenant={now} cour
          vide="Personne de connecté n'a encore ouvert La Cour sur cette période."
          pied={<PiedAnonymes anonymes={anonymes} cour maintenant={now} />}
        />
        <ListePersonnes
          titre="🚪 Qui entre sur le site"
          sousTitre={`Toutes les personnes connectées venues sur le site, ${nomPeriode}.`}
          personnes={personnes} profils={profils} maintenant={now} cour={false}
          vide="Personne de connecté sur cette période."
          pied={<PiedAnonymes anonymes={anonymes} cour={false} maintenant={now} />}
        />
      </div>
      <p className="text-xs text-gray-400 font-dm mb-8">
        Une visiteuse sans compte n'a pas de nom ; dès qu'elle se connecte, ses visites d'avant (même téléphone) lui sont rattachées.
        Votre équipe d'administration n'est pas comptée. Les noms sont enregistrés depuis le 18 octobre 2026.
      </p>

      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">Vue d'ensemble — 30 derniers jours</h2>
      {tronque ? <p className="text-xs text-amber-700 font-dm -mt-2 mb-4">Plus de 150 000 pages vues en 30 jours : seules les plus récentes sont comptées ici.</p> : null}
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className={card}>
            <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center mb-3"><k.Icon size={20} /></span>
            <div className="text-2xl font-bold font-playfair text-gray-900 tabular-nums">{k.value}</div>
            <div className="text-xs text-gray-500 font-dm mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Graphique */}
      <div className={`${card} mb-6`}>
        <h2 className="font-semibold text-gray-900 font-dm mb-4">Évolution sur 14 jours</h2>
        <VisitsChart data={series} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pages les plus visitées */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 font-dm mb-4">Pages les plus visitées</h2>
          {topPages.length === 0 ? <p className="text-sm text-gray-400 font-dm">Aucune donnée pour l'instant.</p> : (
            <ul className="space-y-2">
              {topPages.map((p) => {
                const max = topPages[0].views || 1;
                return (
                  <li key={p.path} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 font-dm w-40 truncate" title={p.path}>{p.path}</span>
                    <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <span className="block h-full bg-orange-DEFAULT rounded-full" style={{ width: `${(p.views / max) * 100}%` }} />
                    </span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums w-12 text-end">{p.views}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sources d'entrée */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 font-dm mb-4">Comment les visiteurs arrivent</h2>
          {sources.length === 0 ? <p className="text-sm text-gray-400 font-dm">Aucune donnée pour l'instant.</p> : (
            <ul className="space-y-2.5">
              {sources.map((s) => (
                <li key={s.s} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 font-dm w-32">{SOURCE_LABEL[s.s] ?? s.s}</span>
                  <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <span className="block h-full bg-violet-DEFAULT rounded-full" style={{ width: `${s.pct}%` }} />
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums w-16 text-end">{s.n} · {s.pct}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Temps passé : pages où l'on reste le plus */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 font-dm mb-4">Pages où l'on reste le plus longtemps</h2>
          {longestPages.length === 0 ? <p className="text-sm text-gray-400 font-dm">Pas assez de données (durées en cours de collecte).</p> : (
            <ul className="space-y-2">
              {longestPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700 font-dm truncate" title={p.path}>{p.path}</span>
                  <span className="text-sm font-semibold text-orange-600 tabular-nums whitespace-nowrap">{fmtDur(p.avg)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Appareils + résumé */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 font-dm mb-4">Appareils</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center rounded-xl bg-gray-50 p-4">
              <Smartphone size={22} className="mx-auto text-violet-700 mb-1" />
              <div className="text-2xl font-bold font-playfair text-gray-900 tabular-nums">{mobilePct}%</div>
              <div className="text-xs text-gray-500 font-dm">Mobile · {mobile}</div>
            </div>
            <div className="flex-1 text-center rounded-xl bg-gray-50 p-4">
              <Monitor size={22} className="mx-auto text-orange-600 mb-1" />
              <div className="text-2xl font-bold font-playfair text-gray-900 tabular-nums">{100 - mobilePct}%</div>
              <div className="text-xs text-gray-500 font-dm">Ordinateur · {desktop}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-600 font-dm space-y-1">
            <div className="flex justify-between"><span>Vues 7 jours</span><span className="font-semibold tabular-nums">{views7d.toLocaleString("fr-FR")}</span></div>
            <div className="flex justify-between"><span>Pages distinctes visitées</span><span className="font-semibold tabular-nums">{pageAgg.size}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
