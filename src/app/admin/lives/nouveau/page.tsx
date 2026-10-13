import { redirect } from "next/navigation";
import { espaceAdmin } from "@/lib/espace/load";
import { EcranNouveauLive } from "@/app/admin/lives/_ecrans/nouveau";

export const metadata = { title: "Programmer un live — Admin" };
export const dynamic = "force-dynamic";

type P = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: P }) {
  const espace = await espaceAdmin();
  if (!espace) redirect("/dashboard");
  return <EcranNouveauLive espace={espace} searchParams={searchParams} />;
}
