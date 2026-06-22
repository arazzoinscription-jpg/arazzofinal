import { NextRequest, NextResponse } from "next/server";
import { verifyChargilySignature } from "@/lib/chargily";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeOrderConfirmation } from "@/app/actions/payments";
import { sendPurchaseConfirmationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("signature") ?? "";

  if (!verifyChargilySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(body);

  if (payload.type === "checkout.paid") {
    const metadata = payload.data.metadata ?? {};

    // ── Flux panier / commande (checkout boutique) ────────────────────────
    // Le paiement est rattaché à une `orders` via metadata.order_id : on
    // approuve le paiement Chargily puis on confirme la commande (admin).
    if (metadata.order_id) {
      const admin = createAdminClient();
      const { data: pay } = await admin
        .from("order_payments").select("id").eq("order_id", metadata.order_id).eq("method", "chargily").maybeSingle();
      if (pay) {
        await admin.from("order_payments")
          .update({ status: "approved", verified_at: new Date().toISOString() }).eq("id", pay.id);
      } else {
        await admin.from("order_payments").insert({
          order_id: metadata.order_id, method: "chargily", status: "approved", amount: payload.data.amount,
        });
      }
      try { await finalizeOrderConfirmation(metadata.order_id); } catch { /* best-effort */ }
      return NextResponse.json({ received: true });
    }

    // ── Ancien flux : achat direct cours / patron (metadata course_id/patron_id) ──
    const { course_id, user_id, type, patron_id } = metadata;
    const supabase = await createClient();

    if (type === "course" && course_id && user_id) {
      await supabase.from("enrollments").insert({
        user_id,
        course_id,
        paid_at: new Date().toISOString(),
        amount: payload.data.amount,
        currency: "DZD",
      });

      const { data: user } = await supabase
        .from("users")
        .select("nom, email")
        .eq("id", user_id)
        .single();

      const { data: course } = await supabase
        .from("courses")
        .select("titre_fr")
        .eq("id", course_id)
        .single();

      if (user && course) {
        await sendPurchaseConfirmationEmail(
          user.email,
          user.nom,
          course.titre_fr,
          `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
        );
      }
    }

    if (type === "patron" && patron_id && user_id) {
      await supabase.from("patron_purchases").insert({
        user_id,
        patron_id,
        paid_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
