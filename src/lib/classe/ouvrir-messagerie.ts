import { EVENEMENT_MESSAGERIE, type DetailMessagerie } from "./communication";

/** Ouvre la bulle « Messagerie » du site (sur une personne si `detail.id`). N'envoie rien. Navigateur uniquement. */
export function ouvrirMessagerie(detail: DetailMessagerie = {}) {
  window.dispatchEvent(new CustomEvent<DetailMessagerie>(EVENEMENT_MESSAGERIE, { detail }));
}
