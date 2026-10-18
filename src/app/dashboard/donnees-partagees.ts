import "server-only";
import { cache } from "react";
import { getTelegramProofState } from "./telegram-proof-actions";

/** Preuve de paiement Telegram : lue UNE fois par requête (le gabarit ET la page du tableau de bord en ont besoin). */
export const etatPreuveTelegram = cache((userId: string) => getTelegramProofState(userId));
