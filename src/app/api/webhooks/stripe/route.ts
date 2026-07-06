import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPurchaseConfirmationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { course_id, user_id, type, patron_id } = session.metadata ?? {};

    // Client service-role : le webhook n'a PAS de session utilisateur, donc la RLS
    // (auth.uid() = null) bloquerait tout insert via le client anon. On journalise
    // aussi les erreurs pour ne pas « perdre » un paiement en silence.
    const admin = createAdminClient();

    if (type === "course" && course_id && user_id) {
      const { error: enrErr } = await admin.from("enrollments").insert({
        user_id,
        course_id,
        paid_at: new Date().toISOString(),
        amount: session.amount_total / 100,
        currency: "EUR",
      });
      // Idempotence : un doublon (UNIQUE user_id+course_id) sur une relivraison
      // Stripe n'est pas une erreur ; toute autre erreur est journalisée.
      if (enrErr && (enrErr as any).code !== "23505") {
        console.error("[stripe webhook] enrollment insert failed:", enrErr.message);
      }

      const { data: user } = await admin
        .from("users")
        .select("nom, email")
        .eq("id", user_id)
        .single();

      const { data: course } = await admin
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
      const { error: patErr } = await admin.from("patron_purchases").insert({
        user_id,
        patron_id,
        paid_at: new Date().toISOString(),
      });
      if (patErr && (patErr as any).code !== "23505") {
        console.error("[stripe webhook] patron_purchase insert failed:", patErr.message);
      }
    }
  }

  return NextResponse.json({ received: true });
}
