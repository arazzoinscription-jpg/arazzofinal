import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Package, Plus, BookOpen, Users, Wallet, Scissors, Film, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateEnrollments } from "@/lib/formateur-stats";
import { Reveal } from "@/components/ui/reveal";
import { ATELIER_CARD } from "@/app/dashboard/dash-header";
import { FormateurHeroCTA } from "./hero-cta";
import { CommunityGlobe } from "@/app/dashboard/community-globe";
export const metadata = { title: "Dashboard Formateur — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function FormateurDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Cours du formateur lus via le client ADMIN (propriétaire légitime) : la RLS
  // masquait au client de session ses propres cours (surtout non publiés) → liste vide.
  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, description_fr, published, created_at, prix_dzd, prix_eur, thumbnail")
    .eq("formateur_id", user!.id)
    .order("created_at", { ascending: false });

  // Inscriptions agrégées via le client ADMIN, SANS la limite PostgREST de 1000 lignes
  // (sinon « 1000 élèves » et comptes par cours faux). La RLS masquerait aussi la lecture
  // au client de session → on lit via admin (propriétaire légitime de ses cours).
  const courseIds = (courses ?? []).map((c) => c.id);
  const { byCourse, total: totalStudents, revDzd: totalRevDzd, revEur: totalRevEur } =
    await aggregateEnrollments(admin, courseIds);

  const { data: profile } = user
    ? await admin.from("users").select("nom").eq("id", user.id).maybeSingle()
    : { data: null };
  const prenom = profile?.nom?.split(" ")[0] ?? "";

  // Packs créés par le formateur (table course_packs, lue via le client admin)
  const { data: packs } = await admin
    .from("course_packs")
    .select("id, titre_fr, description_fr, prix_dzd, prix_eur, published, created_at, items:course_pack_items(course:courses(titre_fr))")
    .eq("formateur_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2.5">
            <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-orange-600">N° 01</span>
            <span className="h-px w-8 bg-violet-950/20" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-violet-950/45">Espace formatrice</span>
          </div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold tracking-tight text-violet-950 dark:text-white leading-[1.05]">
            Tableau de bord
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/formateur/packs/nouveau"
            className="inline-flex items-center gap-2 border-2 border-orange-DEFAULT text-orange-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-50 transition-colors"
          >
            <Package size={17} /> Nouveau pack
          </Link>
          <Link
            href="/formateur/cours/nouveau"
            className="shiny-cta inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            <Plus size={17} /> Nouveau cours
          </Link>
        </div>
      </div>

      {/* CTA — créez vos cours vidéo, protégez votre contenu */}
      <FormateurHeroCTA />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {([
          { label: "Cours publiés", value: courses?.filter(c => c.published).length ?? 0, Icon: BookOpen as LucideIcon, isText: false },
          { label: "Élèves inscrits", value: totalStudents, Icon: Users as LucideIcon, isText: false },
          { label: "Revenus", value: `${totalRevDzd.toLocaleString("fr-DZ")} DA + ${totalRevEur.toFixed(0)}€`, Icon: Wallet as LucideIcon, isText: true },
        ]).map((s, i) => (
          <Reveal
            key={s.label}
            animation="up"
            delay={i * 100}
            className={`rounded-2xl p-6 flex items-center gap-4 ${ATELIER_CARD}`}
          >
            <span className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0">
              <s.Icon size={24} />
            </span>
            <div>
              <div className={`font-bold font-playfair text-violet-950 dark:text-white tabular-nums ${s.isText ? "text-lg" : "text-3xl"}`}>
                {s.value}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-violet-950/45 dark:text-white/45 mt-1">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Panneau communauté — même décor que l'espace élève (globe 3D) */}
      <div className="mb-10">
        <CommunityGlobe
          prenom={prenom}
          href="/formateur/communaute"
          cta="Publier sur la communauté"
          eyebrow="N° 03"
        />
      </div>

      {/* Courses table */}
      <h2 className="font-playfair text-xl font-bold text-violet-950 dark:text-white mb-5">
        Mes cours
      </h2>

      {!courses?.length ? (
        <Reveal animation="up" className={`flex flex-col items-center text-center py-20 rounded-2xl ${ATELIER_CARD}`}>
          <Film size={48} strokeWidth={1.5} className="mb-4 text-cream-300" />
          <p className="text-xl text-violet-950/55 dark:text-white/45 mb-4 font-dm">
            Vous n'avez pas encore créé de cours
          </p>
          <Link
            href="/formateur/cours/nouveau"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Créer mon premier cours
          </Link>
        </Reveal>
      ) : (
        <Reveal animation="up" delay={120} className={`rounded-2xl overflow-hidden ${ATELIER_CARD}`}>
          <Table className="w-full">
            <TableHeader className="bg-cream-50 border-b border-cream-200">
              <TableRow>
                <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Cours</TableHead>
                <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Statut</TableHead>
                <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Élèves</TableHead>
                <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Créé le</TableHead>
                <TableHead className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Revenus</TableHead>
                <TableHead className="px-6 py-4" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-cream-100">
              {courses.map((course) => {
                const agg = byCourse.get(course.id) ?? { count: 0, revDzd: 0, revEur: 0 };
                const count = agg.count;
                const revDzd = agg.revDzd;
                const revEur = agg.revEur;

                return (
                  <TableRow key={course.id} className="hover:bg-cream-50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : <Scissors size={18} />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 line-clamp-1">
                            {course.titre_fr}
                          </span>
                          {course.description_fr && (
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{course.description_fr}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          course.published
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {course.published ? "● Publié" : "○ Brouillon"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 font-semibold">{count}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500">
                      {new Date(course.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600">
                      {revDzd > 0 && <div>{revDzd.toLocaleString("fr-DZ")} DA</div>}
                      {revEur > 0 && <div>{revEur.toFixed(0)} €</div>}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={`/formateur/cours/${course.id}/edit`}
                          className="text-orange-600 font-semibold text-sm hover:underline"
                        >
                          Modifier
                        </a>
                        <a
                          href={`/formateur/cours/${course.id}/inscrits`}
                          className="text-gray-500 text-sm hover:text-orange-600 hover:underline"
                        >
                          Voir les inscrits
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Reveal>
      )}

      {/* Packs créés */}
      <div className="flex items-center justify-between mt-12 mb-5">
        <h2 className="font-playfair text-xl font-bold text-violet-950 dark:text-white inline-flex items-center gap-2">
          <Package size={20} className="text-orange-600" /> Mes packs
        </h2>
        <Link href="/formateur/packs" className="text-sm font-semibold text-orange-600 hover:underline">
          Gérer les packs →
        </Link>
      </div>

      {!packs?.length ? (
        <Reveal animation="up" className={`flex flex-col items-center text-center py-14 rounded-2xl ${ATELIER_CARD}`}>
          <Package size={42} strokeWidth={1.5} className="mb-3 text-cream-300" />
          <p className="text-violet-950/55 dark:text-white/45 mb-4 font-dm">Vous n'avez pas encore créé de pack</p>
          <Link href="/formateur/packs/nouveau"
            className="inline-block border-2 border-orange-DEFAULT text-orange-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-50 transition-colors">
            Créer un pack
          </Link>
        </Reveal>
      ) : (
        <Reveal animation="up" delay={100} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packs.map((p) => {
            const titres = ((p.items as any[]) ?? [])
              .map((it) => (it.course as { titre_fr?: string } | null)?.titre_fr)
              .filter(Boolean) as string[];
            return (
              <div key={p.id} className={`rounded-2xl p-5 ${ATELIER_CARD}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-violet-950 dark:text-white font-dm">{p.titre_fr}</h3>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {p.published ? "● Publié" : "○ Brouillon"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {titres.slice(0, 4).map((tt, i) => (
                    <span key={i} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{tt}</span>
                  ))}
                  {titres.length > 4 && <span className="text-xs text-gray-400">+{titres.length - 4}</span>}
                  {titres.length === 0 && <span className="text-xs text-gray-400">Aucun cours dans ce pack</span>}
                </div>
                <div className="flex items-center justify-between border-t border-cream-100 pt-3">
                  <span className="font-bold text-orange-600 font-playfair">
                    {Number(p.prix_dzd).toLocaleString("fr-DZ")} DA · {Number(p.prix_eur).toFixed(0)} €
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}
