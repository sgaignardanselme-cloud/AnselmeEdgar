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

Cherchez les balises `[PLACEHOLDER ...]` / `[À REMPLACER]` dans les fichiers
`.html` et `css/style.css`. Liste des éléments à fournir (cf. brief section 6) :

- [ ] Nom définitif de la marque (présent dans le `<title>`, le logo flottant, et en
      très grand dans la section `#marque` — remplacer "NOM DE LA MARQUE",
      police calligraphique "Great Vibes")
- [ ] Logo
- [ ] Affiche du premier drop (section `#accueil` et `#drop` dans `index.html`)
- [ ] 3-5 photos produits (section `#drop`, galerie)
- [ ] Texte de la section Univers (`#univers` dans `index.html`)
- [ ] Liens réseaux sociaux (Instagram, TikTok — présents dans le menu et `#contact`)
- [ ] Objet symbole choisi (texte dans `#univers`) — palette actée : fond blanc nacré `#fbfaf7`, bleu profond `#1b2a4a` pour tout le texte (variables `--paper` / `--ink` dans `css/style.css`)
- [ ] Formulaire de contact : créer un compte sur https://formspree.io et remplacer
      l'`action` du `<form>` dans la section `#contact`
- [ ] Mention légale (nom de société / statut juridique) dans le footer

## Images

Placer les visuels réels dans le dossier `images/` puis remplacer les blocs
`<div class="placeholder-visual">...</div>` par des balises `<img>` pointant
vers ces fichiers.

## Déploiement

Site 100% statique : déployable gratuitement sur Netlify ou GitHub Pages en
glissant le dossier, sans build ni configuration.
