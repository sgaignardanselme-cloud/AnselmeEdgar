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

## Images

Les photos (hero, univers, produits) s'ajoutent depuis le CMS (`/admin`),
qui les dépose dans `images/uploads/` et met à jour le JSON correspondant
automatiquement — pas besoin de toucher au HTML. `images/` reste disponible
pour tout visuel géré à la main hors CMS.

## Administration du contenu (CMS)

Le site utilise [Decap CMS](https://decapcms.org/) (ex-Netlify CMS) pour éditer
le contenu sans toucher au code — accessible sur `/admin` une fois le site
déployé.

### Comment ça marche (architecture)

Le site reste 100% HTML/CSS/JS statique — Decap CMS n'ajoute ni serveur ni
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

### Configurer Netlify Identity + Git Gateway (à faire une seule fois)

Ces étapes se font dans le tableau de bord Netlify, pas dans le code — à
faire par vous, sur le site déjà déployé :

1. Sur [app.netlify.com](https://app.netlify.com), ouvrez votre site →
   **Site configuration → Identity → Enable Identity**.
2. Toujours dans Identity → **Registration preferences** : passez sur
   **"Invite only"** (recommandé — personne ne peut s'auto-inscrire).
3. Toujours dans Identity → section **Services → Git Gateway → Enable Git
   Gateway**. C'est ce qui permet à Decap CMS de committer dans le dépôt au
   nom de l'utilisateur connecté, sans que vous ayez à créer de token GitHub
   ni à donner accès au repo directement.

### Créer votre premier compte administrateur (vous et votre associé)

1. Toujours dans l'onglet **Identity** du site sur Netlify → bouton
   **"Invite users"**.
2. Entrez votre email, puis celui de votre associé (un envoi par personne).
3. Chacun reçoit un email d'invitation Netlify → cliquer sur le lien →
   définir un mot de passe. Vous êtes automatiquement redirigé vers `/admin/`
   une fois connecté (géré par le script Netlify Identity présent sur
   `index.html`).

### Accéder à l'interface d'administration

- Une fois le compte créé : allez sur `https://votre-site.netlify.app/admin/`
  (ou le lien direct reçu par email la première fois).
- Connectez-vous avec l'email/mot de passe défini à l'invitation.
- Vous arrivez sur l'interface Decap CMS : "Réglages du site" (les textes de
  chaque section) et "Produits" (la collection des pièces du drop, avec
  boutons pour en ajouter/supprimer).

### Publier une modification — est-ce automatique ?

**Oui, comme avec Git.** Cliquer sur "Publier" dans le CMS crée directement
un commit sur la branche `main` du dépôt (via Git Gateway) — exactement comme
si vous aviez fait `git push` vous-même. Netlify détecte ce nouveau commit et
relance automatiquement `npm run build` (voir `netlify.toml`), qui recompile
`data/settings.json`/`data/products.json` à partir de vos changements, puis
republie le site. Il n'y a **aucune étape manuelle supplémentaire** — comptez
en général 1 à 2 minutes entre le clic sur "Publier" et la mise en ligne
effective (le temps que Netlify build + déploie).

Le mode de publication est actuellement `simple` (publication directe, sans
brouillon/validation) — avec deux personnes qui éditent, on peut passer à
l'`editorial_workflow` de Decap si vous voulez un système de brouillons
relus avant publication ; demandez si ça vous intéresse.

### Tester en local (optionnel)

Pour éditer depuis votre machine sans passer par Netlify Identity : lancez
`npx decap-server` dans un terminal, votre serveur statique habituel dans un
autre, puis ouvrez `/admin` — `local_backend: true` dans `config.yml` fait
que Decap écrit alors directement dans vos fichiers locaux.

## Déploiement

Site 100% statique : déployable gratuitement sur Netlify ou GitHub Pages en
glissant le dossier — `netlify.toml` (build : `npm run build`, publication :
la racine du dépôt) est nécessaire dès que vous utilisez le CMS, puisque
`data/settings.json`/`data/products.json` doivent être régénérés à chaque
modification de contenu (voir "Administration du contenu" ci-dessus). Sans
CMS, le site reste consultable tel quel sans aucun build.
