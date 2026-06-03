import * as React from "react";
import { EmailLayout } from "./layout";

export interface PaymentApprovedProps {
  customerName: string;
  orderNumber: string;
  invoiceUrl?: string | null;
  dashboardUrl: string;
}

/** Email envoyé quand le paiement est approuvé : confirmation + facture + dashboard. */
export function PaymentApprovedEmail({ customerName, orderNumber, invoiceUrl, dashboardUrl }: PaymentApprovedProps) {
  return (
    <EmailLayout
      title="Paiement confirmé 🎉"
      cta={{ label: "Accéder à mon espace", href: dashboardUrl }}
      secondary={
        invoiceUrl ? (
          <p style={{ textAlign: "center", fontSize: 14, margin: 0 }}>
            <a href={invoiceUrl} style={{ color: "#E07840", fontWeight: "bold" }}>📄 Télécharger ma facture (PDF)</a>
          </p>
        ) : null
      }
    >
      <p style={{ margin: "0 0 12px" }}>Bonjour {customerName},</p>
      <p style={{ margin: "0 0 12px" }}>
        Bonne nouvelle ! Le paiement de votre commande <strong>{orderNumber}</strong> a été
        <strong> approuvé</strong>. Votre commande est désormais confirmée.
      </p>
      <p style={{ margin: 0 }}>
        Vous trouverez votre facture ci-dessous et l'accès à vos achats dans votre espace.
      </p>
    </EmailLayout>
  );
}
