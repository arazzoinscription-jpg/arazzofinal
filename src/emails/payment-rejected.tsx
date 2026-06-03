import * as React from "react";
import { EmailLayout } from "./layout";

export interface PaymentRejectedProps {
  customerName: string;
  orderNumber: string;
  reason: string;
  resubmitUrl: string;
}

/** Email envoyé quand une preuve de paiement est refusée : raison + re-soumettre. */
export function PaymentRejectedEmail({ customerName, orderNumber, reason, resubmitUrl }: PaymentRejectedProps) {
  return (
    <EmailLayout title="Votre preuve de paiement a été refusée" cta={{ label: "Renvoyer une preuve", href: resubmitUrl }}>
      <p style={{ margin: "0 0 12px" }}>Bonjour {customerName},</p>
      <p style={{ margin: "0 0 12px" }}>
        Malheureusement, la preuve de paiement de votre commande <strong>{orderNumber}</strong> n'a pas pu être validée.
      </p>
      <div style={{ background: "#FDECEC", borderRadius: 10, padding: "14px 16px", margin: "0 0 12px" }}>
        <p style={{ margin: 0, fontWeight: "bold", color: "#C0392B" }}>Motif</p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>{reason}</p>
      </div>
      <p style={{ margin: 0 }}>
        Pas d'inquiétude : vous pouvez renvoyer une nouvelle preuve depuis votre espace en cliquant ci-dessous.
      </p>
    </EmailLayout>
  );
}
