import { cookies } from "next/headers";
import { normLang } from "@/lib/store-i18n";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion — Arazzo Formation" };

export default async function LoginPage() {
  const lang = normLang((await cookies()).get("lang")?.value);
  return <LoginForm lang={lang} />;
}
