# [Nom de la marque] — Site vitrine V1

Site statique HTML/CSS/JS (aucune dépendance à installer). Ouvrir `index.html`
dans un navigateur suffit en local ; pour le déploiement voir plus bas.

## Pages

- `index.html` — page unique en défilement (scrollytelling) : Signature (`#marque`) →
  Accueil (`#accueil`) → Univers (`#univers`) → Drop (`#drop`) → Contact (`#contact`),
  dans cet ordre. Le menu et la navigation à points font défiler en douceur vers ces
  ancres au lieu de charger une nouvelle page. `#marque` est un chapitre d'ouverture
  (le nom de la marque en très grand, en calligraphie) — il n'a pas d'entrée dédiée
  dans le menu/la navigation à points, on le traverse juste au début du scroll.
- `archives.html` — page séparée (structure prête, vide en V1), non intégrée au
  défilement puisqu'elle n'a pas encore de contenu réel.
- `confirmation.html` — affichée après le clic sur "Payer" (panier.html) : récapitulatif
  de la commande, numéro généré côté client, panier vidé à ce moment-là. Les données
  viennent d'un `sessionStorage` posé juste avant la redirection (voir js/script.js) —
  ouvrir cette page directement, sans passer par le panier, affiche son état vide.
- `mentions-legales.html` — texte statique, pas géré par le CMS (voir la liste
  "À remplacer avant mise en ligne" plus bas).

## Navigation à une page

- Plus de barre fixe : seuls le nom de la marque (haut gauche) et une icône hamburger
  (haut droite) flottent en permanence par-dessus le fond, sans encart derrière eux.
  Le hamburger ouvre un panneau plein écran sombre avec tous les liens (`.site-menu`)
  et se transforme en croix pour le refermer.
- Le fond est un unique dégradé de bleu (`css/style.css`, `--gradient-stop-1..4`) qui
  couvre toute la hauteur du document — clair en haut, presque noir en bas — plutôt
  qu'une couleur par section. La couleur du texte posé directement dessus (`--text`)
  suit le même principe à 4 paliers (`js/script.js`), pour rester lisible du haut au
  bas de la page. Le texte à l'intérieur des cartes claires (cartel, formulaire,
  infos du drop) reste fixe (`--ink`) puisque ces cartes gardent leur propre fond
  clair quel que soit l'endroit de la page où elles se trouvent.
- La navigation à points (`.dot-nav`, à droite de l'écran, masquée sous 900px de large)
  et le lien actif du menu se mettent à jour automatiquement au scroll via la classe
  `.scroll-section` posée sur chaque bloc majeur — aucune configuration supplémentaire
  nécessaire en ajoutant du contenu à l'intérieur d'un bloc existant.
- ⚠️ Piège CSS à connaître : ne jamais animer `transform` sur `<body>` avec
  `animation-fill-mode: forwards`. Une fois l'animation terminée, la valeur reste
  appliquée en permanence — et même `translateY(0)` (visuellement neutre) n'est pas
  la même chose que `transform: none` : ça transforme `<body>` en référentiel de
  positionnement pour tous ses descendants en `position: fixed` (menu, nav
  flottante, navigation à points), qui se retrouvent alors positionnés par rapport
  à la hauteur totale du document au lieu de l'écran. Les animations d'entrée/sortie
  de page n'animent donc plus que `opacity`.

## À remplacer avant mise en ligne

La plupart de ces éléments s'éditent maintenant depuis `/admin` (voir
"Administration du contenu" plus bas) plutôt qu'en modifiant les fichiers —
listés ici pour mémoire (cf. brief section 6) :

- [ ] Nom définitif de la marque — CMS : Réglages du site → Général → *Nom de la marque*
      (remplace `[NOM DE LA MARQUE]` partout : `<title>`, logo flottant, section `#marque`)
- [ ] Logo — pas encore géré par le CMS (le logo est du texte, pas une image ; à faire en dur dans `.floating-logo` le jour venu)
- [ ] Affiche du premier drop — CMS : Réglages du site → Hero / Drop en cours → visuels
- [ ] 3-5 photos produits — CMS : collection Produits → chaque pièce → *Photo principale*
- [ ] Texte de la section Univers — CMS : Réglages du site → Univers
- [ ] Liens réseaux sociaux — CMS : Réglages du site → Général → *Lien Instagram / TikTok*
- [ ] Objet symbole choisi — CMS : Réglages du site → Univers → *Pièce maîtresse*
- [ ] Formulaire de contact : créer un compte sur https://formspree.io et remplacer
      l'`action` du `<form>` dans la section `#contact` (reste manuel — c'est une clé
      technique, pas du contenu éditorial)
- [ ] Mention légale — CMS : Réglages du site → Général → *Mention légale (footer)*
- [ ] Mesures du guide des tailles — CMS : Réglages du site → Guide des tailles
      (tour de poitrine / longueur / épaules par taille, tous vides pour l'instant)
- [ ] Page `mentions-legales.html` : texte statique, pas géré par le CMS (comme le
      formulaire de contact) — à réécrire une fois le statut juridique de la marque
      créé (forme juridique, adresse, SIREN/SIRET, responsable de publication...)
- [ ] Favicon — mark géométrique temporaire (même `<link rel="icon">` inline sur
      toutes les pages) ; à remplacer une fois un vrai logo/objet symbole choisi
- [ ] Balises Open Graph / Twitter Card (`og:url`, `twitter:image`, `og:image`...) — dans le
      `<head>` de chaque page en HTML statique, **pas** géré par le CMS : les robots de
      partage (Instagram, TikTok, WhatsApp...) ne chargent pas le JavaScript de la page,
      donc ces balises doivent rester du texte en dur. Cherchez `[À REMPLACER` dans les
      fichiers `.html` — il faut l'URL réelle du site une fois déployé.
## Images

Les photos (hero, univers, produits) s'ajoutent depuis le CMS (`/admin`),
qui les dépose dans `images/uploads/` et met à jour le JSON correspondant
automatiquement — pas besoin de toucher au HTML. `images/` reste disponible
pour tout visuel géré à la main hors CMS.

## Administration du contenu (CMS)

Le site utilise [Sveltia CMS](https://github.com/sveltia/sveltia-cms) — une
réécriture moderne de Decap CMS (ex-Netlify CMS), compatible avec le même
format de `config.yml` — pour éditer le contenu sans toucher au code,
accessible sur `/admin` une fois le site déployé.

### Comment ça marche (architecture)

Le site reste 100% HTML/CSS/JS statique — Sveltia CMS n'ajoute ni serveur ni
générateur de pages. Le mécanisme :

1. **`admin/config.yml`** décrit les collections éditables dans le CMS :
   - `Réglages du site` — un fichier par grande section (`content/settings/*.json` :
     général, hero, univers, drop, contact, archives), avec des champs fixes.
   - `Produits` — une vraie collection (`content/products/*.json`, un fichier
     par pièce) : ajout/suppression/modification libres depuis l'interface,
     avec nom, prix, description, matières, photo(s) et tailles disponibles.
2. Ces fichiers JSON sont ce que Decap CMS lit et modifie (via des commits
   Git). Un site 100% statique ne peut pas "lister le contenu d'un dossier"
   au chargement de la page — il n'y a pas de serveur pour répondre à cette
   question — donc **`npm run build`** (voir `package.json` /
   `scripts/build-content.js`) compile tous ces fichiers en deux fichiers
   uniques que le navigateur peut charger : `data/settings.json` et
   `data/products.json`.
3. **`js/content.js`**, chargé sur chaque page, va lire ces deux fichiers et
   remplit tous les éléments marqués `[data-cms]` / `[data-cms-img]` /
   `[data-cms-products]` dans le HTML. Sans build (ou sans JS), chaque page
   garde son texte `[PLACEHOLDER]` codé en dur — rien ne casse, c'est juste
   la version "avant édition".
4. Sur la fiche produit (`produit.html?p=<slug-du-produit>`), c'est aussi
   `content.js` qui construit le sélecteur de taille à partir des tailles
   réellement cochées pour ce produit dans le CMS, et la grille "Autres
   pièces du drop".

### Se connecter à l'administration : "Sign In with Token"

Le backend est `github` en direct (`admin/config.yml`) — pas de Netlify
Identity, pas de Git Gateway, et (depuis le passage à
[Sveltia CMS](https://github.com/sveltia/sveltia-cms), voir
`admin/index.html`) **pas non plus besoin d'OAuth App ni de service
intermédiaire à héberger**. Une OAuth App GitHub + un proxy OAuth
(Netlify, ou un Worker Cloudflare auto-hébergé) ne sont vraiment
nécessaires que pour ouvrir l'édition à des utilisateurs qui n'ont pas de
compte GitHub personnel ; ici on est seulement deux, tous deux déjà
utilisateurs GitHub avec accès en écriture au dépôt — Sveltia CMS a une
méthode plus simple pour exactement ce cas.

Sur l'écran de connexion de `/admin`, cliquez **"Sign In with Token"** :

1. Un lien pré-rempli s'ouvre vers **github.com/settings/tokens/new**, avec
   les autorisations (`repo`) déjà cochées.
2. Donnez un nom au token (ex. "CMS AnselmeEdgar"), choisissez une
   expiration, cliquez **Generate token**, copiez-le (affiché une seule
   fois).
3. Collez-le dans la fenêtre de connexion de Sveltia CMS.

Le token reste stocké dans le navigateur (local storage) — à refaire si
vous videz le stockage local ou changez de navigateur/appareil. Chaque
personne qui doit publier génère son propre token sur son propre compte
GitHub (voir "Donner accès au dépôt" ci-dessous pour les droits requis).

### Donner accès au dépôt à votre associé

Différence importante par rapport à Git Gateway : ici, le CMS committe
directement en tant que **l'utilisateur GitHub connecté** — chaque personne
qui doit pouvoir publier a donc besoin d'un compte GitHub avec accès en
écriture à ce dépôt (`sgaignardanselme-cloud/AnselmeEdgar`), pas juste d'une
invitation Netlify. Sur github.com : **Settings du dépôt → Collaborators →
Add people** → inviter le compte GitHub de votre associé (il devra accepter
l'invitation reçue par email/notification GitHub).

### Accéder à l'interface d'administration

- Allez sur `https://votre-site.pages.dev/admin/` (ou votre domaine
  personnalisé si vous en avez configuré un côté Cloudflare).
- Connectez-vous via **"Sign In with Token"** (voir ci-dessus).
- Vous arrivez sur l'interface Sveltia CMS : "Réglages du site" (les textes
  de chaque section) et "Produits" (la collection des pièces du drop, avec
  boutons pour en ajouter/supprimer).

### Publier une modification — est-ce automatique ?

Cliquer sur "Publier" dans le CMS crée directement un commit sur la branche
`main` du dépôt, authentifié comme votre compte GitHub — exactement comme si
vous aviez fait `git push` vous-même. `data/settings.json`/
`data/products.json` doivent ensuite être recompilés depuis
`content/settings/`/`content/products/` par `npm run build` (voir
`scripts/build-content.js`) avant que le changement soit visible sur le site
— **selon comment ce dépôt est branché à Cloudflare** (Pages avec build
automatique sur chaque push, ou un déploiement déclenché autrement), cette
étape peut être automatique ou nécessiter une action manuelle ; vérifiez la
configuration de build de votre projet Cloudflare pour confirmer laquelle
s'applique ici. (Sous Netlify, avant la migration, ce recompile + la
republication étaient entièrement automatiques après chaque "Publier",
sans étape manuelle — comptez le même ordre de grandeur, 1 à 2 minutes,
si le build automatique Cloudflare est bien configuré.)

Le mode de publication est actuellement `simple` (publication directe, sans
brouillon/validation). Decap CMS propose un `editorial_workflow` (brouillons
+ relecture avant publication) pour ce cas, mais Sveltia CMS ne le supporte
pas encore à ce jour — publication directe uniquement pour l'instant.

## Déploiement

Site 100% statique : déployable gratuitement sur Netlify ou GitHub Pages en
glissant le dossier — `netlify.toml` (build : `npm run build`, publication :
la racine du dépôt) est nécessaire dès que vous utilisez le CMS, puisque
`data/settings.json`/`data/products.json` doivent être régénérés à chaque
modification de contenu (voir "Administration du contenu" ci-dessus). Sans
CMS, le site reste consultable tel quel sans aucun build.
