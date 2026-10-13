import { redirect } from "next/navigation";
import { espaceAdmin } from "@/lib/espace/load";
import { EcranLives } from "@/app/admin/lives/_ecrans/liste";

export const metadata = { title: "Lives pédagogiques — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type P = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: P }) {
  const espace = await espaceAdmin();
  if (!espace) redirect("/dashboard");
  return <EcranLives espace={espace} searchParams={searchParams} />;
}
