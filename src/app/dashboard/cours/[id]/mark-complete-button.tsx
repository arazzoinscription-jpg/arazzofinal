"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function MarkCompleteButton({
  lessonId,
  courseId,
  isCompleted,
}: {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
}) {
  const [done, setDone] = useState(isCompleted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (done) {
      await supabase
        .from("progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
      setDone(false);
    } else {
      await supabase.from("progress").upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      });
      setDone(true);

      // Check if course is 100% complete → issue certificate
      await fetch("/api/certificates/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
        done
          ? "bg-green-100 text-green-700 border border-green-300"
          : "bg-orange-DEFAULT text-white hover:bg-orange-600"
      }`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : done ? (
        "✅"
      ) : (
        "☐"
      )}
      {done ? "Leçon terminée" : "Marquer comme terminée"}
    </button>
  );
}
