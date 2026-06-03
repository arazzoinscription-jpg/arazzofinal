import Link from "next/link";
import { getCart } from "@/app/actions/cart";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { count } = await getCart();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-cream-DEFAULT">
      {/* En-tête boutique */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-cream-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/boutique" className="font-playfair text-xl font-bold text-violet-DEFAULT">
            ✂ ARAZZO <span className="text-orange-DEFAULT">Boutique</span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-dm">
            <Link href="/boutique" className="text-gray-600 hover:text-violet-DEFAULT transition-colors">Boutique</Link>
            <Link href="/formations" className="hidden sm:inline text-gray-600 hover:text-violet-DEFAULT transition-colors">Formations</Link>
            <Link href={user ? "/dashboard" : "/login"} className="text-gray-600 hover:text-violet-DEFAULT transition-colors">
              {user ? "Mon espace" : "Connexion"}
            </Link>

            {/* Panier + badge */}
            <Link href="/panier" className="relative inline-flex items-center">
              <span className="text-2xl">🛒</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-orange-DEFAULT text-white text-[11px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      <Toaster />
    </div>
  );
}
