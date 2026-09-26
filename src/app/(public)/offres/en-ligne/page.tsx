import { createClient } from "@/lib/supabase/server";
import OffreListe, { type Item } from "../offres-liste";

// Page SÉPARÉE « Formations en ligne » — liste les 3 niveaux (cours du LMS),
// chacun menant à sa landing `/formation/[niveau]`. Ouverte depuis le bouton du
// hub `/offres`.

const NIVEAUX = [
  { slug: "niveau-1", id: "23bee490-103a-492d-9253-256178658e02", sous: "Débutante — bases & vêtements du quotidien" },
  { slug: "niveau-2", id: "b100190c-4f95-4f63-bd22-7a561f9666de", sous: "Intermédiaire — classique & tenues de soirée" },
  { slug: "niveau-3", id: "de1da439-6dc9-4cf0-9526-e44af4c5073b", sous: "Avancée — modélisme & pièces complexes" },
];

export const dynamic = "force-dynamic";

const daPrice = (n: number | null | undefined) =>
  n ? `${Number(n).toLocaleString("fr-FR")} DA` : null;

export default async function Page() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, titre_fr, prix_dzd")
    .in("id", NIVEAUX.map((n) => n.id));
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));

  const items: Item[] = NIVEAUX.map((n) => {
    const c = byId.get(n.id);
    return { slug: n.slug, name: c?.titre_fr || n.slug, sous: n.sous, prix: daPrice(c?.prix_dzd) };
  });

  return <OffreListe kind="online" items={items} />;
}
