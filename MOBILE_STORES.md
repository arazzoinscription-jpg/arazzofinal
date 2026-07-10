# 📱 Publication sur Google Play & App Store

Ce projet est un site **Next.js** empaqueté dans une **coque native Capacitor**.
L'app mobile ne réembarque pas le code : elle ouvre le site en production dans une
WebView (`server.url` dans [`capacitor.config.ts`](capacitor.config.ts)). Concrètement :

- ✅ Tout changement de contenu / code déployé sur le site est **visible immédiatement**
  dans l'app, **sans republier** sur les stores.
- 🔁 On ne republie sur les stores que pour changer l'**icône, le nom, les permissions
  natives, la version**, ou la configuration Capacitor.

| | Valeur |
|---|---|
| **App ID / Bundle ID** | `store.formationarazzo.app` |
| **Nom affiché** | Arazzo Formation |
| **Site chargé** | https://www.formation-arazzo.store |
| **Version actuelle** | `versionName 1.0` · `versionCode 1` (Android) |

---

## 0. Prérequis (une seule fois)

```bash
# Dépendances Capacitor (déjà dans package.json)
npm install

# Outils natifs
# Android : Android Studio  (https://developer.android.com/studio)
# iOS     : Xcode (macOS obligatoire) + un compte Apple Developer
```

Les projets natifs `android/` et `ios/` sont déjà générés et versionnés.

### Synchroniser après un changement de config

À lancer chaque fois que vous modifiez `capacitor.config.ts`, l'icône ou le splash :

```bash
npx cap sync
```

> 💡 Raccourcis disponibles dans `package.json` :
> `npm run cap:sync` · `npm run cap:android` · `npm run cap:ios`.

---

## 1. 🤖 Google Play Store (Android)

### a. Ouvrir le projet
```bash
npx cap sync android
npx cap open android      # ouvre Android Studio
```

### b. Créer la clé de signature (une seule fois — À CONSERVER PRÉCIEUSEMENT)
```bash
keytool -genkey -v -keystore arazzo-release.keystore \
  -alias arazzo -keyalg RSA -keysize 2048 -validity 10000
```
Renseigner ensuite la clé dans `android/keystore.properties` (ne pas committer ce
fichier ni le `.keystore` — voir `.gitignore`).

### c. Incrémenter la version (à CHAQUE nouvelle soumission)
Dans `android/app/build.gradle` :
```gradle
versionCode 2          // +1 à chaque envoi (entier)
versionName "1.1"      // version affichée
```

### d. Générer le bundle signé
Dans Android Studio : **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle (.aab)**.
Le fichier `.aab` sort dans `android/app/release/`.

### e. Play Console
1. https://play.google.com/console → **Créer une application**.
2. Renseigner fiche : nom, description, captures d'écran (tél. + tablette),
   icône 512×512, bannière 1024×500.
3. **Politique de confidentialité** obligatoire (URL) + questionnaire *Sécurité des données*.
4. Uploader le `.aab` dans **Test interne** d'abord, puis **Production**.
5. Première publication : validation Google ~ quelques heures à 3 jours.

### f. (Optionnel) Digital Asset Links
Non requis pour la coque Capacitor WebView. À n'ajouter que si vous passez plus tard
en **TWA** ou activez les *App Links* (`https://…` ouverts directement dans l'app) :
créer `public/.well-known/assetlinks.json` avec l'empreinte SHA-256 de la clé de
signature (visible dans Play Console ▸ *Intégrité de l'app*).

---

## 2. 🍎 Apple App Store (iOS) — **nécessite un Mac**

### a. Ouvrir le projet
```bash
npx cap sync ios
npx cap open ios          # ouvre Xcode
```

### b. Compte & signing
1. Compte **Apple Developer** (99 $/an) : https://developer.apple.com.
2. Dans Xcode ▸ cible **App** ▸ *Signing & Capabilities* : choisir votre *Team*,
   laisser *Automatically manage signing*. Bundle ID = `store.formationarazzo.app`.

### c. Version
Dans Xcode ▸ *General* : **Version** (ex. 1.1) et **Build** (+1 à chaque envoi).

### d. Archiver & envoyer
1. Sélectionner l'appareil cible **Any iOS Device (arm64)**.
2. **Product ▸ Archive** → *Organizer* → **Distribute App ▸ App Store Connect ▸ Upload**.

### e. App Store Connect
1. https://appstoreconnect.apple.com → **My Apps ▸ +** → nouvelle app (même Bundle ID).
2. Fiche : nom, sous-titre, description, mots-clés, **captures d'écran** (6,7" et 5,5"),
   icône 1024×1024 (sans transparence ni coins arrondis).
3. **URL de politique de confidentialité** + questionnaire *App Privacy*.
4. Renseigner la build uploadée, puis **Soumettre pour examen** (~ 24–48 h).

> ⚠️ **Apple & les WebViews** : Apple peut rejeter une app qui n'est qu'un « site web
> emballé ». Pour maximiser l'acceptation, mettez en avant les fonctionnalités
> natives / de type app (notifications push, expérience plein écran, contenu réservé
> aux membres). Les notifications push in-app déjà présentes aident sur ce point.

---

## 3. 🎨 Icônes & écran de démarrage (splash)

Placer une icône source **1024×1024 PNG** puis générer tous les formats :
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#0d0a1c" --splashBackgroundColor "#0d0a1c"
npx cap sync
```
Le `theme_color` (#6B21C8) et `background_color` (#0d0a1c) sont déjà définis dans
[`src/app/manifest.ts`](src/app/manifest.ts).

---

## 4. ✅ Checklist avant chaque soumission

- [ ] `versionCode` / **Build** incrémenté (Android **et** iOS).
- [ ] `npx cap sync` exécuté.
- [ ] Site de production en ligne et fonctionnel (l'app le charge en direct).
- [ ] Politique de confidentialité accessible en ligne.
- [ ] Captures d'écran à jour.
- [ ] Testé sur un appareil réel (connexion, paiement, communauté, notifications).
