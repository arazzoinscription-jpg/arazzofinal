"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCoursePublish } from "../actions";

export function PublishToggle({ courseId, published }: { courseId: string; published: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(published);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await toggleCoursePublish(courseId, next);
      if (!res.ok) setOn(!next);
      else router.refresh();
    });
  }

  return (
    <button onClick={toggle} disabled={isPending} role="switch" aria-checked={on}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? "bg-green-500" : "bg-gray-300"}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}
