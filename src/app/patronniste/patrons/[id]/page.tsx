import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatronForm } from "../patron-form";
import { CommunityVideoUploader } from "@/components/community/video-uploader";

export const metadata = { title: "Modifier un patron — Patronniste" };
export const dynamic = "force-dynamic";

export default async function EditPatronPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: patron } = await admin
    .from("patrons")
    .select("id, titre, description, prix_dzd, prix_eur, tailles, tissu, taille_table, nb_pages, format, preview_url, fichier_url, video_url, conseils, course_id, images, numero, dessin_technique_url, genre, type_vetement")
    .eq("id", id)
    .single();

  if (!patron) notFound();

  const { data: courses } = await admin.from("courses").select("id, titre_fr").order("created_at", { ascending: false });

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Modifier : {patron.titre}</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">Mettez à jour les informations, attributs ou fichiers.</p>
      <PatronForm init={patron} courses={courses ?? []} />

      {/* Démo communauté : courte vidéo → feed + CTA « Acheter le patron ». */}
      <div className="mt-8">
        <h2 className="font-playfair text-xl font-bold mb-1">Démo communauté</h2>
        <p className="text-gray-500 dark:text-white/50 mb-4 text-sm">
          Publiez une courte vidéo (max 3 min) montrant ce patron sur le feed communauté pour donner envie de l'acheter. Un bouton « Acheter le patron » sera ajouté automatiquement.
        </p>
        <CommunityVideoUploader sourceType="patron_demo" patronId={patron.id} />
      </div>
    </div>
  );
}
