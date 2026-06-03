import * as React from "react";
import { EmailLayout, ItemsTable } from "./layout";

export interface OrderReceivedProps {
  customerName: string;
  orderNumber: string;
  items: { title: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: "ccp" | "paypal" | "cod" | "transfer";
}

const INSTRUCTIONS: Record<string, string> = {
  ccp: "Effectuez le versement CCP / BaridiMob, puis envoyez votre reçu depuis votre espace pour validation.",
  paypal: "Votre paiement PayPal est en cours de traitement. Vous recevrez une confirmation dès qu'il sera validé.",
  cod: "Votre commande sera réglée à la livraison. Nous vous contacterons pour l'expédition.",
  transfer: "Effectuez le virement bancaire avec le montant total, puis confirmez. Votre commande sera validée à réception.",
};

/** Email envoyé dès la réception d'une commande : résumé + instructions de paiement. */
export function OrderReceivedEmail({ customerName, orderNumber, items, total, paymentMethod }: OrderReceivedProps) {
  return (
    <EmailLayout title={`Commande ${orderNumber} bien reçue ✅`}>
      <p style={{ margin: "0 0 12px" }}>Bonjour {customerName},</p>
      <p style={{ margin: "0 0 12px" }}>
        Merci pour votre commande ! Voici le récapitulatif :
      </p>
      <ItemsTable items={items} total={total} />
      <div style={{ marginTop: 18, background: "#F5F0EB", borderRadius: 10, padding: "14px 16px" }}>
        <p style={{ margin: 0, fontWeight: "bold", color: "#4B3BC7" }}>Prochaine étape</p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>{INSTRUCTIONS[paymentMethod]}</p>
      </div>
    </EmailLayout>
  );
}
