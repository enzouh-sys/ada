<p align="center"><img src="public/icons/icon-192.png" width="96" alt="Ada"></p>

# Ada

*En hommage à Ada Lovelace.*

Tes reels dev & Claude Code, transformés en fiches que tu peux vraiment appliquer. Partage un reel Instagram, TikTok, YouTube, Facebook, un repo GitHub ou un article **depuis n'importe où**. Ada le garde tout de suite, et **ton IA, sur ton PC**, en fait une fiche complète :

- résumé, points clés, étapes à cocher ;
- commandes, prompts et configs prêts à copier ;
- outils, repos et serveurs MCP cités ;
- **vérification sur le web** : doc officielle, README, compatibilité, pièges, alternatives ;
- un prompt prêt à coller dans Claude Code pour appliquer l'astuce à ton projet.

Ada est une PWA en français, qui s'installe sur téléphone comme sur ordinateur, avec mode sombre et hors ligne.

## Comment ça marche

```
Téléphone / n'importe quel navigateur        Firestore (ta base privée)        Ton PC (npm run dev)
  Partager → Ada  ────────────────────►  fiche « ⏳ en attente »  ◄──────── surveille la file
                                                                             lit le lien, la légende, les captures
  la fiche se remplit en direct  ◄─────  fiche complète  ◄────────────────── ton IA + recherches web
```

- **L'app** est hébergée sur *ton* projet Firebase, gratuit, avec connexion Google réservée à tes comptes.
- **L'analyse** se fait sur *ton* PC, avec *ton* IA. Par défaut, c'est **Claude Code avec ton abonnement**, donc sans clé API ni coût en plus. Chaque installation d'Ada utilise l'IA de celui qui l'installe.
- **PC éteint** : les imports attendent (« Ada analysera ton tips une fois à la maison 🏠 ») et sont traités au prochain démarrage.

## Installation

### Ce qu'il te faut

- [Node.js](https://nodejs.org) 20 ou plus
- un compte Google
- la CLI Firebase : `npm install -g firebase-tools`
- **ton IA** (recommandé) : [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), installé et connecté (lance `claude` une fois dans un terminal). Pour une autre IA, voir plus bas.

### En 3 commandes

```bash
git clone https://github.com/enzouh-sys/ada.git && cd ada
npm install
npm run setup
```

`npm run setup` te guide, puis fait tout sur ton compte :

1. connexion à Firebase avec ton compte Google ;
2. création (ou réutilisation) de ton projet Firebase et de son app web ;
3. écriture de ta config personnelle (`ada.config.json`, jamais envoyée sur git) ;
4. déploiement de la base (règles de sécurité), de la connexion Google et de l'app en ligne ;
5. autorisation de `localhost` pour la connexion Google.

Tu peux relancer `npm run setup` sans risque si quelque chose a échoué.

### Démarrer

```bash
npm run dev
```

1. Sur ce PC, ouvre **http://localhost:5174** et connecte-toi **une fois** avec Google : ce PC devient « le PC de la maison ». Sa connexion est gardée dans `.ada-session.json`, qui reste sur ce PC.
2. Sur ton téléphone, ouvre l'adresse affichée par le terminal (aussi en QR code sur l'accueil d'Ada), connecte-toi et installe l'app.
3. Importe un reel. Tant que `npm run dev` tourne, il est analysé en 1 à 4 minutes.

Ensuite, `npm run dev` suffit à chaque démarrage. Pour ne plus y penser, lance-le au démarrage de ta session (Planificateur de tâches sous Windows, `launchd` sous macOS, `systemd --user` sous Linux).

## Ton IA

Le moteur est choisi automatiquement, ou réglé avec `ADA_ENGINE` dans `.env` (copie `.env.example`).

| Moteur | Ce qui travaille | Coût |
|---|---|---|
| **`cli`** (recommandé, par défaut si `claude` est installé) | Ton **Claude Code** (`claude -p`) en session jetable : Opus 5.5 par défaut, avec **recherches web** pour vérifier et compléter chaque fiche. Outils autorisés : lecture des captures, WebSearch, WebFetch. Pas de shell, pas d'écriture, pas de MCP, pas de tes réglages perso. | Ton abonnement Claude |
| **`api`** | L'API Anthropic avec `ANTHROPIC_API_KEY` (`claude-haiku-5-5` par défaut). | À l'usage |
| **`command`** | **N'importe quelle autre IA en ligne de commande** : `ADA_COMMAND` reçoit tout le prompt (consignes, contenu, schéma JSON) sur l'entrée standard, tourne dans un dossier temporaire qui contient les captures, et doit écrire `{ "fiches": [...] }` sur la sortie standard. | Selon ton IA |
| **`local`** | Pas d'IA : Ada extrait les commandes, liens et hashtags de la légende. | Gratuit |

Réglages utiles :

- `ADA_MODEL` : le modèle (pour `cli` : `claude-opus-5-5` par défaut, `sonnet` ou `haiku` pour aller plus vite et économiser ton quota) ;
- `ADA_RESEARCH=off` : pas de recherche web.

Dans tous les cas, le contenu des reels et des pages web est traité comme une donnée, jamais comme des instructions. L'IA a pour consigne de ne jamais inventer une commande ou une URL, et de vérifier sur les sources officielles.

## Utiliser Ada

### Partager sans copier le lien

- **Android** : installe Ada depuis Chrome (⋮ → « Installer l'application »). Elle apparaît alors dans **Partager** d'Instagram, TikTok, YouTube et Facebook.
- **iPhone** : iOS ne laisse aucune app web apparaître dans le menu Partager. Crée un Raccourci « Ada » (app Raccourcis → afficher dans la feuille de partage → action « Ouvrir les URL » vers `https://<ton-projet>.firebaseapp.com/?url=` + *Entrée du raccourci*). Le détail, avec l'adresse à copier, est dans Réglages.
- **Partout** : copie le lien, puis touche « Coller » dans Ada, ou colle-le dans le champ. Le texte autour du lien devient la légende.

### Tes notes sont des consignes

Ce que tu écris dans « Mes notes » d'une fiche, ou dans « Consignes pour Ada » à l'import, est **lu en premier à chaque analyse**. Par exemple :

- « fais une fiche par skill » : un reel qui présente 5 skills donne 5 fiches reliées entre elles ;
- « détaille l'installation sous Windows » ;
- « compare avec ce que j'utilise déjà ».

Si tu refais l'analyse, les mêmes fiches sont mises à jour, en gardant leur statut et leurs notes.

### Les écrans

| Écran | Fonctionnalités |
|---|---|
| **Accueil** | Import en un collage, imports en attente, stats, « à tester en priorité », thèmes, snippet au hasard, QR code vers l'app |
| **Bibliothèque** | Recherche partout (titres, commandes, outils, notes), filtres par thème / statut / tag / favoris, tri |
| **Fiche** | État de l'analyse, statut (À tester → En test → Adoptée / Écartée), « À essayer », étapes à cocher, snippets à copier ou épingler, prompt Claude Code, outils, « Vérifié sur le web » avec les sources, notes, fiches du même reel |
| **Labo** | Kanban de tes astuces (glisser-déposer sur ordinateur) |
| **Snippets / Outils** | Toutes les commandes, prompts, configs et outils de toutes tes fiches |

Raccourcis clavier sur ordinateur : `n` pour importer, `/` pour chercher.

## Données et confidentialité

- Tes fiches sont dans **ton** Firestore (`users/{uid}/…`), lisible uniquement par les comptes Google listés dans `ada.config.json` (`firestore.rules`).
- Ta config (`ada.config.json`, `public/js/config.js`, `firebase.json`, `.firebaserc`, `firestore.rules`) est générée par `npm run configure` et **n'est pas versionnée**. Seuls les modèles le sont.
- Tes réglages d'IA (`.env`) et la connexion de ton PC (`.ada-session.json`) ne quittent pas ton PC.
- Exports : Réglages → Markdown (tout, ou tes astuces adoptées), sauvegarde `.json`, restauration. Sur le PC, `npm run export` écrit `export/ada.md`, à donner à Claude Code avec `@`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run setup` | Installation guidée sur ton compte Google / Firebase |
| `npm run dev` | Le PC de la maison : app sur http://localhost:5174 + analyse des imports |
| `npm run deploy` | Remet l'app en ligne après une modification (change `VERSION` dans `public/sw.js` pour que les téléphones la récupèrent) |
| `npm run configure` | Régénère les fichiers de config depuis `ada.config.json` (par exemple après avoir ajouté un compte autorisé) |
| `npm run export` | Toute ta base en Markdown dans `export/` |
| `npm run icons` | Régénère les icônes depuis `assets/logo.png` |

## Structure

```
server.js                  le PC de la maison : sert l'app en local, se connecte, lance l'analyse
lib/worker.js              file d'attente : imports en attente → analyse → fiche(s)
lib/analyze.js             schéma des fiches, consignes, moteurs cli / api / command / local
lib/sources.js             lecture des liens (Instagram, TikTok, YouTube, Facebook, GitHub, web)
lib/local-analyze.js       analyse sans IA
lib/firestore-rest.js      accès Firestore en ton nom (API REST, jeton de connexion)
public/                    l'app (Firebase Hosting)
  js/cloud.js              connexion Google + Firestore
  js/store.js              fiches en direct, file d'imports, PC de la maison
  js/fiche.js              forme d'une fiche (partagée avec le PC)
  js/views/*.js            un fichier par écran
scripts/setup.js           installation guidée
scripts/configure.js       génère la config depuis ada.config.json
firestore.rules.template   règles de sécurité (comptes autorisés insérés par configure)
assets/logo.png            logo source (portrait d'Ada Lovelace)
```

## Licence

[MIT](LICENSE) : tu peux utiliser, modifier et redistribuer Ada librement, en gardant la mention de copyright.
