import { redirect } from "next/navigation";
import { espaceFormatrice } from "@/lib/espace/load";
import { EcranModifierLive } from "@/app/admin/lives/_ecrans/modifier";

export const metadata = { title: "Modifier un live — Formatrice" };
export const dynamic = "force-dynamic";

type P = Record<string, string | string[] | undefined>;

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: P }) {
  const espace = await espaceFormatrice();
  if (!espace) redirect("/dashboard");
  return <EcranModifierLive espace={espace} params={params} searchParams={searchParams} />;
}
