import { redirect } from "next/navigation";
import { espaceAdmin } from "@/lib/espace/load";
import { EcranSuivi } from "@/app/admin/suivi/_ecrans/suivi";

export const metadata = { title: "Suivi pédagogique — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type P = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: P }) {
  const espace = await espaceAdmin();
  if (!espace) redirect("/dashboard");
  return <EcranSuivi espace={espace} searchParams={searchParams} />;
}
