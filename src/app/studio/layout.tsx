import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isFormateur } from "@/lib/roles";

export const metadata = {
  title: "Studio — Arazzo Formation",
  description: "Assistant IA de montage des cours de couture.",
};

// Module Studio : protégé par l'auth Supabase du site (réservé aux formateurs),
// puis dialoguant avec l'Arazzo Engine local dans le navigateur.
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/studio");

  const { data: profile } = await supabase
    .from("users")
    .select("nom, role, roles")
    .eq("id", user.id)
    .single();

  // Le Studio est réservé aux formatrices (l'admin y a accès aussi).
  if (!isFormateur(profile)) redirect("/dashboard");

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <Link href="/studio" className="flex items-center gap-2 font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-secondary/10 text-secondary">
              <Scissors className="size-4" />
            </span>
            <span>
              Arazzo <span className="text-primary">Studio</span>
            </span>
          </Link>
          <div className="flex-1" />
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour au site
          </Link>
          {profile?.nom && (
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile.nom}</span>
          )}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              aria-label="Se déconnecter"
              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
