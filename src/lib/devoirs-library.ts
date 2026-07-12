/**
 * Bibliothèque de « devoirs à faire » prêts à l'emploi (bilingues FR / AR).
 * Proposés dans une liste déroulante à l'édition d'une leçon : la formatrice
 * choisit lequel appliquer à telle vidéo/leçon (le texte reste modifiable ensuite).
 * Aucune dépendance serveur → importable côté client.
 */
export interface DevoirModele {
  label: string; // libellé court affiché dans la liste
  text: string;  // contenu inséré dans le champ « Devoir à faire »
}

export const DEVOIRS_LIBRARY: DevoirModele[] = [
  {
    label: "Résumé + patron + couture (général)",
    text:
      "Résumé du cours + dessin du patron (s'il y en a un dans la leçon) + vidéo d'une pièce que vous avez cousue.\n" +
      "تلخيص الدرس مع رسم الباترون إن وُجد في الدرس مع فيديو لقطعة قمت بخياطتها.",
  },
  {
    label: "Prise de mesures",
    text:
      "Prenez vos mensurations (tour de poitrine, taille, bassin, longueurs) et notez-les proprement sur une fiche. Envoyez une photo de la fiche.\n" +
      "خذي مقاساتك (محيط الصدر، الخصر، الأرداف، الأطوال) ودوّنيها بوضوح في ورقة، ثم أرسلي صورة للورقة.",
  },
  {
    label: "Patron de base (corsage / jupe)",
    text:
      "Tracez le patron de base vu dans la leçon à votre taille, sur papier. Photographiez le tracé avec ses repères (pinces, crans, droit-fil).\n" +
      "ارسمي الباترون الأساسي المشروح في الدرس بمقاسك على الورق، وصوّري الرسم بعلاماته (البنسات، الإشارات، خيط الاستقامة).",
  },
  {
    label: "Coupe sur tissu (placement)",
    text:
      "Placez le patron sur le tissu en respectant le droit-fil et les marges de couture, puis coupez. Envoyez une photo du placement et des pièces coupées.\n" +
      "ضعي الباترون على القماش مع احترام خيط الاستقامة وهوامش الخياطة ثم قصّي، وأرسلي صورة للوضعية والقطع المقصوصة.",
  },
  {
    label: "Montage / assemblage",
    text:
      "Assemblez les pièces comme montré dans la leçon (épingles puis couture machine). Filmez une courte vidéo de vos coutures d'assemblage.\n" +
      "جمّعي القطع كما في الدرس (الدبابيس ثم خياطة الماكينة)، وصوّري فيديو قصيرًا لخياطة التجميع.",
  },
  {
    label: "Finitions (ourlet / surfilage)",
    text:
      "Réalisez les finitions vues dans la leçon (surfilage des bords, ourlet propre). Envoyez une photo en gros plan de vos finitions.\n" +
      "أنجزي التشطيبات المشروحة في الدرس (تنظيف الحواف، الكفّة النظيفة)، وأرسلي صورة مقرّبة للتشطيبات.",
  },
  {
    label: "Pose de fermeture (zip / boutons)",
    text:
      "Posez la fermeture éclair (ou les boutons / boutonnières) comme dans la leçon. Filmez une courte vidéo du résultat ouvert et fermé.\n" +
      "ركّبي السحّاب (أو الأزرار / العُرى) كما في الدرس، وصوّري فيديو قصيرًا للنتيجة مفتوحة ومغلقة.",
  },
  {
    label: "Manche & emmanchure",
    text:
      "Montez la manche dans l'emmanchure en respectant l'embu. Envoyez une photo de la manche montée à plat et sur le mannequin/porté.\n" +
      "ركّبي الكمّ في حفرة الإبط مع احترام التوزيع، وأرسلي صورة للكمّ مركّبًا مسطّحًا وعلى المانيكان/مرتديًا.",
  },
  {
    label: "Broderie / décoration main",
    text:
      "Réalisez l'échantillon de broderie / décoration vu dans la leçon sur un morceau de tissu. Envoyez une photo nette de votre échantillon.\n" +
      "أنجزي عيّنة التطريز / الزخرفة المشروحة في الدرس على قطعة قماش، وأرسلي صورة واضحة للعيّنة.",
  },
  {
    label: "Essayage & retouches",
    text:
      "Faites l'essayage de la pièce, repérez les retouches nécessaires et corrigez-les. Envoyez une photo avant/après retouche.\n" +
      "جرّبي القطعة، حدّدي التعديلات اللازمة وصحّحيها، وأرسلي صورة قبل/بعد التعديل.",
  },
  {
    label: "Projet final (vêtement complet)",
    text:
      "Réalisez le vêtement complet du module, de la coupe aux finitions. Envoyez une vidéo de la pièce terminée, portée ou sur mannequin.\n" +
      "أنجزي اللباس الكامل للوحدة، من القصّ إلى التشطيب، وأرسلي فيديو للقطعة النهائية مرتداة أو على المانيكان.",
  },
];
