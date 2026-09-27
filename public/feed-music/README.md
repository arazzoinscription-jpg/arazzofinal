# Bibliothèque musicale du feed communauté

Déposez ici les fichiers audio (`.mp3`, `.m4a` ou `.ogg`) qui serviront de
**musique de fond** aux vidéos publiées dans le feed communauté.

## ⚠️ Droits d'auteur — important

N'utilisez QUE de la musique **libre de droits** (royalty-free) ou dont vous
possédez les droits. Ne mettez jamais ici de musique commerciale/protégée
(ce serait illégal et pourrait faire retirer vos vidéos sur les réseaux).

Sources gratuites et légales possibles :
- YouTube Audio Library (studio.youtube.com → Bibliothèque audio)
- Pixabay Music (pixabay.com/music) — libre, sans attribution
- Free Music Archive, Chosic, Uppbeat (vérifiez la licence)

## Comment ajouter une piste

1. Copiez le fichier ici, par ex. `douce.mp3` (nom simple, sans espace ni accent).
2. Ouvrez `src/lib/feed-music.ts` et ajoutez une ligne dans `FEED_MUSIC` :

   ```ts
   { id: "douce", title: "Douce", url: "/feed-music/douce.mp3" },
   ```

3. C'est tout : la musique apparaît dans le sélecteur au moment de publier une
   vidéo, et se joue dans le feed.

Conseils : gardez des fichiers légers (< 3–4 Mo, ~128 kbps) pour un chargement
rapide, et des morceaux qui bouclent bien.
