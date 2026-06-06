import Link from "next/link";
import { PlusCircle, Pencil, Download } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { patronImage } from "@/lib/patron-images";
import { Reveal } from "@/components/ui/reveal";
import { DeletePatronButton } from "./delete-button";

export const metadata = { title: "Mes patrons — Patronniste" };
export const dynamic = "force-dynamic";

export default async function PatronnistePatronsPage() {
  const admin = createAdminClient();
  const { data: patrons } = await admin
    .from("patrons")
    .select("id, titre, preview_url, fichier_url, prix_dzd, tailles, tissu, nb_pages")
    .order("created_at", { ascending: false });

  return (
    <div className="text-gray-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold">Tous les patrons</h1>
          <p className="text-gray-500 dark:text-white/50 mt-1">{patrons?.length ?? 0} patron(s) — cliquez pour modifier.</p>
        </div>
        <Link href="/patronniste/patrons/nouveau" className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <PlusCircle size={18} /> Nouveau patron
        </Link>
      </div>

      {!patrons?.length ? (
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-12 text-center text-gray-400">
          Aucun patron pour l'instant.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {patrons.map((p, i) => (
            <Reveal key={p.id} animation="up" delay={(i % 4) * 70} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 overflow-hidden group">
              <Link href={`/patronniste/patrons/${p.id}`} className="block aspect-[3/4] bg-cream-100 dark:bg-white/5 overflow-hidden">
                <img src={p.preview_url || patronImage(p.id)} alt={p.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </Link>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-1">{p.titre}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                  {p.tailles && <span className="text-[11px] font-medium bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">📏 {p.tailles}</span>}
                  {p.nb_pages != null && <span className="text-[11px] font-medium bg-cream-100 dark:bg-white/10 text-gray-600 dark:text-white/60 px-2 py-0.5 rounded">📄 {p.nb_pages}p</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-orange-DEFAULT">{(p.prix_dzd ?? 0).toLocaleString("fr-DZ")} DA</span>
                  <div className="flex items-center gap-1">
                    {p.fichier_url && (
                      <a href={p.fichier_url} target="_blank" rel="noopener noreferrer" aria-label="Télécharger"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                        <Download size={16} />
                      </a>
                    )}
                    <Link href={`/patronniste/patrons/${p.id}`} aria-label="Modifier"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                      <Pencil size={16} />
                    </Link>
                    <DeletePatronButton id={p.id} titre={p.titre} />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
