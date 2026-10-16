import { Toaster } from "@/components/ui/toast";

/** La communauté (feed, profils, publier) : les messages éphémères (« Lien copié », « En attente de validation »…) s'affichent ici. */
export default function CommunauteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
