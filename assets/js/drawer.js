/* =============================================================================
   DRAWER.JS — Composant "menu hamburger / tiroir de navigation"
   =============================================================================

   Ce fichier construit et gère TOUT le tiroir de navigation globale du site :
     - le bouton hamburger (.menu-btn) en haut à droite,
     - le fond semi-transparent (.drawer-overlay),
     - le tiroir lui-même (.site-drawer) avec :
         · les 5 liens vers les pages du site,
         · le panneau "accessibilité" (mode sombre / police dyslexie),
         · le sélecteur de langue FR / DE / EN.

   Comme ce composant est EXACTEMENT le même sur toutes les pages, son code
   HTML n'est plus écrit "en dur" dans chaque page : il est généré ici, en
   JavaScript, puis ajouté au <body> au chargement de la page.

   UTILISATION dans chaque page HTML :
     <body data-page="apropos">   <!-- "accueil", "projets", "notions",
                                        "histoire" ou "apropos" -->
       ... contenu de la page ...

       <script src="assets/js/i18n.js"></script>
       <script src="assets/js/drawer.js"></script>
       <script>
         document.addEventListener('DOMContentLoaded', () => {
           SiteApp.initDrawer();
         });
       </script>
     </body>

   Le CSS correspondant (.menu-btn, .site-drawer, .drawer-overlay, etc.)
   se trouve dans assets/css/common.css : il est donc déjà chargé par
   toutes les pages.
============================================================================= */

window.SiteApp = window.SiteApp || {};

(function () {

  /* ════════════════════════════════════════════════════════════════════
     PERSISTANCE DES PRÉFÉRENCES (mode sombre, police dyslexie, langue)
     ════════════════════════════════════════════════════════════════════
     Sans cela, chaque changement de page réinitialise ces réglages :
     l'utilisateur doit rouvrir le tiroir et les réactiver à chaque fois.

     Trois mécanismes sont utilisés, dans cet ordre de préférence (voir
     readPref / writePref ci-dessous) :
       1. sessionStorage — même mécanisme que assets/js/intro-overlay.js,
          partagé entre les pages du même onglet.
       2. localStorage   — conserve les préférences même après fermeture
          du navigateur.
       3. cookie         — repli si les deux précédents sont indisponibles
          (navigation privée très restrictive, protocole file://...).

     Lecture/écriture protégées par try/catch : si un mécanisme est
     indisponible, on passe simplement au suivant, sans rien casser.
  ════════════════════════════════════════════════════════════════════ */
  const STORAGE_KEYS = {
    darkMode: 'greenbeans-dark-mode',
    dyslexicFont: 'greenbeans-dyslexic-font',
    lang: 'greenbeans-lang',
  };

  /*
    ── Repli sur les cookies ───────────────────────────────────────────
    Dans certains contextes (ouverture des pages en double-cliquant,
    protocole file://, navigation privée), localStorage peut être
    indisponible ou ne pas être conservé d'une page à l'autre. Les
    cookies fonctionnent dans ces cas-là : on les utilise donc en repli.
    Durée : 1 an.
  */
  function readCookie(key) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(key, value) {
    document.cookie = key + '=' + encodeURIComponent(value) + '; max-age=31536000; path=/';
  }

  function readPref(key) {
    try {
      const val = sessionStorage.getItem(key);
      if (val !== null) return val;
    } catch (err) {
      /* sessionStorage indisponible : on essaie la suite */
    }

    try {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    } catch (err) {
      /* localStorage indisponible : on essaie le cookie */
    }

    return readCookie(key);
  }

  function writePref(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (err) {
      /* tant pis, on continue avec les autres mécanismes */
    }

    try {
      localStorage.setItem(key, value);
    } catch (err) {
      /* localStorage indisponible : on se contente du cookie / de session */
    }

    writeCookie(key, value);
  }

  /*
   * ── Construction du HTML du tiroir ───────────────────────────────────────
   * Reproduit fidèlement le HTML qui était auparavant dupliqué dans chaque
   * page (site-drawer, drawer-overlay, menu-btn).
   * Les attributs data-i18n sont conservés : assets/js/i18n.js saura les
   * retrouver pour appliquer les traductions (voir common_*.json, à la
   * racine du site).
   */
  function buildDrawerMarkup() {
    return `
<div class="drawer-overlay" id="drawerOverlay" aria-hidden="true"></div>

<nav
  class="site-drawer"
  id="siteDrawer"
  role="dialog"
  aria-modal="true"
  aria-label="Navigation principale"
  aria-hidden="true"
>
  <a class="drawer-item" href="home.html" data-page="accueil" data-i18n="drawer-accueil" target="_blank" rel="noopener noreferrer">accueil</a>
  <a class="drawer-item" href="projects.html" data-page="projets" data-i18n="drawer-projets" target="_blank" rel="noopener noreferrer">projets</a>
  <a class="drawer-item" href="concepts.html" data-page="notions" data-i18n="drawer-notions" target="_blank" rel="noopener noreferrer">notions</a>
  <a class="drawer-item" href="history.html" data-page="histoire" data-i18n="drawer-histoire" target="_blank" rel="noopener noreferrer">histoire</a>
  <a class="drawer-item" href="about.html" data-page="apropos" data-i18n="drawer-apropos" target="_blank" rel="noopener noreferrer">à propos</a>

  <!--
    ── Item "Accessibilité" ─────────────────────────────────────────────
    Bouton (et non un lien) : son clic n'entraîne ni navigation, ni
    fermeture du tiroir. Il déroule un petit panneau contenant deux
    interrupteurs : mode sombre et police adaptée aux personnes
    dyslexiques. Les deux préférences sont appliquées immédiatement,
    via des classes posées sur <html> et <body>, et mémorisées pour les
    pages suivantes (voir PERSISTANCE DES PRÉFÉRENCES plus haut).
  -->
  <div class="drawer-accessibility">
    <button
      type="button"
      class="drawer-accessibility-btn"
      id="accessibilityBtn"
      aria-expanded="false"
      aria-controls="accessibilityPanel"
    >
      <span data-i18n="drawer-accessibilite">accessibilité</span>
    </button>

    <div class="accessibility-panel" id="accessibilityPanel" hidden>

      <label class="a11y-option">
        <span data-i18n="a11y-dark-mode">mode sombre</span>
        <span class="a11y-switch">
          <input type="checkbox" id="darkModeToggle" />
          <span class="a11y-track"></span>
          <span class="a11y-thumb"></span>
        </span>
      </label>

      <label class="a11y-option">
        <span data-i18n="a11y-dyslexic-font">police adaptée (dyslexie)</span>
        <span class="a11y-switch">
          <input type="checkbox" id="dyslexicFontToggle" />
          <span class="a11y-track"></span>
          <span class="a11y-thumb"></span>
        </span>
      </label>

    </div>
  </div>

  <!--
    ── Sélecteur de langue (FR / DE / EN) ───────────────────────────────
    Un clic change la langue de tous les éléments porteurs d'un attribut
    data-i18n (voir assets/js/i18n.js).
  -->
  <div class="drawer-langs" role="group" aria-label="Choix de la langue">
    <button type="button" class="lang-item lang-item--disabled active" data-lang="fr" aria-pressed="true" aria-disabled="true" title="La fonctionnalité de traduction n'est pas encore développée. Veuillez m'excuser pour cette gêne.">FR</button>
    <button type="button" class="lang-item lang-item--disabled" data-lang="de" aria-pressed="false" aria-disabled="true" title="Die Übersetzungsfunktion ist noch nicht entwickelt. Ich entschuldige mich für die Unannehmlichkeiten.">DE</button>
    <button type="button" class="lang-item lang-item--disabled" data-lang="en" aria-pressed="false" aria-disabled="true" title="The translation feature is not yet available. I apologise for the inconvenience.">EN</button>
  </div>
</nav>

<button
  class="menu-btn"
  id="menuBtn"
  aria-controls="siteDrawer"
  aria-expanded="false"
  aria-label="Ouvrir le menu"
>
  <span class="bar"></span>
  <span class="bar"></span>
  <span class="bar"></span>
</button>
`;
  }

  /*
   * ── Initialisation ─────────────────────────────────────────────────────
   * 1. Injecte le HTML du tiroir à la fin de <body>.
   * 2. Met en évidence le lien correspondant à la page courante
   *    (via l'attribut data-page="..." posé sur <body>).
   * 3. Branche tous les comportements (ouverture/fermeture, accessibilité,
   *    langue).
   */
  function initDrawer() {
    document.body.insertAdjacentHTML('beforeend', buildDrawerMarkup());

    const drawerOverlay = document.getElementById('drawerOverlay');
    const siteDrawer    = document.getElementById('siteDrawer');
    const menuBtn       = document.getElementById('menuBtn');

    /* ── Lien actif : marque la page courante dans le tiroir ────────────── */
    const currentPage = document.body.dataset.page;
    if (currentPage) {
      const currentLink = siteDrawer.querySelector(`.drawer-item[data-page="${currentPage}"]`);
      if (currentLink) currentLink.setAttribute('aria-current', 'page');
    }

    /* ════════════════════════════════════════════════════════════════════
       Ouverture / fermeture du tiroir
    ════════════════════════════════════════════════════════════════════ */
    function openDrawer() {
      siteDrawer.classList.add('is-open');
      drawerOverlay.classList.add('is-open');
      menuBtn.classList.add('is-open');

      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Fermer le menu');
      siteDrawer.setAttribute('aria-hidden', 'false');

      const firstLink = siteDrawer.querySelector('.drawer-item');
      if (firstLink) firstLink.focus();
    }

    function closeDrawer() {
      siteDrawer.classList.remove('is-open');
      drawerOverlay.classList.remove('is-open');
      menuBtn.classList.remove('is-open');

      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Ouvrir le menu');
      siteDrawer.setAttribute('aria-hidden', 'true');

      menuBtn.focus();
    }

    menuBtn.addEventListener('click', () => {
      siteDrawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
    });

    drawerOverlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && siteDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    /* ════════════════════════════════════════════════════════════════════
       Accessibilité — mode sombre & police adaptée aux personnes dyslexiques
    ════════════════════════════════════════════════════════════════════ */
    const accessibilityBtn   = document.getElementById('accessibilityBtn');
    const accessibilityPanel = document.getElementById('accessibilityPanel');
    const darkModeToggle      = document.getElementById('darkModeToggle');
    const dyslexicFontToggle  = document.getElementById('dyslexicFontToggle');

    accessibilityBtn.addEventListener('click', () => {
      const isOpen = !accessibilityPanel.hasAttribute('hidden');

      if (isOpen) {
        accessibilityPanel.setAttribute('hidden', '');
      } else {
        accessibilityPanel.removeAttribute('hidden');
      }

      accessibilityBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    darkModeToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode', darkModeToggle.checked);
      document.documentElement.classList.toggle('dark-mode', darkModeToggle.checked);
      writePref(STORAGE_KEYS.darkMode, darkModeToggle.checked ? '1' : '0');
    });

    dyslexicFontToggle.addEventListener('change', () => {
      document.body.classList.toggle('dyslexic-font', dyslexicFontToggle.checked);
      document.documentElement.classList.toggle('dyslexic-font', dyslexicFontToggle.checked);
      writePref(STORAGE_KEYS.dyslexicFont, dyslexicFontToggle.checked ? '1' : '0');
    });

    /*
      ── Application des préférences mémorisées ─────────────────────────
      Un petit script inline, placé dans <head> de chaque page (voir le
      HTML), applique déjà les classes "dark-mode" / "dyslexic-font" sur
      <html> avant même le rendu de la page, pour éviter tout effet de
      flash. Ici, on :
        1. relit les préférences (au cas où ce script inline serait
           absent ou aurait échoué) et on s'assure que <html> ET <body>
           portent bien les bonnes classes ;
        2. on synchronise l'état visuel des interrupteurs (cases à
           cocher) avec la classe effectivement présente sur <html>.
    */
    if (readPref(STORAGE_KEYS.darkMode) === '1' || document.documentElement.classList.contains('dark-mode')) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      darkModeToggle.checked = true;
    }

    if (readPref(STORAGE_KEYS.dyslexicFont) === '1' || document.documentElement.classList.contains('dyslexic-font')) {
      document.body.classList.add('dyslexic-font');
      document.documentElement.classList.add('dyslexic-font');
      dyslexicFontToggle.checked = true;
    }

    /* ════════════════════════════════════════════════════════════════════
       Sélecteur de langue (FR / DE / EN)
       La logique de traduction proprement dite vit dans assets/js/i18n.js
       (SiteApp.setLanguage). Ici, on se contente de réagir au clic.
    ════════════════════════════════════════════════════════════════════ */
    const langButtons = siteDrawer.querySelectorAll('.lang-item');

    langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('lang-item--disabled')) return;
        if (window.SiteApp && typeof window.SiteApp.setLanguage === 'function') {
          window.SiteApp.setLanguage(btn.dataset.lang);
        }
        writePref(STORAGE_KEYS.lang, btn.dataset.lang);
      });
    });

    /*
      ── Application de la langue mémorisée ──────────────────────────────
      Si une langue autre que le français (langue par défaut du HTML) a
      été choisie sur une page précédente, on l'applique dès le chargement.
    */
    const storedLang = readPref(STORAGE_KEYS.lang);
    if (storedLang && storedLang !== 'fr' && window.SiteApp && typeof window.SiteApp.setLanguage === 'function') {
      window.SiteApp.setLanguage(storedLang);
    }

    /*
      ── Activation des transitions de couleur ───────────────────────────
      Voir assets/css/common.css : les transitions (background-color,
      color, border-color) ne s'appliquent qu'aux éléments dont un
      ancêtre <html> porte la classe "js-ready". On l'ajoute seulement
      maintenant, une fois le premier rendu effectué dans le bon thème
      (classes déjà posées par le script de préchargement dans <head>) :
      ainsi, le premier affichage de la page est instantané (aucune
      transition à animer, donc aucun flash clair/sombre), et les
      bascules manuelles ultérieures (mode sombre, police dyslexie)
      restent animées en douceur.
      requestAnimationFrame : on attend une image rendue avant d'activer
      les transitions, pour être certain qu'aucun changement de classe
      ne soit encore "en attente" de rendu.
    */
    requestAnimationFrame(() => {
      document.documentElement.classList.add('js-ready');
    });
  }

  window.SiteApp.initDrawer = initDrawer;

})();
