# Design System: Arazzo Formation — « Le Cahier de Patrons »

> Source de vérité pour générer des écrans Google Stitch alignés sur l'identité
> couture d'Arazzo (LMS de couture / modélisme, Maghreb, FR · AR · EN, RTL).
> Tout écran généré doit ressembler à un **spécimen de patron éditorial** :
> papier crème, ruban-mètre gradué, repères de coupe, numéros de planche.

## 1. Visual Theme & Atmosphere
Une interface **éditoriale d'atelier de couture** : tactile, chaleureuse, précise.
L'atmosphère évoque une **pochette de patron Vogue/Burda** posée sur une table de
coupe — papier crème texturé, lignes pointillées de couture, repères de cadrage aux
coins, ruban-mètre gradué comme motif signature. Confiante et asymétrique, jamais
clinique. Densité moyenne (4/7), variance haute (8/10 — mises en page décalées,
photos légèrement inclinées, numéros filigranes démesurés), motion fluide (6/10 —
ressorts, révélations en cascade). Mode sombre = encre violet-nuit profonde
(`#0d0a1c`), jamais noir pur.

Mots-clés directeurs : *spécimen, planche, pochette, ruban-mètre, coupe, point.*

## 2. Color Palette & Roles
- **Papier Crème** (#F5F0EB) — Surface de fond principale (le « papier à patron »)
- **Crème Clair** (#FDFCFB) — Cartes claires, fenêtres-échantillon
- **Encre Nuit** (#0d0a1c) — Fond mode sombre (jamais #000000)
- **Violet Électrique** (#5B16F9) — Accent de marque : titres forts, onglet actif, anneaux de focus
- **Violet Nuit** (#1C0659) — Texte primaire sur crème, profondeur
- **Orange Atelier** (#FE7223) — Accent d'action unique : CTA, plaques « N° », soulignements
- **Crème Profond** (#D6C9BA) — Bordures structurelles 1px, lignes de couture
- **Blush** (#E9B8CD) — Halo décoratif diffus uniquement (jamais texte/CTA)
- **Gris Mesure** (rgba(28,6,89,0.55)) — Texte secondaire, métadonnées mono

Contraintes : **2 accents maximum** (violet de marque + orange d'action), saturation
maîtrisée. **Aucun violet/bleu néon, aucun glow extérieur, aucun dégradé arc-en-ciel.**
Une seule famille de gris (chauds, dérivés du violet-nuit). Jamais de noir pur.

## 3. Typography Rules
- **Display / Titres :** `Playfair Display` (serif éditorial distinctif, autorisé ici —
  contexte créatif/éditorial). Track-tight, hiérarchie par graisse + couleur, dernier
  mot en *italique orange* avec soulignement tracé à la main (SVG).
- **Body / UI :** `DM Sans` — interlignage relaxé, max 65 caractères/ligne, gris mesure.
- **Mono :** `Geist Mono` ou `JetBrains Mono` — pour les numéros de planche (« N° 03 »),
  métadonnées, comptages, graduations. Tracking large `0.2em`, UPPERCASE.
- **Arabe :** police arabe lisible (Cairo / Noto Kufi). Le bloc bascule en `dir="rtl"`.
- **Bannis :** `Inter`, polices système génériques pour les titres, serifs génériques
  (`Times New Roman`, `Georgia`, `Garamond`). Playfair est le SEUL serif autorisé.

## 4. Component Stylings
* **Boutons :** Plats, sans glow. Primaire = remplissage **Orange Atelier**, coins
  `rounded-xl` (~0.9rem), retour tactile `-translate-y-0.5` + `active:scale-[0.98]`.
  Secondaire = contour 2px crème-profond. Un seul CTA primaire par section.
* **Cartes catégorie = « pochette de patron » :** crème, `rounded-[1.4rem]`, anneau
  1px, ombre douce diffuse. Repères de cadrage aux coins, plaque « N° XX » orange,
  pastille de comptage en verre dépoli, **couture en pointillés** séparant l'image du
  titre, soulignement orange qui s'étend au survol. Survol : `-translate-y-1.5`,
  image `scale-1.08` (transform only).
* **Fenêtre-échantillon (swatch) :** image objet-couvrant + scrim `from-black/70`
  garantissant contraste texte ≥ 4.5:1, mini ruban-mètre en pied de fenêtre.
* **Onglets / sélecteur d'univers :** pilule `rounded-xl`, actif = violet-nuit (clair)
  / orange (sombre) plein, inactif = blanc + anneau, préfixe mono « 00/01/02 ».
* **Inputs :** label au-dessus, aide optionnelle, erreur dessous. Anneau de focus orange.
* **Loaders :** squelettes épousant la mise en page (pochettes grisées). Jamais de spinner rond.
* **États vides :** composition illustrée (icône `PackageOpen`/`Scissors` + phrase),
  jamais un simple « Aucune donnée ».

## 5. Layout Principles
Grille CSS d'abord, conteneur `max-w-7xl` centré, padding interne généreux.
- **Index de catégories structuré (refonte) :** sélecteur d'univers collant en haut →
  grille organisée de sous-catégories. Une seule logique d'affichage cohérente
  (fini le mélange showcase-vidéo + grille disjointe à la racine).
- Héro **asymétrique** (variance > 4) : texte éditorial 7 col. + planche photo
  inclinée 5 col. Jamais de héro centré générique.
- **Bannie :** la rangée générique « 3 cartes égales horizontales ». Préférer grille
  asymétrique, zig-zag 2 colonnes, ou défilement horizontal d'échantillons.
- Aucun chevauchement de contenu : chaque élément occupe sa zone propre (les photos
  inclinées décoratives sont `aria-hidden` et hors flux texte).
- Sections pleine hauteur : `min-h-[100dvh]`, jamais `h-screen`.

## 6. Motion & Interaction
Physique de ressort (premium, pondéré), jamais d'easing linéaire. Révélations en
cascade échelonnées (`staggerChildren`) pour les grilles de pochettes — jamais de
montage instantané. Micro-interactions perpétuelles discrètes (soulignement qui
file, ciseau qui apparaît sur la couture). **Animer uniquement `transform` et
`opacity`** (zéro reflow). Respect strict de `prefers-reduced-motion` (fondu seul).

## 7. Anti-Patterns (Bannis)
- Pas d'emojis · pas d'`Inter` · pas de serif générique (Playfair uniquement)
- Pas de noir pur `#000000` (utiliser `#0d0a1c`)
- Pas de glow néon / ombre extérieure colorée · pas d'accent sursaturé
- Pas de dégradé arc-en-ciel sur grands titres
- Pas de curseur personnalisé · pas d'éléments qui se chevauchent (séparation propre)
- Pas de rangée « 3 cartes égales » · pas de héro centré (variance haute)
- Pas de texte de remplissage : « Scroll to explore », flèches/chevrons rebondissants
- Pas de noms génériques (« John Doe », « Acme ») · pas de faux chiffres ronds
- Pas de clichés IA (« Elevate », « Seamless », « Unleash », « Next-Gen »)
- Pas de liens Unsplash cassés — `picsum.photos` ou SVG si placeholder
