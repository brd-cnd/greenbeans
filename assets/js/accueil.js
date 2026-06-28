/* =============================================================================
   ACCUEIL.JS — Comportement propre à la page d'accueil
   =============================================================================

   Gère l'effet de survol du menu de la page d'accueil :
     - survol / focus d'un item du menu (.panel-nav .nav-item)
       → l'item ressort, les autres sont atténués,
       → la couche visuelle correspondante (.media-layer[data-section="..."])
         devient active dans le panneau de gauche (.panel-media).
     - quand la souris quitte à la fois le panneau média et le menu
       (par ex. elle passe sur le titre vertical ou hors de la fenêtre),
       on revient à l'état par défaut.

   Sur les appareils SANS survol réel (mobile, tablette tactile — voir
   "hover: none" plus bas), survoler le menu est impossible : un carrousel
   automatique prend alors le relais et fait défiler les 4 sections en
   boucle, pour que ce contenu reste découvrable sans souris.

   Le tiroir de navigation (hamburger, accessibilité, langue) est commun à
   toutes les pages et géré par assets/js/drawer.js.

   Utilisation : appeler SiteApp.initAccueilMedia() après le chargement du DOM.
============================================================================= */

window.SiteApp = window.SiteApp || {};

(function () {

  function initAccueilMedia() {
    const nav        = document.querySelector('.panel-nav');
    const panelMedia = document.querySelector('.panel-media');
    const navItems   = document.querySelectorAll('.panel-nav .nav-item');
    const layers     = document.querySelectorAll('.media-layer');

    if (!nav || !panelMedia) return;

    /*
     * activeKey retient la dernière section activée (survol, focus, ou
     * avancée automatique du carrousel). null = état par défaut.
     */
    let activeKey = null;

    /* ── Affiche la couche correspondant à key ─────────────────────────── */
    function showLayer(key) {
      layers.forEach(layer => {
        layer.classList.toggle('active', layer.dataset.section === (key ?? 'default'));
      });
    }

    /* ── Réinitialise vers l'état par défaut ───────────────────────────── */
    function resetToDefault() {
      activeKey = null;
      nav.classList.remove('has-hover');
      navItems.forEach(el => el.classList.remove('hovered'));
      showLayer(null);
    }

    /*
     * ── Active une section donnée ────────────────────────────────────────
     * Factorisé ici car TROIS déclencheurs partagent désormais exactement
     * le même comportement visuel (item ressorti dans le menu + couche
     * correspondante affichée à gauche) : le survol souris, le focus
     * clavier, et l'avancée automatique du carrousel mobile (voir plus
     * bas).
     */
    function activateSection(key) {
      activeKey = key;
      nav.classList.add('has-hover');
      navItems.forEach(el => el.classList.remove('hovered'));
      const matchingItem = Array.from(navItems).find(el => el.dataset.target === key);
      if (matchingItem) matchingItem.classList.add('hovered');
      showLayer(key);
    }

    /*
     * ── Survol / focus d'un item du menu ────────────────────────────────
     * mouseenter (ne bouillonne pas) : fiable et sans ambiguïté.
     * focus : navigation au clavier.
     */
    navItems.forEach(item => {
      item.addEventListener('mouseenter', () => activateSection(item.dataset.target));
      item.addEventListener('focus',      () => activateSection(item.dataset.target));
    });

    /*
     * ── La souris entre dans le panneau média ───────────────────────────
     * On ne fait RIEN : la couche active reste visible pour que
     * l'utilisateur puisse lire tranquillement le texte affiché sans que
     * tout disparaisse.
     */
    panelMedia.addEventListener('mouseenter', () => {
      /* Intentionnellement vide : on conserve activeKey et la couche affichée */
    });

    /*
     * ── "hover: none" : appareils sans survol réel ──────────────────────
     * Sur mobile / tablette tactile, rien ne peut jamais déclencher
     * mouseenter : la réinitialisation "souris hors zone" ci-dessous n'a
     * alors plus aucun sens et risquerait même d'interrompre le carrousel
     * automatique (voir plus bas) au moindre évènement tactile résiduel.
     * On la neutralise donc sur ce type d'appareil.
     */
    const noHoverMQ = window.matchMedia('(hover: none)');

    /*
     * ── Zones neutres (titre vertical, marges, etc.) ────────────────────
     * Si la souris n'est ni dans le panneau média ni dans le menu,
     * on réinitialise l'affichage.
     */
    document.addEventListener('mousemove', e => {
      if (noHoverMQ.matches) return;
      if (activeKey === null) return; // déjà par défaut, rien à faire

      const inMedia = panelMedia.contains(e.target) || panelMedia === e.target;
      const inNav   = nav.contains(e.target)        || nav === e.target;

      if (!inMedia && !inNav) {
        resetToDefault();
      }
    });

    /*
     * ── La souris quitte complètement la fenêtre ────────────────────────
     * mousemove ne se déclenche pas quand le curseur sort de la fenêtre
     * (barre d'adresse, autre application, etc.). On ajoute donc un
     * mouseleave sur <html> : si la souris quitte le document entier,
     * on revient systématiquement au dégradé par défaut.
     */
    document.documentElement.addEventListener('mouseleave', () => {
      if (noHoverMQ.matches) return;
      if (activeKey !== null) {
        resetToDefault();
      }
    });

    /* ── Initialisation ───────────────────────────────────────────────── */
    showLayer(null);

    /* ════════════════════════════════════════════════════════════════════
       CARROUSEL AUTOMATIQUE (mobile / tactile uniquement)
       ════════════════════════════════════════════════════════════════════
       Reprend l'ordre des sections directement depuis les items du menu
       (.nav-item), pour rester toujours synchronisé avec lui — même si
       l'ordre des liens change un jour dans le HTML, aucune autre
       modification n'est nécessaire ici.

       Durée d'affichage de chaque section : 4,5 secondes. Volontairement
       ni trop courte (le temps de lire le titre ET la description sans se
       presser) ni trop longue (on comprend vite que ça va continuer à
       bouger, sans se demander si la page est figée).

       Respecte la préférence "mouvement réduit" : si elle est activée, le
       carrousel ne démarre pas du tout — la page reste sur le dégradé par
       défaut, comme avant l'ajout de cette fonctionnalité. Cohérent avec
       le reste du site (voir assets/css/common.css).
    ════════════════════════════════════════════════════════════════════ */
    const CAROUSEL_INTERVAL_MS = 4500;
    const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sectionOrder = Array.from(navItems)
      .map(el => el.dataset.target)
      .filter(Boolean);

    let carouselTimer = null;
    let carouselIndex = -1; // -1 = dégradé par défaut, avant la 1ère section

    function carouselTick() {
      carouselIndex = (carouselIndex + 1) % sectionOrder.length;
      activateSection(sectionOrder[carouselIndex]);
    }

    function startCarousel() {
      if (carouselTimer || sectionOrder.length === 0) return;
      carouselTimer = setInterval(carouselTick, CAROUSEL_INTERVAL_MS);
    }

    function stopCarousel() {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }

    /* Démarre le carrousel uniquement si l'appareil n'a pas de survol réel
       ET que "mouvement réduit" n'est pas demandé ; l'arrête sinon. */
    function syncCarouselToDevice() {
      if (noHoverMQ.matches && !reducedMotionMQ.matches) {
        startCarousel();
      } else {
        stopCarousel();
      }
    }

    syncCarouselToDevice();

    /* Le profil de l'appareil peut changer en cours de session (tablette
       branchée à une souris, préférence "mouvement réduit" activée ou
       désactivée à la volée) : on réévalue dans ces deux cas. */
    noHoverMQ.addEventListener('change', syncCarouselToDevice);
    reducedMotionMQ.addEventListener('change', syncCarouselToDevice);

    /* Mise en pause quand l'onglet n'est plus visible : économise des
       ressources, et évite un "saut" de plusieurs sections d'un coup au
       retour sur l'onglet. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopCarousel();
      } else {
        syncCarouselToDevice();
      }
    });
  }

  window.SiteApp.initAccueilMedia = initAccueilMedia;

})();
