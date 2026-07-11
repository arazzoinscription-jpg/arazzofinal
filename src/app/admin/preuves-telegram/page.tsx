import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelegramProofsList, type TgProofRow } from "./telegram-proofs-list";

export const metadata = { title: "Preuve paiement Telegram — Admin Arazzo" };
export const dynamic = "force-dynamic";

export default async function AdminTelegramProofsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  let rows: TgProofRow[] = [];
  try {
    const { data: proofs } = await admin
      .from("telegram_payment_proofs")
      .select("id, status, note, created_at, file_type, user:users(id, nom, email)")
      .order("created_at", { ascending: false });

    const userIds = [...new Set((proofs ?? []).map((p: any) => p.user?.id).filter(Boolean))];
    const coursesByUser = new Map<string, string[]>();
    if (userIds.length) {
      // Inscriptions migrées (0 DA) de ces étudiantes → formations concernées.
      const { data: enr } = await admin
        .from("enrollments")
        .select("user_id, amount, course:courses(titre_fr)")
        .in("user_id", userIds)
        .eq("amount", 0);
      for (const e of (enr ?? []) as any[]) {
        const arr = coursesByUser.get(e.user_id) ?? [];
        if (e.course?.titre_fr) arr.push(e.course.titre_fr);
        coursesByUser.set(e.user_id, arr);
      }
    }

    rows = (proofs ?? []).map((p: any) => ({
      id: p.id,
      status: p.status ?? "received",
      note: p.note ?? null,
      createdAt: p.created_at,
      fileType: p.file_type ?? null,
      studentName: p.user?.nom ?? "—",
      studentEmail: p.user?.email ?? "",
      courses: coursesByUser.get(p.user?.id) ?? [],
    }));
  } catch {
    rows = []; // migration 070 non appliquée
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Send size={26} className="text-sky-500" /> Preuve paiement déjà payé sur Telegram
        </h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Preuves envoyées par les étudiantes importées (inscription à 0 DA). Ces paiements ont été
          effectués sur Telegram et <strong>ne sont pas comptés dans les gains du site</strong>.
        </p>
      </div>
      <TelegramProofsList rows={rows} />
    </div>
  );
}
