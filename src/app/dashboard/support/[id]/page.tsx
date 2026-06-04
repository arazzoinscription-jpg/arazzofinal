import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TicketThread } from "@/components/tickets/ticket-thread";

export const metadata = { title: "Ticket — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket } = await supabase
    .from("tickets").select("id, sujet, statut, user_id").eq("id", params.id).single();
  if (!ticket || ticket.user_id !== user.id) notFound();

  const { data: msgs } = await supabase
    .from("ticket_messages")
    .select("id, body, created_at, user_id, author:users(nom, role)")
    .eq("ticket_id", params.id).order("created_at", { ascending: true });

  const messages = (msgs ?? []).map((m) => {
    const a = m.author as { nom?: string; role?: string } | null;
    return {
      id: m.id, body: m.body, created_at: m.created_at,
      authorName: a?.nom ?? "—", mine: m.user_id === user.id,
      staff: a?.role === "formateur" || a?.role === "admin",
    };
  });

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/support" className="text-sm text-orange-600 hover:underline font-dm">← Mes tickets</Link>
      <h1 className="font-playfair text-2xl font-bold text-gray-900 mt-2 mb-6">{ticket.sujet}</h1>
      <TicketThread ticketId={ticket.id} statut={ticket.statut} messages={messages} isStaff={false} />
    </div>
  );
}
