import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mes certificats — Arazzo Formation" };

export default async function CertificatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: certificates } = await supabase
    .from("certificates")
    .select(`*, course:courses(titre_fr, thumbnail)`)
    .eq("user_id", user!.id)
    .order("issued_at", { ascending: false });

  const { data: profile } = await supabase
    .from("users")
    .select("nom")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">
          Mes certificats
        </h1>
        <p className="text-gray-500 mt-1">
          Téléchargez vos certificats de réussite
        </p>
      </div>

      {!certificates?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">🎓</div>
          <p className="text-xl text-gray-400 mb-2">
            Pas encore de certificat
          </p>
          <p className="text-gray-400 text-sm">
            Terminez un cours pour obtenir votre certificat automatiquement
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {certificates.map((cert) => {
            const course = cert.course as any;
            const issuedDate = new Date(cert.issued_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <div
                key={cert.id}
                className="bg-white rounded-2xl border border-cream-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Certificate preview */}
                <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 p-8 text-white text-center">
                  <div className="text-5xl mb-3">🎓</div>
                  <p className="text-violet-200 text-sm mb-2">Certificat de réussite</p>
                  <h3 className="font-playfair text-xl font-bold">
                    {course?.titre_fr}
                  </h3>
                  <p className="text-violet-200 mt-2">
                    Décerné à {profile?.nom}
                  </p>
                  <p className="text-violet-300 text-sm mt-1">{issuedDate}</p>
                </div>
                <div className="p-5 flex gap-3">
                  <a
                    href={`/api/certificates/${cert.uuid_public}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm"
                  >
                    ⬇️ Télécharger PDF
                  </a>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${process.env.NEXT_PUBLIC_SITE_URL}/certificat/${cert.uuid_public}`
                      )
                    }
                    className="px-4 py-2.5 border border-cream-200 rounded-xl text-gray-600 hover:bg-cream-50 transition-colors text-sm font-semibold"
                  >
                    🔗 Partager
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
