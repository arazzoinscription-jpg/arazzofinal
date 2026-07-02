import "server-only";
import * as React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface FicheInscription {
  fullName: string;
  formation: string;
  orderNumber: string;
  link: string;        // lien d'accès branché (/acces/<token>) encodé dans le QR
  qrDataUrl: string;   // PNG data:image/... du QR
}

const VIOLET = "#5B16F9";
const NIGHT = "#1C0659";
const ORANGE = "#FE7223";
const CREAM = "#F5F0EB";

const s = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", color: NIGHT, backgroundColor: "#fff" },
  card: { border: `2 solid ${CREAM}`, borderRadius: 18, overflow: "hidden", height: "100%" },
  band: { height: 8, backgroundColor: ORANGE },
  header: { backgroundColor: NIGHT, paddingVertical: 22, paddingHorizontal: 28, color: "#fff", alignItems: "center" },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#fff" },
  brandSub: { fontSize: 9, color: "#C6AEFD", marginTop: 2, letterSpacing: 2 },
  congrats: { fontSize: 26, fontFamily: "Helvetica-Bold", color: ORANGE, textAlign: "center", marginTop: 20 },
  congratsSub: { fontSize: 12, color: "#555", textAlign: "center", marginTop: 6 },
  body: { paddingHorizontal: 34, paddingTop: 14 },
  label: { fontSize: 9, color: "#9b8fb0", letterSpacing: 1, textTransform: "uppercase" },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", color: NIGHT, marginTop: 2 },
  formation: { fontSize: 14, fontFamily: "Helvetica-Bold", color: VIOLET, marginTop: 2 },
  motiv: { fontSize: 11, color: "#444", lineHeight: 1.5, marginTop: 16, textAlign: "center" },
  qrWrap: { alignItems: "center", marginTop: 18 },
  qr: { width: 168, height: 168 },
  qrCaption: { fontSize: 9, color: "#888", marginTop: 6 },
  steps: { backgroundColor: CREAM, borderRadius: 12, padding: 16, marginTop: 18 },
  stepsTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: VIOLET, marginBottom: 6 },
  step: { fontSize: 10, color: "#444", marginBottom: 4, lineHeight: 1.4 },
  linkLine: { fontSize: 10, color: ORANGE, fontFamily: "Helvetica-Bold", marginTop: 10, textAlign: "center" },
  footer: { position: "absolute", bottom: 22, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9b8fb0" },
});

function Fiche({ f }: { f: FicheInscription }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.card}>
        <View style={s.band} />
        <View style={s.header}>
          <Text style={s.brand}>ARAZZO</Text>
          <Text style={s.brandSub}>FORMATION</Text>
        </View>

        <Text style={s.congrats}>Felicitations !</Text>
        <Text style={s.congratsSub}>Vous etes officiellement inscrite — bon courage dans votre apprentissage</Text>

        <View style={s.body}>
          <Text style={s.label}>Inscrite</Text>
          <Text style={s.name}>{f.fullName || "—"}</Text>
          <Text style={s.label} >Formation</Text>
          <Text style={s.formation}>{f.formation || "—"}</Text>

          <Text style={s.motiv}>
            Bienvenue dans l'atelier Arazzo. Chaque point compte : avancez a votre rythme,
            pratiquez, et vous irez du croquis a la piece finie. Nous sommes fiers de vous compter parmi nos eleves.
          </Text>

          <View style={s.qrWrap}>
            {f.qrDataUrl ? <Image src={f.qrDataUrl} style={s.qr} /> : null}
            <Text style={s.qrCaption}>Votre code d'acces personnel</Text>
          </View>

          <View style={s.steps}>
            <Text style={s.stepsTitle}>Comment acceder a votre espace</Text>
            <Text style={s.step}>1. Ouvrez l'appareil photo de votre telephone.</Text>
            <Text style={s.step}>2. Scannez le code ci-dessus : vous serez connectee automatiquement a votre espace Arazzo.</Text>
            <Text style={s.step}>3. Vous y retrouvez votre formation, vos videos et votre progression.</Text>
            <Text style={s.step}>Astuce : si le code a expire, allez sur le site et utilisez « Mot de passe oublie » avec votre email.</Text>
            <Text style={s.linkLine}>formation-arazzo.store</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text>Commande {f.orderNumber || "—"}</Text>
          <Text>Arazzo Formation</Text>
        </View>
      </View>
    </Page>
  );
}

/** Génère un PDF avec UNE fiche d'inscription par commande. */
export async function generateFichesPdf(fiches: FicheInscription[]): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      {fiches.map((f, i) => <Fiche key={i} f={f} />)}
    </Document>,
  );
}
