/* =============================================================================
   INTERIOR-NAV.JS — Sous-menu du "hero" et panneaux de contenu
   =============================================================================

   Ce comportement est commun aux 4 pages "intérieures"
   (projects.html, concepts.html, history.html, about.html) :

     1. Survol / focus d'un item du sous-menu (.hero-nav .nav-item)
        → l'item ressort (classe .hovered), les autres sont atténués
          (classe .has-hover sur .hero-nav).
        → la description (.hero-description) ne change plus : il n'y a
          désormais qu'un seul texte statique par page, affiché en
          permanence, quel que soit l'item survolé.

     2. Clic sur un item du sous-menu
        → empêche la navigation (ce sont des ancres "href=...html" laissées
          pour la sémantique / le repli sans JS),
        → affiche le panneau de contenu correspondant
          (.section-panel[data-panel="..."]) et masque les autres.

     3. Survol / clic des ".project-item" (cases "portraits", "histoire",
        etc. dans chaque panneau)
        → au survol/focus d'une case, la "toile" correspondante
          (.project-canvas[data-canvas="..."]) est affichée à droite,
          les autres sont masquées.
        → au clic (ou touche Entrée/Espace), on navigue vers la page
          indiquée par l'attribut data-href de la case (chemin fictif,
          à adapter).
        → une icône discrète apparaît après un court délai de survol pour
          indiquer que la case est cliquable.

   Utilisation : appeler SiteApp.initInteriorNav() après le chargement du DOM.
============================================================================= */

window.SiteApp = window.SiteApp || {};

(function () {

  function initInteriorNav() {
    const nav   = document.querySelector('.hero-nav');
    const items = document.querySelectorAll('.hero-nav .nav-item');

    if (!nav || items.length === 0) return; // page sans sous-menu "hero"

    const sectionPanels = document.querySelectorAll('.section-panel');

    /* ── Affiche le panneau de contenu correspondant à "key" ────────────── */
    function showPanel(key) {
      sectionPanels.forEach(el => {
        el.classList.toggle('active', el.dataset.panel === key);
      });
    }

    /* ── Active visuellement un item du sous-menu ───────────────────────── */
    function activate(item) {
      nav.classList.add('has-hover');
      items.forEach(el => el.classList.remove('hovered'));
      item.classList.add('hovered');
    }

    /* ── Revient à l'état neutre du sous-menu ────────────────────────────── */
    function deactivate() {
      nav.classList.remove('has-hover');
      items.forEach(el => el.classList.remove('hovered'));
    }

    items.forEach(item => {
      item.addEventListener('mouseenter', () => activate(item));
      item.addEventListener('mouseleave', deactivate);
      item.addEventListener('focus',      () => activate(item));
      item.addEventListener('blur',       deactivate);

      /*
       * Clic sur un item : on affiche le panneau de contenu correspondant
       * au lieu de naviguer vers une autre page.
       */
      item.addEventListener('click', (e) => {
        e.preventDefault();
        showPanel(item.dataset.target);
      });
    });
  }

  /* ───────────────────────────────────────────────────────────────────────
     "Toiles" des ".project-item" : survol → aperçu à droite, clic → page
     ───────────────────────────────────────────────────────────────────────
     Chaque .section-panel peut contenir une .project-list (cases
     .project-item, chacune avec un attribut data-canvas="..." et
     data-href="...") et une .project-canvas-area (plusieurs
     .project-canvas[data-canvas="..."], une seule visible à la fois).

     Le traitement est fait panneau par panneau, pour que chaque section
     (ex : "portraits" / "histoire" sur la page éponyme) ait son propre jeu
     de toiles indépendant.
  ─────────────────────────────────────────────────────────────────────── */
  function initProjectCanvases() {
    document.querySelectorAll('.section-panel').forEach(panel => {
      const items    = panel.querySelectorAll('.project-item');
      const canvases = panel.querySelectorAll('.project-canvas');

      if (items.length === 0 || canvases.length === 0) return;

      /* ── Affiche la toile correspondant à "key" ─────────────────────── */
      function showCanvas(key) {
        canvases.forEach(c => {
          c.classList.toggle('active', c.dataset.canvas === key);
        });
      }

      /* ── Masque toutes les toiles (quand la souris quitte le panneau) ── */
      function hideCanvases() {
        canvases.forEach(c => c.classList.remove('active'));
      }

      /* La toile disparaît dès que la souris n'est plus sur le panneau,
         qu'elle survole une case (.project-item) ou la toile elle-même. */
      panel.addEventListener('mouseleave', hideCanvases);

      items.forEach(item => {
        const key  = item.dataset.canvas;
        const href = item.dataset.href;

        /* Survol / focus clavier → bascule la toile affichée à droite */
        item.addEventListener('mouseenter', () => showCanvas(key));
        item.addEventListener('focus',       () => showCanvas(key));

        /* Clic → navigation vers la page (chemin fictif data-href) */
        if (href) {
          item.addEventListener('click', () => {
            window.location.href = href;
          });

          /* Accessibilité clavier : Entrée ou Espace = clic */
          item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              window.location.href = href;
            }
          });
        }
      });
    });
  }

  window.SiteApp.initInteriorNav      = initInteriorNav;
  window.SiteApp.initProjectCanvases  = initProjectCanvases;

})();
