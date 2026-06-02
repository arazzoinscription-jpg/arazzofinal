import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const metadata = { title: "Vérification de certificat — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function CertificateVerifyPage({
  params,
}: {
  params: { uuid: string };
}) {
  const admin = createAdminClient();
  const { data: cert } = await admin
    .from("certificates")
    .select(`numero, issued_at, uuid_public, user:users(nom, ville, pays), course:courses(titre_fr)`)
    .eq("uuid_public", params.uuid)
    .maybeSingle();

  const valid = !!cert;
  const user = cert?.user as { nom?: string; ville?: string; pays?: string } | null;
  const course = cert?.course as { titre_fr?: string } | null;
  const date = cert
    ? new Date(cert.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-blush-mesh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-orange-DEFAULT text-3xl">✂️</span>
          <div>
            <div className="font-playfair font-bold text-violet-DEFAULT text-2xl">ARAZZO</div>
            <div className="font-playfair italic text-orange-DEFAULT text-sm -mt-1">Formation</div>
          </div>
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl border border-cream-200 overflow-hidden">
          {valid ? (
            <>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 text-center text-white">
                <div className="text-6xl mb-3">✅</div>
                <h1 className="font-playfair text-2xl font-bold">Certificat authentique</h1>
                <p className="text-green-100 mt-1 font-dm">Ce certificat est valide et vérifié</p>
              </div>
              <div className="p-8 space-y-4">
                <Row label="Titulaire" value={user?.nom ?? "—"} />
                <Row label="Formation" value={course?.titre_fr ?? "—"} />
                <Row label="Délivré le" value={date ?? "—"} />
                {cert?.numero && <Row label="N° de certificat" value={cert.numero} mono />}
                {user?.ville && <Row label="Localisation" value={`${user.ville}${user.pays ? ", " + user.pays : ""}`} />}

                <div className="pt-4 border-t border-cream-200 text-center">
                  <a
                    href={`/api/certificates/${cert!.uuid_public}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-violet-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                  >
                    📄 Voir le certificat PDF
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="font-playfair text-2xl font-bold text-gray-900 mb-2">
                Certificat introuvable
              </h1>
              <p className="text-gray-500 font-dm">
                Aucun certificat ne correspond à cette référence. Vérifiez le lien ou le QR code.
              </p>
            </div>
          )}
          <div className="bg-cream-50 px-6 py-4 text-center text-xs text-gray-400 font-dm">
            Vérification officielle · <span className="text-violet-DEFAULT">arazzo.formation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-sm text-gray-400 font-dm flex-shrink-0">{label}</span>
      <span className={`font-semibold text-gray-900 text-right ${mono ? "font-mono text-sm" : "font-dm"}`}>{value}</span>
    </div>
  );
}
