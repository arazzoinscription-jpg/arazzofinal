# 🚀 Réduire l'egress Supabase (CDN + cache images)

> **Contexte** : le projet Supabase a été restreint pour **dépassement d'egress**
> (bande passante, 5 Go/mois du plan Free). Le quota se réinitialise au début du
> cycle de facturation. Ce guide sert à **ne plus jamais** bloquer.

## ✅ Déjà fait dans le code (aucune action de votre part)
1. **Compression WebP** de toutes les images à l'upload (5–10× plus légères).
2. **Cache navigateur 1 an** (`cacheControl`) sur les images uploadées → un même
   utilisateur ne re-télécharge plus les images (avatars, etc.).
3. **Vidéos hors Supabase** (Bunny) — déjà en place.
4. **Proxy `/media`** prêt : les images du Storage peuvent être servies via
   `formation-arazzo.store/media/...` au lieu de `…supabase.co`. **Désactivé** tant
   que Cloudflare n'est pas en place (voir plus bas).

## 🔧 Étape décisive : Cloudflare (gratuit) devant le domaine
Cloudflare met vos images **en cache au bord** : Supabase n'est touché qu'au
**1ᵉʳ** chargement, plus à chaque vue.

1. Créez un compte gratuit sur https://dash.cloudflare.com → **Add a site** →
   `formation-arazzo.store`.
2. Cloudflare vous donne **2 serveurs DNS** (nameservers). Allez chez votre
   registrar (là où vous avez acheté le domaine) et **remplacez les nameservers**
   par ceux de Cloudflare. (Propagation : quelques heures.)
3. Dans Cloudflare, réimportez vos enregistrements DNS existants (vers Vercel) et
   laissez le **nuage orange (proxied)** activé.
4. **SSL/TLS** → mode **Full**.
5. (Optionnel mais conseillé) **Rules → Cache Rules** : pour les URL contenant
   `/media/`, forcer *Eligible for cache* + *Edge TTL 1 an*.

## 🔌 Activer le proxy `/media` (après Cloudflare)
Une fois Cloudflare actif, ajoutez la variable d'environnement sur **Vercel**
(Project → Settings → Environment Variables) :

```
NEXT_PUBLIC_USE_MEDIA_CDN = 1
```

Redéployez. Les avatars (et images branchées sur `cdnImage()`) passeront alors par
`/media/...` → mis en cache par Cloudflare. **Ne l'activez PAS avant Cloudflare**
(sinon les images transitent par Vercel sans cache = aucun gain).

## ⏱️ Pour rétablir le service TOUT DE SUITE (avant la fin du cycle)
La restriction dure jusqu'à la remise à zéro du quota (**01/08**). Pour un accès
immédiat : dans le dashboard Supabase, **retirer le spend cap** ou passer en
**Pro (25 $/mois)** — action réservée au propriétaire du projet.

## 📊 Ordre d'impact
1. Cloudflare (`/media` + cache) — **le plus gros levier** contre l'egress.
2. Compression WebP — fait ✅
3. Cache 1 an — fait ✅
4. Vidéos sur Bunny — fait ✅
