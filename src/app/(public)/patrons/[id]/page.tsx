import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";
import { patronImage } from "@/lib/patron-images";
import { Ruler, Scissors, FileText, Layers, PlayCircle, Lightbulb, ArrowRight, ArrowLeft } from "lucide-react";
import { Gallery } from "./gallery";
import { PatronPurchase } from "./patron-purchase";

export const dynamic = "force-dynamic";

function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (yt) {
    return <iframe className="w-full aspect-video rounded-2xl" src={`https://www.youtube.com/embed/${yt[1]}`} title="Démonstration" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }
  if (vimeo) {
    return <iframe className="w-full aspect-video rounded-2xl" src={`https://player.vimeo.com/video/${vimeo[1]}`} title="Démonstration" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return <video className="w-full aspect-video rounded-2xl bg-black" src={url} controls preload="metadata" />;
}

export default async function PatronDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patron } = await supabase
    .from("patrons")
    .select("id, titre, description, prix_dzd, prix_eur, preview_url, images, tailles, tissu, taille_table, nb_pages, format, video_url, conseils, course_id, numero, fiche_url, dessin_technique_url, formateur:users(nom)")
    .eq("id", id)
    .maybeSingle();

  if (!patron) notFound();

  // Produit boutique lié (pour l'achat)
  const { data: product } = await supabase
    .from("products").select("id, price").eq("patron_id", id).eq("is_active", true).maybeSingle();

  // Formation de référence
  type CourseRef = { id: string; titre_fr: string; slug: string; thumbnail: string | null };
  let course: CourseRef | null = null;
  if (patron.course_id) {
    const { data } = await supabase
      .from("courses").select("id, titre_fr, slug, thumbnail").eq("id", patron.course_id).maybeSingle();
    course = (data as CourseRef | null) ?? null;
  }

  // Visuel = la fiche patronage en priorité (puis photos supplémentaires éventuelles).
  const ficheImg = patron.fiche_url || patron.preview_url;
  const gallery = [ficheImg, ...((patron.images as string[] | null) ?? [])].filter(Boolean) as string[];
  if (gallery.length === 0) gallery.push(patronImage(patron.id));
  const price = product?.price ?? patron.prix_dzd ?? 0;

  const attributs = [
    patron.tailles && { Icon: Ruler, label: "Tailles disponibles", value: patron.tailles },
    patron.tissu && { Icon: Scissors, label: "Tissus conseillés", value: patron.tissu },
    patron.nb_pages != null && { Icon: FileText, label: "Pages", value: `${patron.nb_pages} · ${patron.format ?? "PDF"}` },
    patron.format && patron.nb_pages == null && { Icon: Layers, label: "Format", value: patron.format },
  ].filter(Boolean) as { Icon: typeof Ruler; label: string; value: string }[];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c] pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/patrons" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-white/50 hover:text-orange-600 mb-6">
            <ArrowLeft size={16} /> Tous les patrons
          </Link>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Galerie */}
            <Gallery images={gallery} alt={patron.titre} />

            {/* Infos + achat */}
            <div className="text-gray-900 dark:text-white">
              <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-2">{patron.titre}</h1>
              {(patron.formateur as { nom?: string } | null)?.nom && (
                <p className="text-gray-500 dark:text-white/50 mb-4">par {(patron.formateur as { nom?: string }).nom}</p>
              )}

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-orange-DEFAULT font-playfair">{Number(price).toLocaleString("fr-DZ")} DA</span>
                {patron.prix_eur ? <span className="text-gray-400">{patron.prix_eur}€</span> : null}
              </div>

              {patron.description && <p className="text-gray-600 dark:text-white/70 leading-relaxed mb-6 font-dm">{patron.description}</p>}

              {/* Attributs */}
              {attributs.length > 0 && (
                <dl className="grid sm:grid-cols-2 gap-3 mb-6">
                  {attributs.map((a) => (
                    <div key={a.label} className="flex items-start gap-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-3.5">
                      <span className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center flex-shrink-0"><a.Icon size={18} /></span>
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-400 dark:text-white/40">{a.label}</dt>
                        <dd className="font-semibold text-sm">{a.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              )}

              {/* Achat — 3 choix : PDF / Imprimé A0 / Placement sur mesure */}
              <PatronPurchase patronId={patron.id} productId={product?.id ?? null} price={price} tailles={patron.tailles ?? null} />
            </div>
          </div>

          {/* Table des mesures */}
          {patron.taille_table && (
            <section className="mt-12 rounded-3xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-6 sm:p-8">
              <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Ruler size={22} className="text-violet-600 dark:text-violet-300" /> Table des mesures
              </h2>
              <p className="text-gray-600 dark:text-white/70 leading-relaxed font-dm whitespace-pre-line">{patron.taille_table}</p>
            </section>
          )}

          {/* Conseils */}
          {patron.conseils && (
            <section className="mt-6 rounded-3xl bg-orange-50/60 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-6 sm:p-8">
              <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Lightbulb size={22} className="text-orange-500 dark:text-orange-300" /> Conseils de couture
              </h2>
              <p className="text-gray-700 dark:text-white/80 leading-relaxed font-dm whitespace-pre-line">{patron.conseils}</p>
            </section>
          )}

          {/* Vidéo démonstrative */}
          {patron.video_url && (
            <section className="mt-6">
              <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <PlayCircle size={22} className="text-violet-600 dark:text-violet-300" /> Vidéo : coudre ce modèle pas à pas
              </h2>
              <VideoEmbed url={patron.video_url} />
            </section>
          )}

          {/* Formation de référence */}
          {course && (
            <section className="mt-10">
              <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-4">Formation associée</h2>
              <Link href={`/formations/${course.slug}`}
                className="group flex items-center gap-4 rounded-3xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-4 hover:shadow-lg transition-shadow max-w-xl">
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0">
                  <img src={course.thumbnail || "/images/hero-modelisme-1.jpg"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-violet-600 dark:text-violet-300 font-semibold">Apprendre à coudre ce modèle</p>
                  <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">{course.titre_fr}</p>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-orange-DEFAULT group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
