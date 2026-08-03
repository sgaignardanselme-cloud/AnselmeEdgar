// ---------------------------------------------------------------------
// Protection du site par mot de passe (avant le lancement officiel du drop)
// ---------------------------------------------------------------------
// Chargé en tout premier dans <head>, sur TOUTES les pages du site (y
// compris entree.html lui-même) — voir la liste complète dans README.md.
//
// LE JOUR DU LANCEMENT : passer SITE_LOCK_ENABLED à false ci-dessous.
// Une seule ligne à changer, sur ce seul fichier, pour désactiver la
// protection sur tout le site d'un coup.
window.SITE_LOCK_ENABLED = true;

// Mot de passe attendu sur l'écran d'entrée (entree.html). Seule variable
// à modifier ici si le mot de passe doit changer.
window.SITE_LOCK_PASSWORD = "vernissage2026";

// Clé localStorage posée quand "Rester connecté" est coché en saisissant
// le mot de passe (voir entree.html) — tant qu'elle est présente,
// l'accès reste débloqué même après un rechargement de page ou une
// fermeture du navigateur, jusqu'à ce que le visiteur vide son stockage
// local.
window.SITE_LOCK_STORAGE_KEY = "site_access_granted";

// Clé sessionStorage posée quand "Rester connecté" N'est PAS coché —
// débloque la navigation normale (suivre des liens) au sein du même
// onglet, mais PAS un rechargement de page (voir isReload() plus bas) :
// recharger une page redemande alors le mot de passe, contrairement à
// SITE_LOCK_STORAGE_KEY ci-dessus.
window.SITE_LOCK_SESSION_KEY = "site_access_granted_session";

// Nom de fichier de l'écran d'entrée lui-même — ne doit jamais se
// rediriger vers lui-même (boucle infinie sinon).
window.SITE_LOCK_GATE_PAGE = "entree.html";

// ---------------------------------------------------------------------
// CE QUE CETTE PROTECTION FAIT — ET NE FAIT PAS :
// C'est une protection côté client uniquement (aucun serveur ne
// vérifie quoi que ce soit) : elle empêche un visiteur normal — qui
// suit un lien ou tape une URL dans son navigateur — de voir le
// contenu avant d'avoir saisi le mot de passe. Elle n'empêche PAS
// quelqu'un de désactiver JavaScript, de lire le code source de ce
// fichier (le mot de passe y est en clair, pas chiffré), ou d'inspecter
// le réseau — ce n'est pas un vrai contrôle d'accès. Pour une
// protection robuste, même sans JavaScript, il faudrait un mécanisme
// côté serveur (par ex. Cloudflare Access, ou un Worker qui vérifie une
// session avant de servir les fichiers) — le site est déjà sur
// Cloudflare, donc Cloudflare Access est l'option la plus simple si un
// vrai contrôle d'accès devient nécessaire.
// ---------------------------------------------------------------------
(function () {
  if (!window.SITE_LOCK_ENABLED) return;

  // Nom de fichier de la page courante (ex. "produit.html"), "index.html"
  // si l'URL est vide/racine ("/" ou "").
  var here = window.location.pathname.split("/").pop() || "index.html";
  if (here === window.SITE_LOCK_GATE_PAGE) return;

  // Distingue "cette page vient d'être rechargée" (F5, Ctrl+R, bouton
  // recharger) d'une navigation normale (clic sur un lien, redirection
  // depuis entree.html après le bon mot de passe) — la Navigation Timing
  // API donne ce type directement. Sans "Rester connecté" coché, un
  // rechargement doit redemander le mot de passe ; une navigation
  // normale au sein du même onglet ne doit pas. Ancien navigateur sans
  // cette API (ou l'API échoue) → tant pis, on suppose que ce n'est pas
  // un rechargement plutôt que de redemander le mot de passe à tort.
  function isReload() {
    try {
      var entries = window.performance && window.performance.getEntriesByType
        ? window.performance.getEntriesByType("navigation")
        : [];
      if (entries && entries.length && entries[0].type) {
        return entries[0].type === "reload";
      }
    } catch (error) {
      // ignore, on retente le fallback ci-dessous
    }
    try {
      if (window.performance && window.performance.navigation) {
        return window.performance.navigation.type === 1; // TYPE_RELOAD
      }
    } catch (error) {
      // ignore
    }
    return false;
  }

  var remembered = false;
  try {
    remembered = window.localStorage.getItem(window.SITE_LOCK_STORAGE_KEY) === "true";
  } catch (error) {
    // localStorage inaccessible (navigation privée stricte, stockage
    // bloqué...) — pas de "Rester connecté" possible sans lui.
    remembered = false;
  }

  var sessionUnlocked = false;
  try {
    sessionUnlocked = window.sessionStorage.getItem(window.SITE_LOCK_SESSION_KEY) === "true";
  } catch (error) {
    sessionUnlocked = false;
  }

  // Débloqué si "Rester connecté" a été coché (persiste toujours), ou si
  // l'accès session est actif ET que cette page n'est pas un rechargement.
  var unlocked = remembered || (sessionUnlocked && !isReload());
  if (unlocked) return;

  // Uniquement le nom de fichier + query/hash — jamais un chemin complet
  // ou une URL absolue — pour que le retour après saisie du mot de passe
  // (voir entree.html) ne puisse pointer que vers une page du site.
  var next = encodeURIComponent(here + window.location.search + window.location.hash);
  window.location.replace(window.SITE_LOCK_GATE_PAGE + "?next=" + next);
})();
