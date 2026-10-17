/**
 * Le PREMIER espace qui s'ouvre pour un compte (règle PURE, testable) :
 *  - une formatrice → son espace formateur (jamais l'espace élève en premier) ;
 *  - une patronniste → son espace patronniste ;
 *  - l'administration et les élèves : comme avant (le feed après la connexion, « Mon espace » = espace élève).
 * L'espace élève reste accessible à toutes par « Changer d'espace ».
 */
export function espaceAccueil(roles: readonly string[], depuis: "connexion" | "lien"): string {
  if (!roles.includes("admin")) {
    if (roles.includes("formateur")) return "/formateur";
    if (roles.includes("patronniste")) return "/patronniste";
  }
  return depuis === "connexion" ? "/communaute" : "/dashboard";
}
