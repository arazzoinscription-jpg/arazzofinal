import "server-only";
import * as React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  date: string; // ISO
  customer: { name: string | null; email: string | null; address: string | null; city: string | null; wilaya: string | null; country: string | null };
  items: { title: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
}

const VIOLET = "#4B3BC7";
const ORANGE = "#E07840";
const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 10, color: "#333", fontFamily: "Helvetica" },
  header: { backgroundColor: VIOLET, paddingVertical: 22, paddingHorizontal: 32, color: "#fff" },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 9, color: "#E6E1FF", marginTop: 2 },
  body: { padding: 32 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { color: "#888", fontSize: 9 },
  metaValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 1 },
  blockTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4, color: VIOLET },
  tableHead: { flexDirection: "row", backgroundColor: "#F5F0EB", paddingVertical: 6, paddingHorizontal: 8, marginTop: 22 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555" },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  cTitle: { width: "58%" },
  cQty: { width: "12%", textAlign: "center" },
  cPrice: { width: "30%", textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: "#ddd" },
  grandLabel: { fontFamily: "Helvetica-Bold", fontSize: 12, color: VIOLET },
  grandValue: { fontFamily: "Helvetica-Bold", fontSize: 12, color: ORANGE },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#F5F0EB", padding: 16, textAlign: "center" },
  footerText: { fontSize: 8, color: "#999" },
});

function InvoiceDocument({ d }: { d: InvoiceData }) {
  const date = new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const loc = [d.customer.address, d.customer.city, d.customer.wilaya, d.customer.country].filter(Boolean).join(", ");
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* En-tête : logo + nom + identité */}
        <View style={s.header}>
          <Text style={s.brand}>ARAZZO</Text>
          <Text style={s.brandSub}>Formation & Boutique — Couture & Modelisme</Text>
          <Text style={s.brandSub}>formation-arazzo.store</Text>
        </View>

        <View style={s.body}>
          {/* Numéro + date + client */}
          <View style={s.rowBetween}>
            <View>
              <Text style={s.metaLabel}>Facture N°</Text>
              <Text style={s.metaValue}>{d.invoiceNumber}</Text>
              <Text style={[s.metaLabel, { marginTop: 6 }]}>Commande</Text>
              <Text style={s.metaValue}>{d.orderNumber}</Text>
              <Text style={[s.metaLabel, { marginTop: 6 }]}>Date</Text>
              <Text style={s.metaValue}>{date}</Text>
            </View>
            <View style={{ width: "48%" }}>
              <Text style={s.blockTitle}>Facturé à</Text>
              <Text>{d.customer.name ?? "—"}</Text>
              {d.customer.email ? <Text>{d.customer.email}</Text> : null}
              {loc ? <Text>{loc}</Text> : null}
            </View>
          </View>

          {/* Tableau produits */}
          <View style={s.tableHead}>
            <Text style={[s.th, s.cTitle]}>Article</Text>
            <Text style={[s.th, s.cQty]}>Qté</Text>
            <Text style={[s.th, s.cPrice]}>Total</Text>
          </View>
          {d.items.map((it, i) => (
            <View style={s.tr} key={i}>
              <Text style={s.cTitle}>{it.title}</Text>
              <Text style={s.cQty}>{it.quantity}</Text>
              <Text style={s.cPrice}>{fmt(it.price * it.quantity)}</Text>
            </View>
          ))}

          {/* Totaux */}
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={{ color: "#666" }}>Sous-total</Text>
              <Text>{fmt(d.subtotal)}</Text>
            </View>
            {d.discount > 0 ? (
              <View style={s.totalRow}>
                <Text style={{ color: "#666" }}>Remise</Text>
                <Text>- {fmt(d.discount)}</Text>
              </View>
            ) : null}
            <View style={s.grandTotal}>
              <Text style={s.grandLabel}>TOTAL</Text>
              <Text style={s.grandValue}>{fmt(d.total)}</Text>
            </View>
          </View>
        </View>

        {/* Pied */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Merci pour votre achat sur Arazzo — formation-arazzo.store</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Génère le PDF de facture et retourne un Buffer. */
export async function buildInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument d={data} />);
}

/** Chemin de stockage : invoices/{année}/{numéro}.pdf */
export function invoiceStoragePath(invoiceNumber: string, date: string): string {
  const year = new Date(date).getFullYear();
  return `${year}/${invoiceNumber}.pdf`;
}
