# Recette du suivi pédagogique (`/admin/suivi`)

**Projet Supabase de RECETTE uniquement.** Jamais la production. Aucune donnée réelle.

## Prérequis (à fournir par l'administratrice)

1. Un projet Supabase **neuf et distinct** de la production (offre gratuite suffisante).
2. Dans un terminal, des variables **dédiées à la recette** (jamais celles de l'application) :
   - `RECETTE_SUPABASE_URL` — URL du projet de recette
   - `RECETTE_DATABASE_URL` — chaîne de connexion Postgres du **même** projet
   - `RECETTE_SERVICE_ROLE_KEY`, `RECETTE_ANON_KEY` — clés du projet de recette
   - `RECETTE_MOT_DE_PASSE_ELEVES` — mot de passe de test (12 caractères minimum) des comptes fictifs
   - `RECETTE_CONFIRME=oui`
3. Le fichier `.env.local` de production reste en place : le garde-fou y lit **seulement** l'URL publique
   de production pour refuser de la viser.

Pour la page elle-même : lancer `next dev` avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY` pointés sur la **recette**, sans clé Resend ni clés VAPID (aucun envoi possible).

## Étapes

```bash
node scripts/recette/migrer.mjs                        # 001 → 095, chacune dans une transaction
npx tsx scripts/recette/seed-student-care.mjs          # données fictives (79 élèves, > 1 000 inscriptions)
npx tsx scripts/recette/verifier-student-care.mjs      # contrôles SQL, chargeur réel, permissions, aucun envoi
```

Lancer la vérification **le même jour (heure d'Alger)** que le seed : les attendus sont relatifs à cette date.

## Retour arrière (recette)

```sql
DROP VIEW IF EXISTS public.student_care_signals;
DROP VIEW IF EXISTS public.student_care_enrollments;
DROP TABLE IF EXISTS public.student_care_settings;
```

Ou supprimer simplement le projet de recette.
