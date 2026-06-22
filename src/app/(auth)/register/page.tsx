import { cookies } from "next/headers";
import { normLang } from "@/lib/store-i18n";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Créer un compte — Arazzo Formation" };

export default async function RegisterPage() {
  const lang = normLang((await cookies()).get("lang")?.value);
  return <RegisterForm lang={lang} />;
}
