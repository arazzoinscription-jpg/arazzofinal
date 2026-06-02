import { NextRequest, NextResponse } from "next/server";
import { verifyChargilySignature } from "@/lib/chargily";
import { createClient } from "@/lib/supabase/server";
import { sendPurchaseConfirmationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("signature") ?? "";

  if (!verifyChargilySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(body);

  if (payload.type === "checkout.paid") {
    const { course_id, user_id, type, patron_id } = payload.data.metadata ?? {};
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
