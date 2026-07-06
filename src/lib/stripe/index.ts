import Stripe from "stripe";

// Le placeholder n'existe QUE pour permettre `next build` sans la vraie clé
// (ce n'est pas un secret). En production, on refuse d'opérer avec ce stub.
const PLACEHOLDER_KEY = "sk_test_placeholder_build_key";

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || PLACEHOLDER_KEY,
  { apiVersion: "2024-06-20" }
);

/** Garde runtime (SEC-013) : échoue clairement si la vraie clé Stripe manque. */
function assertStripeConfigured() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === PLACEHOLDER_KEY) {
    throw new Error("Stripe non configuré : STRIPE_SECRET_KEY manquant.");
  }
}

export async function createStripeCheckout({
  courseId,
  priceEur,
  courseTitre,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  courseId: string;
  priceEur: number;
  courseTitre: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  assertStripeConfigured();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: courseTitre,
            description: "Formation Arazzo Formation",
          },
          unit_amount: Math.round(priceEur * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      course_id: courseId,
      user_id: userId,
      type: "course",
    },
  });

  return session;
}

export async function createStripePatronCheckout({
  patronId,
  priceEur,
  patronTitre,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  patronId: string;
  priceEur: number;
  patronTitre: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  assertStripeConfigured();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: patronTitre,
            description: "Patron numérique — Arazzo Formation",
          },
          unit_amount: Math.round(priceEur * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      patron_id: patronId,
      user_id: userId,
      type: "patron",
    },
  });

  return session;
}
