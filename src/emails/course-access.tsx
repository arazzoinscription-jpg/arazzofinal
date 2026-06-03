import * as React from "react";
import { EmailLayout } from "./layout";

export interface CourseAccessProps {
  customerName: string;
  courseTitles: string[];
  magicLink: string;
}

/** Email d'accès aux formations achetées : félicitations + magic link "Commencer". */
export function CourseAccessEmail({ customerName, courseTitles, magicLink }: CourseAccessProps) {
  return (
    <EmailLayout
      title="Vos formations vous attendent ✨"
      cta={{ label: "Commencer maintenant", href: magicLink }}
      secondary={
        <p style={{ textAlign: "center", fontSize: 12, color: "#8a8a8a", margin: 0 }}>
          Ce lien de connexion est personnel et valable un temps limité.
        </p>
      }
    >
      <p style={{ margin: "0 0 12px" }}>Félicitations {customerName} ! 🎓</p>
      <p style={{ margin: "0 0 12px" }}>
        Vous avez désormais accès à {courseTitles.length > 1 ? "vos formations" : "votre formation"} :
      </p>
      <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
        {courseTitles.map((t, i) => (
          <li key={i} style={{ fontSize: 15, marginBottom: 4 }}><strong>{t}</strong></li>
        ))}
      </ul>
      <p style={{ margin: 0 }}>
        Cliquez sur le bouton ci-dessous pour vous connecter directement et démarrer votre apprentissage.
      </p>
    </EmailLayout>
  );
}
