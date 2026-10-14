import { redirect } from "next/navigation";
import { espaceAdmin } from "@/lib/espace/load";
import { EcranFicheLive } from "@/app/admin/lives/_ecrans/fiche";

export const metadata = { title: "Live — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type P = Record<string, string | string[] | undefined>;

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: P }) {
  const espace = await espaceAdmin();
  if (!espace) redirect("/dashboard");
  return <EcranFicheLive espace={espace} params={params} searchParams={searchParams} />;
}
