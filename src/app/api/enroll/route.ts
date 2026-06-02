import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStripeCheckout } from "@/lib/stripe";
import { createChargilyCheckout } from "@/lib/chargily";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { courseId, currency } = await req.json();

  const { data: course } = await supabase
    .from("courses")
    .select("id, titre_fr, prix_dzd, prix_eur")
    .eq("id", courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Déjà inscrit" }, { status: 409 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  if (currency === "eur") {
    const session = await createStripeCheckout({
      courseId,
      priceEur: course.prix_eur,
      courseTitre: course.titre_fr,
      userId: user.id,
      userEmail: user.email!,
      successUrl: `${baseUrl}/dashboard?enrolled=1`,
      cancelUrl: `${baseUrl}/formations`,
    });
    return NextResponse.json({ url: session.url });
  }

  if (currency === "dzd") {
    const checkout = await createChargilyCheckout({
      amount: course.prix_dzd,
      description: course.titre_fr,
      webhookEndpoint: `${baseUrl}/api/webhooks/chargily`,
      backUrl: `${baseUrl}/dashboard?enrolled=1`,
      metadata: {
        course_id: courseId,
        user_id: user.id,
        type: "course",
      },
    });
    return NextResponse.json({ url: checkout.checkout_url });
  }

  return NextResponse.json({ error: "Devise invalide" }, { status: 400 });
}
