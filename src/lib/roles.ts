// Rôles multiples — un compte peut cumuler plusieurs espaces
// (ex. formateur + patronniste). Module PUR (client-safe : aucun import serveur).
//
// Modèle : `users.roles` (text[]) = ENSEMBLE des rôles accordés (source de vérité
// pour l'accès). `users.role` = rôle « principal » (le plus élevé) gardé en
// synchro pour l'affichage et le routage par défaut.

export type Role = "eleve" | "formateur" | "patronniste" | "admin";

export const ALL_ROLES: Role[] = ["eleve", "formateur", "patronniste", "admin"];

// Priorité pour déterminer le rôle « principal » affiché.
const PRIORITY: Role[] = ["admin", "formateur", "patronniste", "eleve"];

type ProfileLike = { role?: string | null; roles?: string[] | null } | null | undefined;

/** Ensemble normalisé des rôles d'un profil ('eleve' toujours présent). */
export function getRoles(profile: ProfileLike): Role[] {
  const set = new Set<Role>(["eleve"]);
  const primary = profile?.role;
  if (primary && (ALL_ROLES as string[]).includes(primary)) set.add(primary as Role);
  for (const r of profile?.roles ?? []) {
    if ((ALL_ROLES as string[]).includes(r)) set.add(r as Role);
  }
  return ALL_ROLES.filter((r) => set.has(r));
}

/**
 * Le profil possède-t-il ce rôle ? L'admin implique tous les espaces
 * (comportement historique conservé).
 */
export function hasRole(profile: ProfileLike, role: Role): boolean {
  const roles = getRoles(profile);
  if (role === "admin") return roles.includes("admin");
  return roles.includes(role) || roles.includes("admin");
}

export function isFormateur(profile: ProfileLike): boolean {
  return hasRole(profile, "formateur");
}

export function isPatronniste(profile: ProfileLike): boolean {
  return hasRole(profile, "patronniste");
}

export function isAdmin(profile: ProfileLike): boolean {
  return hasRole(profile, "admin");
}

/** « Staff » = accès à un espace pro quelconque (formateur, patronniste ou admin). */
export function isStaff(profile: ProfileLike): boolean {
  return isFormateur(profile) || isPatronniste(profile) || isAdmin(profile);
}

/** Rôle principal (le plus élevé) — pour l'affichage et le routage par défaut. */
export function primaryRole(roles: string[] | ProfileLike): Role {
  const list = Array.isArray(roles) ? getRoles({ roles }) : getRoles(roles);
  return PRIORITY.find((r) => list.includes(r)) ?? "eleve";
}

/** Ajoute un rôle à l'ensemble (retourne un nouvel ensemble trié + dédupliqué). */
export function addRole(current: string[] | null | undefined, role: Role): Role[] {
  return getRoles({ roles: [...(current ?? []), role] });
}

/** Retire un rôle de l'ensemble ('eleve' est toujours conservé). */
export function removeRole(current: string[] | null | undefined, role: Role): Role[] {
  if (role === "eleve") return getRoles({ roles: current ?? [] });
  return getRoles({ roles: (current ?? []).filter((r) => r !== role) });
}
