import { redirect } from "next/navigation";
import { espaceFormatrice } from "@/lib/espace/load";
import { EcranFicheClasse } from "@/app/admin/classe/_ecrans/fiche";

export const metadata = { title: "Fiche élève — Formatrice" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type P = Record<string, string | string[] | undefined>;

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: P }) {
  const espace = await espaceFormatrice();
  if (!espace) redirect("/dashboard");
  return <EcranFicheClasse espace={espace} params={params} searchParams={searchParams} />;
}
