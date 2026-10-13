import { redirect } from "next/navigation";
import { espaceAdmin } from "@/lib/espace/load";
import { EcranClasse } from "@/app/admin/classe/_ecrans/classe";

export const metadata = { title: "Ma classe — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type P = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: P }) {
  const espace = await espaceAdmin();
  if (!espace) redirect("/dashboard");
  return <EcranClasse espace={espace} searchParams={searchParams} />;
}
