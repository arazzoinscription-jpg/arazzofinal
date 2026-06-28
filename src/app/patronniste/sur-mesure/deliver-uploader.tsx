"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { createCustomDeliveryUploadUrl, deliverCustomPatron } from "../patrons/actions";

/** Livraison du fichier patron fini par le patronniste (upload signé → bucket privé). */
export function DeliverUploader({ orderId }: { orderId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const prep = await createCustomDeliveryUploadUrl(orderId, ext);
      if (!prep.ok) { toast(prep.error, "error"); return; }
      const supabase = createClient();
      const { error } = await supabase.storage.from("custom-patrons").uploadToSignedUrl(prep.path, prep.token, file);
      if (error) { toast("Envoi échoué : " + error.message, "error"); return; }
      const rec = await deliverCustomPatron(orderId, prep.path);
      if (rec.ok) { toast("Patron livré ✅ — la cliente peut payer puis télécharger.", "success"); router.refresh(); }
      else toast(rec.error ?? "Erreur", "error");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <>
      <input ref={ref} type="file" accept=".pdf,.zip,.rar,.png,.jpg,.jpeg,.dxf,.plt" hidden onChange={onFile} />
      <button onClick={() => ref.current?.click()} disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-800 disabled:opacity-60 transition-colors">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Livrer le fichier patron
      </button>
    </>
  );
}
