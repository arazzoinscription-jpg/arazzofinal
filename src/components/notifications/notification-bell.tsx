"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const ICONS: Record<string, string> = {
  new_content: "✨", announcement: "📢", reply: "💬",
  ticket: "🎫", session: "🎥", badge: "🏅", system: "🔔",
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unread = notifs.filter((n) => !n.read_at).length;

  // Chargement initial + abonnement Realtime
  useEffect(() => {
    let active = true;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (active && data) setNotifs(data as Notif[]); });

    const channel = supabase
      .channel(`notifs:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setNotifs((prev) => [payload.new as Notif, ...prev].slice(0, 20))
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [userId]);

  // Fermer au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    const ids = notifs.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  }

  function timeAgo(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return `il y a ${Math.floor(diff / 86400)} j`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        className="relative w-11 h-11 rounded-full bg-white border border-cream-200 flex items-center justify-center hover:bg-cream-50 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-orange-DEFAULT text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-cream-200 shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-cream-100 flex items-center justify-between">
            <span className="font-semibold text-gray-900 font-dm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-orange-600 font-semibold hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-cream-100">
            {notifs.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔕</div>
                Aucune notification
              </div>
            ) : (
              notifs.map((n) => {
                const inner = (
                  <div className={`px-4 py-3 flex gap-3 hover:bg-cream-50 transition-colors ${!n.read_at ? "bg-orange-50/40" : ""}`}>
                    <span className="text-lg flex-shrink-0">{ICONS[n.type] ?? "🔔"}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-dm leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 font-dm line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{inner}</Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
