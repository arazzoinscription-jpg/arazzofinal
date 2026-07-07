import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushToUserWithBadge } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Pont universel « notification → push système ».
 *
 * Déclenché par un Database Webhook Supabase sur INSERT dans public.notifications.
 * AVANTAGE : toute notification, quelle que soit sa source (code applicatif OU
 * triggers SQL — montée de niveau, nouvelle leçon, badge…), envoie un push bureau
 * ET met à jour le badge chiffré de l'icône, même app fermée.
 *
 * Sécurité : en-tête secret partagé `x-push-secret` (configuré dans le webhook).
 * Route sous /api/webhooks/* → exemptée de CSRF et de rate-limit (voir middleware).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret");
  if (!process.env.PUSH_WEBHOOK_SECRET || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corps invalide" }, { status: 400 });
  }

  // Format d'un Database Webhook Supabase (INSERT) : { type, table, schema, record, old_record }
  const row = payload?.record;
  if (payload?.type !== "INSERT" || !row?.user_id || !row?.title) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = createAdminClient();
  await pushToUserWithBadge(admin, row.user_id as string, {
    title: row.title as string,
    body: (row.body as string) ?? "",
    url: (row.link as string) ?? "/dashboard",
    tag: (row.type as string) ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
