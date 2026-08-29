/**
 * Pont vers Arazzo OS — notifier une vente confirmée (server-to-server).
 *
 * Quand une commande est confirmée (paiement en ligne OU validation manuelle par
 * l'admin), on prévient Arazzo OS. Arazzo, lui :
 *   - enregistre le revenu et fait passer l'acheteuse en « cliente » ;
 *   - envoie l'achat à Meta via la Conversions API, DÉDUPLIQUÉ avec le Pixel du
 *     navigateur grâce à `event_id = id de commande`.
 *
 * Deux règles tenues :
 *   - **Best-effort** : si Arazzo est injoignable (machine éteinte, tunnel down),
 *     on n'échoue JAMAIS — la confirmation de commande ne doit pas dépendre d'un
 *     système externe. On avale l'erreur et on continue.
 *   - **Honnête** : sans configuration (`ARAZZO_OS_URL` + `ARAZZO_OS_TOKEN`), on
 *     ne fait rien plutôt que d'inventer une destination.
 *
 * Le jeton est un secret SERVEUR (jamais `NEXT_PUBLIC`) : cette fonction ne tourne
 * que côté serveur (server action / webhook).
 */

type VenteArazzo = {
  orderId: string;
  amount: number;
  email?: string | null;
  currency?: string;
  /** Métier vendu, pour séparer les stats : "formation" ou "patron". */
  category?: "formation" | "patron";
};

export async function notifierVenteArazzo({
  orderId, amount, email, currency = "DZD", category,
}: VenteArazzo): Promise<{ notifie: boolean; raison?: string }> {
  const base = (process.env.ARAZZO_OS_URL ?? "").replace(/\/+$/, "");
  const token = process.env.ARAZZO_OS_TOKEN ?? "";
  if (!base || !token) return { notifie: false, raison: "non_configuré" };
  if (!orderId || !(Number(amount) > 0)) return { notifie: false, raison: "vente_invalide" };

  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/v1/journeys/sale`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        amount: Number(amount),
        currency,
        email: email ?? undefined,
        // L'identifiant de commande sert DEUX fois : idempotence (un achat rejoué
        // ne double pas) et déduplication Pixel ↔ Conversions API.
        external_ref: orderId,
        event_id: orderId,
        ...(category ? { category } : {}),
        occurred_at: new Date().toISOString(),
        // Un achat confirmé est une conversion à mesurer : on autorise l'envoi
        // vers les régies (côté serveur, l'acheteuse n'est plus là pour choisir).
        consent: { ads: true, analytics: true },
      }),
    });
    if (!res.ok) return { notifie: false, raison: `arazzo_${res.status}` };
    return { notifie: true };
  } catch (e) {
    return { notifie: false, raison: String((e as { name?: string })?.name ?? e) };
  } finally {
    clearTimeout(minuteur);
  }
}
