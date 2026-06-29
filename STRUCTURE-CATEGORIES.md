# Structure proposée — Catégories de formation (Arazzo)

> Objectif : remplacer l'organisation actuelle (mélange showcase-vidéo hardcodé +
> grille de catégories disjointe) par **une taxonomie claire à 2 niveaux**, lisible
> et évolutive. À renseigner dans la table Supabase `categories`
> (`parent_id`, `name_fr`, `name_ar`, `slug`, `ordre`, `image_url`).
>
> L'affichage est déjà recâblé : la vue racine de `/formations` rend désormais le
> composant `CategoryIndex` (univers vedette + grille organisée), et chaque univers
> connu reçoit automatiquement une icône, une description FR/AR/EN et une photo de
> secours `/images/cat-<slug>.jpg`.

## Niveau 1 — Univers (les grandes disciplines)

| Ordre | Univers | slug | name_ar | Icône |
|------:|---------|------|---------|-------|
| 1 | Modélisme & Patronage | `modelisme` | المودلیزم | PencilRuler |
| 2 | Stylisme & Création | `stylisme` | الستيليزم | Palette |
| 3 | Couture & Assemblage | `couture` | الخياطة | Scissors |
| 4 | Artisanat & Broderie | `artisanat` | الحرف اليدوية | Hand |
| 5 | Tenues Traditionnelles | `traditionnel` | اللباس التقليدي | Crown |

## Niveau 2 — Sous-catégories (parent_id = univers)

### 1. Modélisme & Patronage (`modelisme`)
- `modelisme-bases` — Bases du patronage (corsage, jupe, manche)
- `modelisme-gradation` — Gradation des tailles
- `modelisme-transformation` — Transformation de modèles
- `modelisme-sur-mesure` — Patron d'après mesures
- `modelisme-cao` — Patronage sur logiciel (CAO)

### 2. Stylisme & Création (`stylisme`)
- `stylisme-croquis` — Dessin de mode & croquis
- `stylisme-matieres` — Matières & couleurs
- `stylisme-collection` — Concevoir une collection
- `stylisme-moodboard` — Recherche & moodboard

### 3. Couture & Assemblage (`couture`)
- `couture-debutant` — Couture débutante (machine, points)
- `couture-finitions` — Coutures & finitions propres
- `couture-robe` — Robes & pièces fluides
- `couture-veste` — Vestes & pièces structurées

### 4. Artisanat & Broderie (`artisanat`)
- `artisanat-broderie-main` — Broderie main
- `artisanat-perlage` — Perlage & strass
- `artisanat-fetla-medjboud` — Fetla & medjboud
- `artisanat-finitions-luxe` — Finitions haute couture

### 5. Tenues Traditionnelles (`traditionnel`)
- `traditionnel-caftan` — Caftan & takchita
- `traditionnel-karakou` — Karakou & gandoura
- `traditionnel-djellaba` — Djellaba & burnous
- `traditionnel-robe-kabyle` — Robe kabyle & melhfa

## Règles d'affichage (rappel)
- **Vue racine** → `CategoryIndex` : univers vedette `N° 01` (grand format), puis
  grille de pochettes pour les autres univers (icône + description + comptage).
- **Vue univers** → `CategoryGrid` : pochettes des sous-catégories + fil d'Ariane.
- **Vue feuille** → grille des cours.
- Toute catégorie sans `image_url` retombe sur `/images/cat-<slug>.jpg` (univers
  connus) puis sur un dégradé de marque. Idéal : renseigner `image_url` en base.

## Pour appliquer la taxonomie en base
Renseigner d'abord les 5 univers (`parent_id = null`, `ordre` 1→5), récupérer leurs
`id`, puis insérer les sous-catégories avec `parent_id` = id de l'univers parent.
Conserver les slugs ci-dessus pour bénéficier des descriptions/icônes/photos câblées.
