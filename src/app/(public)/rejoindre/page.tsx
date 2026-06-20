import { redirect } from "next/navigation";

// La page de vente « Rejoindre » a été fusionnée avec /offre.
export const dynamic = "force-dynamic";

export default function RejoindrePage() {
  redirect("/offre");
}
