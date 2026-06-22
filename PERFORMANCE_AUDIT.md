# Audit de performance — Arazzo Formation (Next.js 14, App Router)

Objectif : accélérer les transitions de navigation, sans toucher à la logique métier ni au design.

## ÉTAPE 1 — Audit (lecture seule)

### Contexte
- `app/` est sous `src/app/`. Layout racine : `src/app/layout.tsx` (Server Component ✅, aucun provider, aucun `"use client"`).
- Config : `next.config.mjs`. Tailwind : `tailwind.config.ts`.

### Problèmes identifiés

| # | Sévérité | Fichier · ligne | Problème | Impact navigation |
|---|----------|-----------------|----------|-------------------|
| 1 | 🔴 critique | `src/app/globals.css:1` | Polices Google chargées via **`@import url(...)` CSS** (Playfair + DM Sans + **Cormorant Garamond**). `@import` est **bloquant** et crée une chaîne sérielle : HTML → globals.css → CSS Google → fichiers de police. | Retarde le premier rendu **à chaque page** (pas de cache app, requêtes externes). FOUT/retard de texte. |
| 2 | 🟡 moyen | `src/app/globals.css:1` | **Cormorant Garamond chargé mais jamais utilisé** (0 occurrence dans `src/`). Requête réseau + octets gaspillés. | Octets inutiles au chargement initial. |
| 3 | 🟡 moyen | `next.config.mjs:4-8` | **`experimental.optimizePackageImports` absent.** Les barrels `lucide-react`, `framer-motion`, `recharts` ne sont pas tree-shakés agressivement. `lucide-react` (0.454) importe potentiellement un large index. | Bundle JS par page plus lourd → hydratation/navigation plus lentes. |
| 4 | 🟡 moyen | `next.config.mjs:9-17` | **`images.formats` absent** → pas d'AVIF/WebP servis par `next/image`. | Images plus lourdes (pages publiques avec visuels). |
| 5 | 🟡 moyen | `src/components/sections/hero.tsx` | **`@tsparticles` (Sparkles) importé en statique** dans le héro de l'accueil → la lib (lourde, canvas) part dans le **JS initial de la home**. | Alourdit le 1er chargement de la page la plus visitée. |
| 6 | 🟢 mineur | `src/components/atelier/{ActivityChart,DonutChart}.tsx` | **`recharts` (lourd)** importé en statique dans `/atelier` (page protégée, hors flux public principal). | Bundle `/atelier` lourd (impact limité, page peu fréquentée). |
| 7 | 🟢 mineur | `src/components/ui/card.tsx`, `patrons`, héros | `<img>` natifs (pas `next/image`) à plusieurs endroits. Conversion en masse risquée (layout). | Images non optimisées ; documenté, non corrigé en masse (règle « pas de modifs en masse »). |

### Points sains (rien à faire)
- ✅ Layout racine **Server Component**, **aucun provider** wrappé → 2c inutile.
- ✅ `@react-pdf/renderer` déjà en `serverComponentsExternalPackages` (hors bundle client).
- ✅ Pages publiques principales (`/`, `/formations`, `/boutique`, `/patrons`) sont des **Server Components** ; seuls les sous-composants interactifs sont `"use client"` → 2e globalement non nécessaire.
- ✅ `display=swap` déjà présent sur les polices.

### Dépendances lourdes repérées (package.json)
- `framer-motion`, `recharts`, `@react-pdf/renderer`, `@tsparticles/*`, `cobe`, `jspdf`, `qrcode`. (Pas de `three` ni `lottie`.)

---

## ÉTAPE 2 — Corrections appliquées

_(Voir la section « Journal des modifications » plus bas, complétée au fil des changements.)_
