import { cookies } from "next/headers";
import { SalesPage, type CourseOption, type PayInfo } from "./sales-page";
import { normLang, isRtl } from "./offre-i18n";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Arazzo Formation — Apprends la couture de zéro | تعلّمي الخياطة من الصفر",
  description: "Transforme ta passion en projet rentable : couture & modélisme de zéro, depuis chez toi. Teste ton niveau, choisis ta formation et inscris-toi. FR / AR / EN.",
};

export default async function OffrePage() {
  const lang = normLang((await cookies()).get("lang")?.value);
  const admin = createAdminClient();

  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, slug, niveau, prix_dzd, thumbnail")
    .eq("published", true)
    .order("ordre", { ascending: true });

  const options: CourseOption[] = (courses ?? []).map((c) => ({
    id: c.id,
    titre: c.titre_fr ?? "Formation",
    niveau: (c.niveau as string) ?? "debutant",
    prixDzd: Number(c.prix_dzd) || 0,
    thumbnail: c.thumbnail ?? null,
    slug: c.slug ?? "",
  }));

  let pay: PayInfo | null = null;
  try {
    const { data } = await admin
      .from("ccp_config").select("account_number, account_key, beneficiary_name, rip").eq("is_active", true).limit(1).maybeSingle();
    pay = data ?? null;
  } catch { /* pas de config */ }

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"}>
      <SalesPage lang={lang} courses={options} pay={pay} />
    </div>
  );
}
