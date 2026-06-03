import * as React from "react";
import { EmailLayout } from "./layout";

export interface ResubmitProofProps {
  customerName: string;
  orderNumber: string;
  adminNote: string;
  resubmitUrl: string;
}

/** Email envoyé quand l'admin demande une nouvelle preuve : message + bouton. */
export function ResubmitProofEmail({ customerName, orderNumber, adminNote, resubmitUrl }: ResubmitProofProps) {
  return (
    <EmailLayout title="Une nouvelle preuve est nécessaire" cta={{ label: "Envoyer une nouvelle preuve", href: resubmitUrl }}>
      <p style={{ margin: "0 0 12px" }}>Bonjour {customerName},</p>
      <p style={{ margin: "0 0 12px" }}>
        Concernant votre commande <strong>{orderNumber}</strong>, notre équipe a besoin d'une preuve de paiement complémentaire.
      </p>
      <div style={{ background: "#FFF6E9", borderRadius: 10, padding: "14px 16px", margin: "0 0 12px" }}>
        <p style={{ margin: 0, fontWeight: "bold", color: "#E07840" }}>Message de l'équipe</p>
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>{adminNote}</p>
      </div>
      <p style={{ margin: 0 }}>Merci de renvoyer un justificatif clair et lisible via le bouton ci-dessous.</p>
    </EmailLayout>
  );
}
