import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileText, Ruler, Package, Store, ArrowUpRight, Sparkles } from "lucide-react";
import { RoleRequestCTA } from "./role-request/cta";
import { BecomeStudent } from "./become-student";

type Status = "none" | "en_attente" | "approuve" | "refuse";

/** Accueil de l'espace ACHETEUR DE PATRONS (account_type = "patrons"). */
export async function BuyerHome({ prenom }: { prenom: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  // Demandes de rôle (devenir formatrice / patronniste)
  const { data: roleReqs } = await supabase
    .from("role_requests")
    .select("requested_role, statut, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  const latestStatus = (r: "formateur" | "patronniste"): Status =>
    (roleReqs?.find((x) => x.requested_role === r)?.statut as Status | undefined) ?? "none";

  // Compteurs (best-effort : 0 si la table n'est pas accessible)
  const patronsCount = await safeCount("patron_purchases", uid);
  const ordersCount = await safeCount("orders", uid);

  const card = "bg-white dark:bg-white/[0.04] ring-1 ring-violet-950/[0.07] dark:ring-white/10 shadow-[0_14px_34px_-22px_rgba(43,18,69,0.32)] dark:shadow-none";
  const muted = "text-violet-950/55 dark:text-white/50";

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 -mb-4 sm:-mb-6 lg:-mb-8 px-4 sm:px-5 lg:px-8 py-7 min-h-[calc(100vh-4rem)] bg-cream-DEFAULT text-gray-900 dark:bg-[#0d0a1c] dark:text-white">
      {/* En-tête */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-[0.18em] mb-1">
          <Sparkles size={13} /> Espace acheteur
        </span>
        <h1 className="font-playfair text-3xl font-bold">Bonjour, {prenom} 👋</h1>
        <p className={`${muted} font-dm text-sm mt-1`}>Vos patrons, commandes et placements sur mesure.</p>
      </div>

      {/* Raccourcis acheteur */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BuyerTile href="/dashboard/patrons" icon={FileText} title="Mes patrons" value={patronsCount} sub="téléchargements" cardCls={card} mutedCls={muted} />
        <BuyerTile href="/dashboard/commandes" icon={Package} title="Mes commandes" value={ordersCount} sub="au total" cardCls={card} mutedCls={muted} />
        <BuyerTile href="/dashboard/sur-mesure" icon={Ruler} title="Sur mesure" sub="placement sur tissu" cardCls={card} mutedCls={muted} />
        <BuyerTile href="/patrons" icon={Store} title="Catalogue" sub="parcourir les patrons" cardCls={card} mutedCls={muted} />
      </div>

      {/* CTA : devenir élève (formations) */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 p-6 sm:p-7 text-white mb-6">
        <h2 className="font-playfair text-2xl font-bold">Envie d'apprendre la couture ? 🎓</h2>
        <p className="text-white/85 text-sm mt-1 mb-5 max-w-xl">
          Débloquez l'espace élève pour suivre des <strong>formations complètes</strong>, faire des quiz et obtenir un certificat — tout en gardant vos patrons.
        </p>
        <BecomeStudent />
      </div>

      {/* CTA : devenir formatrice / patronniste (écran réservé aux comptes sans espace pro) */}
      <RoleRequestCTA formateurStatus={latestStatus("formateur")} patronnisteStatus={latestStatus("patronniste")} hasFormateur={false} hasPatronniste={false} />

      {/* Lien catalogue en pied */}
      <div className="mt-6">
        <Link href="/patrons" className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 font-semibold hover:underline">
          Explorer tous les patrons <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function BuyerTile({
  href, icon: Icon, title, value, sub, cardCls, mutedCls,
}: {
  href: string; icon: typeof FileText; title: string; value?: number; sub: string; cardCls: string; mutedCls: string;
}) {
  return (
    <Link href={href} className={`group rounded-3xl p-5 transition-colors hover:bg-cream-50 dark:hover:bg-white/[0.07] ${cardCls}`}>
      <span className="w-11 h-11 rounded-2xl bg-violet-500/15 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center mb-3">
        <Icon size={20} />
      </span>
      {value != null && <div className="font-playfair text-2xl font-bold leading-none">{value}</div>}
      <p className={`font-semibold text-sm ${value != null ? "mt-1" : ""}`}>{title}</p>
      <p className={`text-xs ${mutedCls} font-dm`}>{sub}</p>
    </Link>
  );
}

async function safeCount(table: string, uid: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", uid);
    return count ?? 0;
  } catch {
    return 0;
  }
}
