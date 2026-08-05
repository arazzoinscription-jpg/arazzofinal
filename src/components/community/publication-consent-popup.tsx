"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AtSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setCommunityUsername } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";

/**
 * Demande d'autorisation de publication — en arabe, à chaque connexion.
 *
 * Elle revient tant qu'aucune RÉPONSE n'a été donnée. Accepter et refuser sont
 * deux réponses : une fois l'une ou l'autre enregistrée, la fenêtre ne
 * reparaît plus. Continuer à demander après un refus ne serait pas une
 * relance, ce serait une pression — et un consentement obtenu par usure n'en
 * est pas un.
 *
 * Elle n'est pas fermable autrement : pas de croix, pas de clic à l'extérieur.
 * Une fenêtre qu'on peut écarter d'un geste distrait produit un « pas de
 * réponse » qu'on finit par interpréter comme un accord tacite.
 *
 * L'état vient de la BASE, jamais de `localStorage` : un consentement doit
 * survivre à un changement d'appareil et à un vidage de cache.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * ⚠️  TEXTE À RELIRE AVANT LA MISE EN LIGNE.
 *
 * Il décrit fidèlement ce que le système fait — cela, je peux le garantir.
 * Les mots restent ceux de votre école : c'est vous qui parlez à vos élèves.
 * ──────────────────────────────────────────────────────────────────────────── */
const AR = {
  titre: "نشر أعمالكِ على وسائل التواصل",
  intro:
    "نطلب إذنكِ لنشر صور وفيديوهات أعمالكِ التطبيقية على حسابات أرازو في إنستغرام وفيسبوك وعلى موقعنا، مع ملاحظات المدرّبة حولها.",
  jamais:
    "لن نستخدم أبداً اسمكِ ولا لقبكِ ولا صورتكِ الشخصية ولا بريدكِ الإلكتروني ولا أيّ بيانات شخصية. هذه المعلومات لا تخرج من المنصة إطلاقاً.",
  pseudo_phrase: "سيُشار إليكِ باسمكِ المستعار فقط.",
  but: "الهدف من ذلك هو التعريف بالتكوين وتشجيع نساء أخريات على الالتحاق به.",
  liberte:
    "يمكنكِ الرفض دون أن يؤثّر ذلك على تكوينكِ أو متابعتكِ أو نتائجكِ. ويمكنكِ التراجع في أيّ وقت من صفحة ملفكِ الشخصي.",
  pseudo_titre: "اختاري اسماً مستعاراً",
  pseudo_aide:
    "بدونه لا يمكن نشر أيّ شيء يخصّكِ، لأنّ لا شيء يستطيع الإشارة إليكِ.",
  pseudo_placeholder: "مثال: khayt_dhahabi",
  pseudo_bouton: "حفظ الاسم المستعار",
  accepter: "أوافق",
  refuser: "لا أوافق",
  enregistrement: "جارٍ الحفظ…",
  merci: "تمّ تسجيل موافقتكِ. شكراً لكِ.",
  refus_ok: "تمّ تسجيل رفضكِ. لن يُنشر أيّ شيء يخصّكِ.",
};

/** Le texte complet, tel qu'il sera copié dans la ligne de consentement. */
const CONSENT_TEXT = [AR.intro, AR.jamais, AR.pseudo_phrase, AR.but, AR.liberte].join("\n\n");

/** Ni "prenom" ni "photo_profil" : ces données ne sortent pas de la plateforme. */
const SCOPE = ["pseudo", "photos_travaux", "commentaires_formatrice"];

export function PublicationConsentPopup(
  { userId, username }: { userId: string; username: string | null },
) {
  const router = useRouter();
  const supabase = createClient();
  const [pseudo, setPseudo] = useState("");
  const [aPseudo, setAPseudo] = useState(Boolean(username?.trim()));
  const [envoi, setEnvoi] = useState(false);
  const [pending, start] = useTransition();
  const [ferme, setFerme] = useState(false);

  if (ferme) return null;

  function enregistrerPseudo() {
    if (!pseudo.trim()) return;
    start(async () => {
      const res = await setCommunityUsername(pseudo.trim());
      if (res.ok) {
        setAPseudo(true);
        toast(`@${res.username} ✅`, "success");
        router.refresh();
      } else toast(res.error ?? "خطأ", "error");
    });
  }

  async function repondre(granted: boolean) {
    setEnvoi(true);
    // INSERT, jamais UPDATE : chaque décision est une ligne de plus, et
    // l'historique reste une preuve dans les deux sens.
    const { error } = await supabase.from("publication_consents").insert({
      user_id: userId,
      granted,
      consent_text: CONSENT_TEXT,
      scope: SCOPE,
      source: "popup_ar",
    });
    setEnvoi(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setFerme(true);
    toast(granted ? AR.merci : AR.refus_ok, "success");
    router.refresh();
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#15102b] shadow-2xl p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-6 h-6 text-violet-700 flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug">
            {AR.titre}
          </h2>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
          {AR.intro}
        </p>

        {/* En ROUGE, et détaché du reste : c'est la phrase que l'on doit lire
            même en parcourant vite. */}
        <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 p-4 mb-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300 leading-relaxed">
            {AR.jamais}
          </p>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-2">
          {AR.pseudo_phrase}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-2">
          {AR.but}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
          {AR.liberte}
        </p>

        {/* Le pseudo se choisit ICI : demander un accord puis renvoyer ailleurs
            pour le rendre effectif ferait perdre la moitié des gens en route. */}
        {!aPseudo && (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <AtSign className="w-4 h-4 text-violet-700 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {AR.pseudo_titre}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
              {AR.pseudo_aide}
            </p>
            <div className="flex gap-2">
              <input
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder={AR.pseudo_placeholder}
                dir="ltr"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-700 bg-white dark:bg-[#1c1436] text-sm text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={enregistrerPseudo}
                disabled={pending || !pseudo.trim()}
                className="px-4 py-2 rounded-lg bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 flex-shrink-0"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : AR.pseudo_bouton}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => repondre(true)}
            disabled={envoi}
            className="flex-1 px-5 py-3 rounded-xl bg-violet-700 text-white font-semibold text-sm hover:bg-violet-800 disabled:opacity-50 transition"
          >
            {envoi ? AR.enregistrement : AR.accepter}
          </button>
          <button
            type="button"
            onClick={() => repondre(false)}
            disabled={envoi}
            className="flex-1 px-5 py-3 rounded-xl border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition"
          >
            {AR.refuser}
          </button>
        </div>
      </div>
    </div>
  );
}
