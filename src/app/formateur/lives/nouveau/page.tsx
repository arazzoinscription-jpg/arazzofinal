import { redirect } from "next/navigation";
import { espaceFormatrice } from "@/lib/espace/load";
import { EcranNouveauLive } from "@/app/admin/lives/_ecrans/nouveau";

export const metadata = { title: "Programmer un live — Formatrice" };
export const dynamic = "force-dynamic";

type P = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: P }) {
  const espace = await espaceFormatrice();
  if (!espace) redirect("/dashboard");
  return <EcranNouveauLive espace={espace} searchParams={searchParams} />;
}
