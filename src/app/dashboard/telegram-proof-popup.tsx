"use client";

import { useState } from "react";
import { X, UploadCloud, Loader2, CheckCircle2, ShieldAlert, CreditCard, CalendarClock, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTelegramProofUploadUrl, recordTelegramProof } from "./telegram-proof-actions";

type PayType = "total" | "abonnement";
const MAX = 10 * 1024 * 1024;
const TELEGRAM = "0552397077";
// Numéro international (Algérie) pour le lien Telegram : 0552397077 → +213552397077.
const TELEGRAM_LINK = "https://t.me/+213552397077";

/**
 * Popup (refermable, en arabe) pour les étudiantes importées (inscription 0 DA,
 * déjà payées sur Telegram). Deux choix :
 *   • دفعة كاملة (paiement total) → une seule photo
 *   • اشتراك (abonnement/tranches) → plusieurs photos
 * Réapparaît à chaque visite tant que la preuve n'est pas envoyée.
 * Ne crée aucune inscription payante (aucun impact sur les gains).
 */
export function TelegramProofPopup({ blocking = false }: { blocking?: boolean }) {
  const [open, setOpen] = useState(true);
  const [pay, setPay] = useState<PayType | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  // En mode blocage (compte fermé après 7 jours), le popup ne peut pas être fermé.
  if (!open && !blocking) return null;

  function chooseFiles(list: FileList | null) {
    const arr = list ? Array.from(list) : [];
    if (arr.some((f) => f.size > MAX)) { setErr("حجم كل صورة يجب أن لا يتجاوز 10 ميغا."); return; }
    if (arr.length > 20) { setErr("عدد كبير جدًا من الصور (20 كحد أقصى)."); return; }
    setErr("");
    setFiles(pay === "total" ? arr.slice(0, 1) : arr);
  }

  async function submit() {
    if (!pay) { setErr("اختاري طريقة الدفع أولًا."); return; }
    if (files.length === 0) { setErr("اختاري صورة الإثبات."); return; }
    setErr(""); setBusy(true);
    try {
      const supabase = createClient();
      const paths: string[] = [];
      for (const f of files) {
        const ext = (f.name.split(".").pop() ?? "").toLowerCase();
        const prep = await createTelegramProofUploadUrl(ext);
        if (!prep.ok) { setErr(prep.error); return; }
        const { error: upErr } = await supabase.storage.from("proofs").uploadToSignedUrl(prep.path, prep.token, f);
        if (upErr) { setErr("فشل إرسال أحد الملفات. أعيدي المحاولة."); return; }
        paths.push(prep.path);
      }
      const rec = await recordTelegramProof(paths, pay);
      if (!rec.ok) { setErr(rec.error); return; }
      setDone(true);
    } catch {
      setErr("حدث خطأ. أعيدي المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="tg-proof-title">
      <div className="relative w-full max-w-md bg-white dark:bg-[#15111f] rounded-3xl shadow-2xl border border-cream-200 dark:border-white/10 overflow-hidden max-h-[92vh] overflow-y-auto">
        {!blocking && (
          <button onClick={() => setOpen(false)} aria-label="إغلاق"
            className="absolute top-3.5 start-3.5 z-10 w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 flex items-center justify-center text-gray-500 dark:text-white/70">
            <X size={18} />
          </button>
        )}

        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-2">تم استلام الإثبات ✅</h2>
            <p className="text-gray-600 dark:text-white/70 mb-6" style={{ lineHeight: 1.9 }}>
              شكرًا لكِ! تم تسجيل إثبات الدفع عبر تيليغرام. سيقوم فريقنا بالتحقق منه.
            </p>
            <button onClick={() => (blocking ? window.location.reload() : setOpen(false))}
              className="w-full bg-violet-600 text-white py-3 rounded-2xl font-semibold hover:bg-violet-700">
              {blocking ? "الدخول إلى حسابي" : "إغلاق"}
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-2.5 mb-3">
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${blocking ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                <ShieldAlert size={22} />
              </span>
              <h2 id="tg-proof-title" className="font-playfair text-xl font-bold text-gray-900 dark:text-white">
                {blocking ? "تم تعليق حسابكِ" : "إثبات الدفع مطلوب"}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-white/70 text-sm mb-5" style={{ lineHeight: 2 }}>
              {blocking
                ? <>لقد مرّ أكثر من أسبوع دون إرسال إثبات الدفع، لذلك تم <strong>إغلاق حسابكِ مؤقتًا</strong>. لاستعادة الدخول، ارفعي الآن <strong>إثبات الدفع الذي قمتِ به على تيليغرام</strong>.</>
                : <>تم استيراد حسابكِ من تيليغرام. لتأكيد وصولكِ الكامل، يجب رفع <strong> إثبات الدفع الذي قمتِ به سابقًا على تيليغرام</strong>.</>}
            </p>

            {/* Choix du type de paiement */}
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-2">كيف تم الدفع؟</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button type="button" onClick={() => { setPay("total"); setFiles([]); setErr(""); }}
                className={`rounded-2xl border-2 p-3 text-center transition-colors ${pay === "total" ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10" : "border-gray-200 dark:border-white/15 hover:border-orange-300"}`}>
                <CreditCard size={22} className="mx-auto mb-1.5 text-orange-600" />
                <span className="block font-bold text-gray-900 dark:text-white text-sm">دفعة كاملة</span>
                <span className="block text-[11px] text-gray-500 dark:text-white/50 mt-0.5">صورة واحدة للإيصال</span>
              </button>
              <button type="button" onClick={() => { setPay("abonnement"); setFiles([]); setErr(""); }}
                className={`rounded-2xl border-2 p-3 text-center transition-colors ${pay === "abonnement" ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10" : "border-gray-200 dark:border-white/15 hover:border-orange-300"}`}>
                <CalendarClock size={22} className="mx-auto mb-1.5 text-violet-600" />
                <span className="block font-bold text-gray-900 dark:text-white text-sm">اشتراك (بالتقسيط)</span>
                <span className="block text-[11px] text-gray-500 dark:text-white/50 mt-0.5">عدة صور — إيصال كل دفعة</span>
              </button>
            </div>

            {/* Upload (visible après le choix) */}
            {pay && (
              <label className="block">
                <div className="flex items-center gap-3 border-2 border-dashed border-violet-200 dark:border-white/15 rounded-2xl px-4 py-4 cursor-pointer hover:bg-violet-50/50 dark:hover:bg-white/5">
                  <UploadCloud size={22} className="text-violet-500 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-white/70 truncate">
                    {files.length === 0
                      ? (pay === "total" ? "اختاري صورة الإيصال (JPG، PNG، PDF)" : "اختاري صور جميع الدفعات")
                      : (files.length === 1 ? files[0].name : `${files.length} صور محدّدة`)}
                  </span>
                  <input type="file" accept="image/*,application/pdf" multiple={pay === "abonnement"}
                    className="hidden" onChange={(e) => chooseFiles(e.target.files)} />
                </div>
              </label>
            )}

            {err && <p className="text-sm text-red-500 mt-3">{err}</p>}

            {/* Avertissement : fermeture du compte après une semaine + contact */}
            <div className="mt-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4">
              <p className="text-[13px] text-red-800 dark:text-red-200" style={{ lineHeight: 1.95 }}>
                ⚠️ بعد <strong>أسبوع واحد</strong> من هذا الإشعار، سيتم <strong>إغلاق حسابكِ على أرازو</strong> إلى
                غاية تقديم الإثبات النهائي للدفع. لأي استفسار، تواصلي مع الأستاذة عبر تيليغرام:{" "}
                <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="font-bold underline whitespace-nowrap">
                  {TELEGRAM}
                </a>
              </p>
            </div>

            <div className="flex items-center gap-3 mt-5">
              {!blocking && (
                <button onClick={() => setOpen(false)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-gray-600 dark:text-white/70 border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5">
                  لاحقًا
                </button>
              )}
              <button onClick={submit} disabled={busy || !pay || files.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-2xl font-bold hover:bg-orange-600 disabled:opacity-50">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} إرسال
              </button>
            </div>
            {blocking ? (
              <form action="/api/auth/signout" method="POST" className="mt-3 text-center">
                <button type="submit" className="text-[12px] text-gray-400 dark:text-white/40 underline">تسجيل الخروج</button>
              </form>
            ) : (
              <p className="text-[11px] text-gray-400 dark:text-white/40 text-center mt-3">
                سيظهر هذا التذكير في كل مرة إلى أن ترسلي الإثبات.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
