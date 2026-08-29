/**
 * Date-limite qui sépare les anciens élèves importés de Telegram des nouveaux
 * candidats. L'export WordPress date du 2026-06-01 : toutes les inscriptions
 * migrées portent un `paid_at` historique (≤ cette date) ET n'ont pas d'`order_id`
 * (elles n'ont jamais transité par la boutique du nouveau site). Toute inscription
 * postérieure (achat en boutique ou inscription manuelle) est un NOUVEAU candidat
 * et ne doit JAMAIS voir le popup de preuve Telegram.
 *
 * ⚠️ Ne pas confondre avec `amount = 0` : le flux de paiement normal
 * (enrollAfterPayment) et l'inscription manuelle créent des inscriptions à 0 DA.
 * Le montant n'est donc PAS un marqueur d'import fiable.
 *
 * (Constante isolée ici, hors du fichier "use server", car un module d'actions
 * serveur ne peut exporter que des fonctions async.)
 */
export const TELEGRAM_IMPORT_CUTOFF = "2026-06-02T00:00:00Z";
