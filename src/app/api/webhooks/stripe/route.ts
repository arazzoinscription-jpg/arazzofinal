import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
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
    const { course_id, user_id, type, patron_id } = session.metadata;

    const supabase = await createClient();

    if (type === "course" && course_id && user_id) {
      await supabase.from("enrollments").insert({
        user_id,
        course_id,
        paid_at: new Date().toISOString(),
        amount: session.amount_total / 100,
        currency: "EUR",
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
