# SECURITY AUDIT v2 — Arazzo Formation

Stack : Next.js 14 (App Router) · Supabase · Resend · Chargily/Stripe · Bunny Stream.
Auditeur : revue automatisée + durcissement. Périmètre des modifications : `src/app/`, `src/components/`, `src/lib/`, `src/middleware.ts`, `next.config.mjs`, `.env.example`.

---

## 1. Fichiers créés / modifiés

### Créés (`src/lib/security/`)
| Fichier | Rôle |
|---|---|
| `sanitize.ts` | `sanitizeText` / `sanitizeHTML` / `sanitizeRichContent` / `sanitizeObject` (DOMPurify isomorphe) |
| `schemas.ts` | Schémas Zod : userInput, course, comment, paymentProof |
| `rateLimit.ts` | Limiteurs Upstash (auth 5/15min, api 30/min, payment 3/h, upload 10/h) + extraction IP — **no-op si Upstash non configuré** |
| `env.ts` | `validateEnv()` (lève en prod si variable critique absente) + `requireEnv()` |
| `fileValidation.ts` | Validation fichiers : magic bytes, anti-spoofing MIME, inspection contenu (PDF actif, polyglotte ZIP, dimensions), nom sûr (UUID), chemin sans traversal, VirusTotal optionnel |

### Modifiés
- `next.config.mjs` — en-têtes de sécurité + CSP.
- `src/middleware.ts` — rate limiting + CSRF (vérification d'Origin) sur `/api/*`, webhooks exclus.
- `src/app/layout.tsx` — appel `validateEnv()`.
- `src/app/api/patrons/upsert/route.ts` — uploads validés (magic bytes + inspection + chemin `userId/uuid.ext`).
- `src/app/patronniste/patrons/patron-form.tsx` — `accept` aligné (retrait de `.zip`).
- `src/app/dashboard/cours/[id]/extras-actions.ts` — `sanitizeText` sur Q&R et note de travail pratique.
- `src/app/(public)/patrons/[id]/actions.ts` — `sanitizeText` sur les champs de la demande patron.
- `.env.example` — ajout `UPSTASH_*`, `VIRUSTOTAL_API_KEY`.

---

## 2. Vulnérabilités trouvées + correctifs

| # | Tâche | Constat | Correctif | Sévérité |
|---|---|---|---|---|
| 1 | Secrets en dur | **Aucun secret en dur trouvé** (`sk_`, `eyJ…`, clés 32+) hors `process.env`. `.env*` est bien dans `.gitignore`. | RAS + `validateEnv()` ajouté | — |
| 2 | XSS stocké | Contenus utilisateurs (Q&R, notes, demandes) affichés via React (échappement auto). Aucun `dangerouslySetInnerHTML` alimenté par de l'input utilisateur. | `sanitizeText` ajouté en défense en profondeur sur les actions clés | LOW |
| 3 | `dangerouslySetInnerHTML` | 2 occurrences : script de thème (statique, nous l'écrivons) et QR 2FA (SVG généré serveur). Aucune n'est de l'input utilisateur. | Revue : laissées telles quelles (les sanitiser casserait le SVG/script) | LOW |
| 4 | Upload MIME spoofing / path traversal | `/api/patrons/upsert` faisait confiance au `Content-Type` déclaré et au **nom de fichier d'origine** dans le chemin. | Magic bytes + anti-spoofing + inspection contenu + chemin `userId/uuid.ext` | **MED→fixé** |
| 5 | Polyglotte / PDF actif | Aucune inspection de contenu sur les fichiers. | Rejet ZIP embarqué (`PK\x03\x04`) + PDF avec `/JavaScript`/`/Launch`/`/EmbeddedFile` + images 1×1 | **MED→fixé** |
| 6 | CSRF API | Pas de protection CSRF explicite sur `/api/*`. | Vérification d'**Origin** sur POST/PUT/DELETE (webhooks exclus) — robuste et sans casser l'app | MED→fixé |
| 7 | Rate limiting | Absent. | Middleware branché (Upstash). **Inactif tant qu'Upstash non configuré** (fail-open volontaire). | MED (à activer) |
| 8 | En-têtes | Pas de CSP / anti-clickjacking. | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, **CSP** (self + Supabase + Bunny + Google Fonts) | MED→fixé |

---

## 3. Audit RLS Supabase (Tâche 5)

Vérifié dans `supabase/migrations/` :
- **orders / order_items / order_payments / payment_proofs / invoices** : `SELECT`/`UPDATE` = `customer_id = auth.uid() OR public.is_admin()`. `INSERT` = propriétaire. ✅
- **courses** : lecture publique (publiés), écriture formateur/admin. **enrollments** : insert via service-role (paiement validé), lecture propriétaire. ✅
- **users** : profil propre + admin. **lesson_questions / lesson_practicals / patron_custom_orders** : propriétaire + staff. ✅
- **Service role** : exposé **uniquement** côté serveur via `createAdminClient` (`src/lib/supabase/admin.ts`), jamais dans un composant client. Le client navigateur utilise l'`anon key` avec RLS active. ✅

> Les noms du cahier des charges mappent ainsi : `payments → order_payments`, `social_feed → posts`, `quiz_results → quiz_attempts`.

**Limite** : je n'ai **pas** d'accès direct à la base (pas de mot de passe Postgres), donc je n'ai pas pu *exécuter* `ALTER POLICY`. L'audit est basé sur les migrations versionnées (source de vérité). Aucune politique manquante détectée sur les tables sensibles.

## 4. Audit Storage (Tâche 6.4)

Buckets : `proofs` (privé), `invoices` (privé), `resources` (privé), `patrons` (public), `posts` (public), `practicals` (public).
- **proofs** : upload client via **URL signée** scopée à la commande de l'utilisateur (server-controlled), lecture admin via **URL signée** (service-role). ✅
- **patrons / practicals / posts** : publics (téléchargement direct des PDF/visuels). 

**Recommandation (non appliquée — nécessite accès DB/console Supabase)** : passer `patrons`/`practicals` en **privé** + URLs signées (expiry 1 h) pour les PDF payants, afin d'empêcher le partage d'URL brute. Politiques cibles détaillées dans le cahier des charges 6.4.

---

## 5. Risques restants

| Risque | Sévérité | Détail |
|---|---|---|
| Rate limiting inactif | **MED** | Branché mais dormant tant que `UPSTASH_REDIS_REST_URL/TOKEN` non définis. **Action : créer une base Upstash gratuite et renseigner les 2 variables.** |
| PDF/visuels patrons en bucket public | **MED** | URL brute partageable. Passer en privé + URLs signées (accès DB requis). |
| CSP avec `unsafe-inline`/`unsafe-eval` | **LOW** | Nécessaire au runtime Next sans nonces. Durcissement par **nonce** recommandé. |
| Upload preuves/pratiques (direct navigateur) | **LOW** | L'inspection magic-bytes serveur ne s'applique pas (upload client→Supabase via URL signée). Type/taille validés ; le bucket `proofs` est privé. |
| 2FA / sessions | **LOW** | 2FA présent (TOTP) ; pas de verrouillage de compte après N échecs (couvert partiellement par le rate limiting auth). |

---

## 6. Prochaines étapes recommandées

1. **Activer Upstash** (gratuit) → renseigner `UPSTASH_REDIS_REST_URL/TOKEN` pour activer le rate limiting.
2. **Buckets patrons/pratiques privés** + URLs signées (console Supabase / migration storage).
3. **CSP par nonce** (middleware + `next.config`) pour retirer `unsafe-inline`.
4. **Vercel WAF / Attack Challenge Mode** sur les routes sensibles (`/api/auth`, paiement).
5. **2FA obligatoire** pour les rôles admin/formateur ; verrouillage de compte après échecs répétés.
6. (Optionnel) **VirusTotal** : renseigner `VIRUSTOTAL_API_KEY` pour l'analyse par hash des uploads.
7. **Tests** : campagne d'upload de fichiers piégés (MIME spoof, polyglotte, PDF JS) pour valider les rejets.

---

_Aucune fonctionnalité existante n'a été cassée (typecheck ✅, build ✅). Les protections « lourdes » (rate limit, buckets privés) sont volontairement en fail-open / documentées pour éviter toute régression en production._
