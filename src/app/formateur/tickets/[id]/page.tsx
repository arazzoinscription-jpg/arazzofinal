import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TicketThread } from "@/components/tickets/ticket-thread";

export const metadata = { title: "Ticket — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function StaffTicketDetail({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets").select("id, sujet, statut, priorite, user:users(nom, email)").eq("id", params.id).single();
  if (!ticket) notFound();

  const { data: msgs } = await admin
    .from("ticket_messages")
    .select("id, body, created_at, user_id, author:users(nom, role)")
    .eq("ticket_id", params.id).order("created_at", { ascending: true });

  const messages = (msgs ?? []).map((m) => {
    const a = m.author as { nom?: string; role?: string } | null;
    return {
      id: m.id, body: m.body, created_at: m.created_at,
      authorName: a?.nom ?? "—", mine: m.user_id === user!.id,
      staff: a?.role === "formateur" || a?.role === "admin",
    };
  });

  return (
    <div className="max-w-2xl">
      <Link href="/formateur/tickets" className="text-sm text-violet-DEFAULT hover:underline font-dm">← Tous les tickets</Link>
      <h1 className="font-playfair text-2xl font-bold text-gray-900 mt-2">{ticket.sujet}</h1>
      <p className="text-sm text-gray-400 font-dm mb-6">
        De {(ticket.user as any)?.nom ?? "—"} · {(ticket.user as any)?.email} · priorité {ticket.priorite}
      </p>
      <TicketThread ticketId={ticket.id} statut={ticket.statut} messages={messages} isStaff={true} />
    </div>
  );
}
