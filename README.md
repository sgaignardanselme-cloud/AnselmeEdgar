# [Nom de la marque] — Site vitrine V1

Site statique HTML/CSS/JS (aucune dépendance à installer). Ouvrir `index.html`
dans un navigateur suffit en local ; pour le déploiement voir plus bas.

## Pages

- `index.html` — Accueil
- `univers.html` — Univers / À propos
- `drop.html` — Drop en cours
- `archives.html` — Archives (structure prête, vide en V1)
- `contact.html` — Contact / Newsletter

## À remplacer avant mise en ligne

Cherchez les balises `[PLACEHOLDER ...]` / `[À REMPLACER]` dans les fichiers
`.html` et `css/style.css`. Liste des éléments à fournir (cf. brief section 6) :

- [ ] Nom définitif de la marque (présent dans le `<title>` et le logo de chaque page)
- [ ] Logo
- [ ] Affiche du premier drop (`index.html` hero + `drop.html`)
- [ ] 3-5 photos produits (`drop.html`, section galerie)
- [ ] Texte de la page Univers (`univers.html`)
- [ ] Liens réseaux sociaux (Instagram, TikTok — présents dans le menu et `contact.html`)
- [ ] Objet symbole choisi (texte dans `univers.html`) — palette actée : fond blanc nacré `#fbfaf7`, bleu profond `#1b2a4a` pour tout le texte (variables `--paper` / `--ink` dans `css/style.css`)
- [ ] Formulaire de contact : créer un compte sur https://formspree.io et remplacer
      l'`action` du `<form>` dans `contact.html`
- [ ] Mention légale (nom de société / statut juridique) dans les footers

## Images

Placer les visuels réels dans le dossier `images/` puis remplacer les blocs
`<div class="placeholder-visual">...</div>` par des balises `<img>` pointant
vers ces fichiers.

## Déploiement

Site 100% statique : déployable gratuitement sur Netlify ou GitHub Pages en
glissant le dossier, sans build ni configuration.
