# Arazzo Formation — Guide de déploiement

Plateforme LMS pour le Maghreb et sa diaspora.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL + Storage)
- **Tailwind CSS** avec Playfair Display + DM Sans
- **Bunny.net** (hébergement vidéo)
- **Chargily Pay** (paiements DZD — Algérie)
- **Stripe** (paiements EUR — Maroc, Tunisie, diaspora)
- **Resend** (emails transactionnels)
- **Vercel** (déploiement)

---

## 1. Prérequis

```bash
node -v   # >= 18
npm -v    # >= 9
```

---

## 2. Installation

```bash
cd arazzo
cp .env.example .env.local
npm install
```

---

## 3. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Récupérez les clés depuis **Settings → API**
3. Remplissez `.env.local` avec vos valeurs
4. Exécutez la migration SQL :

```bash
# Dans l'éditeur SQL de Supabase → collez le contenu de :
supabase/migrations/001_init.sql
```

---

## 4. Bunny.net

1. Créez une **Video Library** sur [bunny.net](https://bunny.net)
2. Récupérez `BUNNY_API_KEY` et `BUNNY_LIBRARY_ID`
3. Configurez un **Pull Zone** pour servir les vidéos
4. Les URLs de vos vidéos doivent avoir le format :
   ```
   https://iframe.mediadelivery.net/play/LIBRARY_ID/VIDEO_ID
   ```

---

## 5. Stripe (paiements EUR)

1. Créez un compte [Stripe](https://stripe.com)
2. Récupérez vos clés API (`pk_live_...` et `sk_live_...`)
3. Configurez un webhook pointant vers :
   ```
   https://arazzo.formation/api/webhooks/stripe
   ```
   Événement : `checkout.session.completed`

---

## 6. Chargily Pay (paiements DZD)

1. Créez un compte [Chargily](https://chargily.com)
2. Récupérez votre `CHARGILY_API_KEY`
3. Configurez le webhook vers :
   ```
   https://arazzo.formation/api/webhooks/chargily
   ```

---

## 7. Resend (emails)

1. Créez un compte [Resend](https://resend.com)
2. Vérifiez votre domaine `arazzo.formation`
3. Récupérez votre `RESEND_API_KEY`

---

## 8. Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod

# Configurer les variables d'environnement dans le dashboard Vercel
# ou via CLI :
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... (toutes les variables de .env.example)
```

### Domaine personnalisé
Dans **Vercel → Settings → Domains** : ajoutez `arazzo.formation`

---

## 9. Migration WordPress

### Élèves

```bash
# Exportez vos utilisateurs WordPress en CSV (nom,email,ville,pays)
npm run migrate:csv -- --file=eleves.csv
```

Chaque élève reçoit un email avec un lien magique pour se connecter.

### Cours TutorLMS

```bash
# Exportez vos cours TutorLMS en JSON
# Récupérez l'UUID du formateur depuis Supabase
npm run migrate:courses -- --file=courses.json --formateur=<uuid>
```

---

## 10. Développement local

```bash
npm run dev
# → http://localhost:3000
```

---

## Structure des rôles

| Rôle       | Accès                                    |
|------------|------------------------------------------|
| `eleve`    | Dashboard élève, cours achetés           |
| `formateur`| Dashboard formateur + tout ce qu'a élève |
| `admin`    | Tout                                     |

Pour promouvoir un utilisateur en formateur, utilisez la page `/admin`
ou directement dans Supabase :

```sql
UPDATE users SET role = 'formateur' WHERE email = 'formateur@exemple.com';
```

---

## Pages disponibles

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/formations` | Catalogue de cours |
| `/formations/[slug]` | Page détail + achat |
| `/patrons` | Bibliothèque patrons |
| `/devenir-formateur` | Recrutement formateurs |
| `/login` | Connexion |
| `/register` | Inscription |
| `/dashboard` | Espace élève |
| `/dashboard/cours/[id]` | Lecteur vidéo |
| `/dashboard/patrons` | Mes patrons |
| `/dashboard/certificats` | Mes certificats |
| `/formateur` | Dashboard formateur |
| `/formateur/cours/nouveau` | Créer un cours |
| `/formateur/stats` | Revenus + stats |
| `/admin` | Administration |
