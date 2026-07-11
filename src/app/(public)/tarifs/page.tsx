import { redirect } from "next/navigation";

// « Tarifs » (lien de pied de page) pointe vers la page des offres/abonnements.
export default function TarifsPage() {
  redirect("/offre");
}
