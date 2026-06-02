const CHARGILY_API_KEY = process.env.CHARGILY_API_KEY!;
const CHARGILY_ENDPOINT =
  process.env.CHARGILY_ENDPOINT || "https://pay.chargily.net/api/v2";

interface ChargilyCheckoutParams {
  amount: number;
  currency?: "dzd" | "usd";
  description: string;
  webhookEndpoint: string;
  backUrl: string;
  metadata?: Record<string, string>;
}

interface ChargilyCheckoutResponse {
  id: string;
  checkout_url: string;
}

export async function createChargilyCheckout(
  params: ChargilyCheckoutParams
): Promise<ChargilyCheckoutResponse> {
  const response = await fetch(`${CHARGILY_ENDPOINT}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHARGILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? "dzd",
      description: params.description,
      webhook_endpoint: params.webhookEndpoint,
      back_url: params.backUrl,
      metadata: params.metadata,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Chargily error: ${err}`);
  }

  return response.json();
}

export function verifyChargilySignature(
  payload: string,
  signature: string
): boolean {
  // Chargily uses HMAC-SHA256 — verify against CHARGILY_API_KEY
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", CHARGILY_API_KEY)
    .update(payload)
    .digest("hex");
  return expected === signature;
}
