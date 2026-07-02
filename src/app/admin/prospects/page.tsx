import { createAdminClient } from "@/lib/supabase/admin";
import { loadPurchaserSet, PURCHASED_ORDER_STATUSES } from "@/lib/prospects";
import { ProspectsClient, type ProspectRow, type ProspectStatus, type AcctStatus } from "./prospects-client";
import Link from "next/link";
import { Settings } from "lucide-react";

export const metadata = { title: "Prospects — Admin" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;
const daysSince = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : Infinity);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface SeqRow {
  user_id: string;
  registration_source: string;
  welcome_sent_at: string | null;
  reminder_14_sent_at: string | null;
  has_purchased: boolean;
  reminders_before_purchase: number;
  sequence_stopped: boolean;
  marked_for_deletion_at: string | null;
}

export default async function AdminProspectsPage() {
  const admin = createAdminClient();

  // ── Inscrits (élèves) ──
  const { data: users } = await admin
    .from("users")
    .select("id, nom, email, created_at")
    .eq("role", "eleve")
    .order("created_at", { ascending: false })
    .limit(3000);
  const list = users ?? [];
  const ids = list.map((u: { id: string }) => u.id);

  // ── Achats (inscription formation OU commande confirmée) ──
  const purchased = await loadPurchaserSet(admin, ids);

  // ── Commandes : nombre + téléphone le plus récent ──
  const ordersCount = new Map<string, number>();
  const phoneById = new Map<string, { phone: string; at: number }>();
  for (const part of chunk(ids, 500)) {
    const { data: ord } = await admin
      .from("orders").select("customer_id, phone, created_at").in("customer_id", part);
    (ord ?? []).forEach((o: { customer_id: string | null; phone: string | null; created_at: string }) => {
      if (!o.customer_id) return;
      ordersCount.set(o.customer_id, (ordersCount.get(o.customer_id) ?? 0) + 1);
      if (o.phone) {
        const at = new Date(o.created_at).getTime();
        const prev = phoneById.get(o.customer_id);
        if (!prev || at > prev.at) phoneById.set(o.customer_id, { phone: o.phone, at });
      }
    });
  }

  // ── Inscriptions (enrollments) : nombre ──
  const enrollCount = new Map<string, number>();
  for (const part of chunk(ids, 500)) {
    const { data: enr } = await admin.from("enrollments").select("user_id").in("user_id", part);
    (enr ?? []).forEach((e: { user_id: string | null }) => {
      if (e.user_id) enrollCount.set(e.user_id, (enrollCount.get(e.user_id) ?? 0) + 1);
    });
  }

  // ── Clients abonnement ──
  const subscriberIds: string[] = [];
  for (const part of chunk(ids, 500)) {
    const { data: subs } = await admin.from("course_subscriptions").select("user_id").in("user_id", part);
    (subs ?? []).forEach((s: { user_id: string | null }) => s.user_id && subscriberIds.push(s.user_id));
  }

  // ── Formation visée (demandes d'enrôlement) ──
  const interestByEmail = new Map<string, string>();
  {
    const { data: reqs } = await admin
      .from("enrollment_requests").select("email, course:courses(titre_fr)").limit(5000);
    (reqs ?? []).forEach((r: { email: string | null; course: { titre_fr: string | null }[] | { titre_fr: string | null } | null }) => {
      const titre = Array.isArray(r.course) ? r.course[0]?.titre_fr : r.course?.titre_fr;
      if (r.email && titre && !interestByEmail.has(r.email)) interestByEmail.set(r.email, titre);
    });
  }

  // ── État de séquence prospect ──
  const seqMap = new Map<string, SeqRow>();
  for (const part of chunk(ids, 500)) {
    const { data: seq } = await admin
      .from("prospect_sequence")
      .select("user_id, registration_source, welcome_sent_at, reminder_14_sent_at, has_purchased, reminders_before_purchase, sequence_stopped, marked_for_deletion_at")
      .in("user_id", part);
    (seq ?? []).forEach((s: SeqRow) => seqMap.set(s.user_id, s));
  }

  // ── Comptes auth : email vérifié, dernière connexion, statut ──
  const authInfo = new Map<string, { verified: boolean; lastLogin: string | null; status: AcctStatus }>();
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data || data.users.length === 0) break;
    data.users.forEach((u) => {
      const meta = (u.app_metadata as { status?: string } | undefined)?.status;
      const banned = (u as { banned_until?: string | null }).banned_until;
      const status: AcctStatus = meta === "veille" || meta === "bloque" ? (meta as AcctStatus) : banned ? "bloque" : "actif";
      authInfo.set(u.id, {
        verified: !!(u.email_confirmed_at || (u as { confirmed_at?: string }).confirmed_at),
        lastLogin: u.last_sign_in_at ?? null,
        status,
      });
    });
    if (data.users.length < 1000) break;
    page++;
  }

  // ── Construction des lignes + statut ──
  function classify(userId: string, isBuyer: boolean, lastLogin: string | null): ProspectStatus {
    const s = seqMap.get(userId);
    if (isBuyer) return s && s.reminders_before_purchase > 0 ? "reactive" : "client";
    if (s?.marked_for_deletion_at || s?.reminder_14_sent_at || daysSince(lastLogin) > 90) return "inactif";
    if (s?.welcome_sent_at) return "attente";
    return "nouveau";
  }

  const rows: ProspectRow[] = list.map((u: { id: string; nom: string | null; email: string | null; created_at: string }) => {
    const isBuyer = purchased.has(u.id);
    const info = authInfo.get(u.id);
    const s = seqMap.get(u.id);
    return {
      id: u.id,
      nom: u.nom || u.email?.split("@")[0] || "—",
      email: u.email ?? "",
      phone: phoneById.get(u.id)?.phone ?? null,
      createdAt: u.created_at,
      emailVerified: info?.verified ?? false,
      lastLogin: info?.lastLogin ?? null,
      ordersCount: ordersCount.get(u.id) ?? 0,
      enrollmentsCount: enrollCount.get(u.id) ?? 0,
      formationInteret: (u.email && interestByEmail.get(u.email)) || null,
      source: s?.registration_source ?? "—",
      status: classify(u.id, isBuyer, info?.lastLogin ?? null),
      acctStatus: info?.status ?? "actif",
      sequenceStopped: !!s?.sequence_stopped,
      markedForDeletion: !!s?.marked_for_deletion_at,
    };
  });

  // ── Statistiques (dashboard) ──
  const totalInscrits = rows.length;
  const clients = rows.filter((r) => r.status === "client" || r.status === "reactive").length;
  const prospects = totalInscrits - clients;
  const reactives = rows.filter((r) => r.status === "reactive").length;
  const aSupprimer = rows.filter((r) => r.markedForDeletion).length;
  const conversion = totalInscrits ? Math.round((clients / totalInscrits) * 1000) / 10 : 0;

  const { count: emailsSent } = await admin
    .from("email_log").select("*", { count: "exact", head: true }).eq("category", "prospect").eq("status", "sent");

  const stats = [
    { label: "Total inscrits", value: totalInscrits },
    { label: "Prospects (sans commande)", value: prospects },
    { label: "Clients", value: clients },
    { label: "Taux de conversion", value: `${conversion} %` },
    { label: "Emails prospect envoyés", value: emailsSent ?? 0 },
    { label: "Réactivations", value: reactives },
    { label: "À supprimer", value: aSupprimer },
  ];

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Prospects</h1>
        <Link href="/admin/prospects/parametres"
          className="inline-flex items-center gap-2 border border-gray-100 rounded-xl px-4 py-2 bg-white text-sm hover:bg-gray-50">
          <Settings size={15} /> Paramètres de la séquence
        </Link>
      </div>
      <p className="text-gray-500 mb-6 font-dm">Utilisateurs inscrits sans commande — suivi & séquence d'emails automatique.</p>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mb-4 font-dm">
        Emails ouverts / cliqués : non disponibles (le suivi d'ouverture Resend n'est pas activé).
      </p>

      <ProspectsClient rows={rows} subscriberIds={subscriberIds} />
    </div>
  );
}
