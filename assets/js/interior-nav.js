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
     "Toiles" des ".project-item" : aperçu → page
     ───────────────────────────────────────────────────────────────────────
     Chaque .section-panel peut contenir une .project-list (cases
     .project-item, chacune avec un attribut data-canvas="..." et
     data-href="...") et une .project-canvas-area (plusieurs
     .project-canvas[data-canvas="..."], une seule visible à la fois).

     Le comportement diffère selon que l'appareil permet un vrai survol
     (souris) ou non (mobile, tablette tactile) :

       - AVEC survol réel (hover: none → false) : comportement inchangé.
         Survol/focus d'une case → affiche sa toile à droite. Clic →
         navigue directement vers la page (l'utilisateur a déjà vu
         l'aperçu en survolant).

       - SANS survol réel (hover: none → true, donc tactile) : il est
         impossible de "survoler" avant de toucher. On affiche donc la
         toile au PREMIER appui (la case prend la classe .is-revealed,
         voir assets/css/interior.css pour son indice visuel), et on ne
         navigue qu'au SECOND appui sur cette même case déjà révélée.
         Toucher une autre case réinitialise et révèle celle-ci à son
         tour (toujours un premier appui = aperçu).

     window.matchMedia('(hover: none)') reste à jour si l'appareil change
     de profil de pointage en cours de session (ex. tablette branchée à
     une souris) : on écoute son évènement "change" pour effacer les
     éventuels états "révélés", qui ne feraient plus sens.

     Le traitement est fait panneau par panneau, pour que chaque section
     (ex : "portraits" / "histoire" sur la page éponyme) ait son propre jeu
     de toiles indépendant.
  ─────────────────────────────────────────────────────────────────────── */
  function initProjectCanvases() {
    const noHoverMQ = window.matchMedia('(hover: none)');

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

      /* ── Efface l'état "révélé" de toutes les cases du panneau ───────── */
      function clearRevealed() {
        items.forEach(el => el.classList.remove('is-revealed'));
      }

      /* La toile disparaît dès que la souris n'est plus sur le panneau —
         pertinent uniquement sur un appareil à survol réel : sur mobile,
         rien ne doit se refermer simplement parce que le doigt n'est
         plus là, sous peine de fermer la toile sitôt révélée. */
      panel.addEventListener('mouseleave', () => {
        if (!noHoverMQ.matches) hideCanvases();
      });

      items.forEach(item => {
        const key  = item.dataset.canvas;
        const href = item.dataset.href;

        /*
          Petit indice visuel ajouté automatiquement dans chaque case,
          invisible tant que la case n'a pas été touchée une première
          fois (voir .project-tap-hint dans assets/css/interior.css).
          data-i18n permet sa traduction si l'utilisateur change de
          langue après l'avoir révélée (clé commune à toutes les pages,
          voir assets/i18n/common_<lang>.json).
        */
        if (href && !item.querySelector('.project-tap-hint')) {
          const hint = document.createElement('span');
          hint.className = 'project-tap-hint';
          hint.setAttribute('aria-hidden', 'true');
          hint.dataset.i18n = 'hint-tap-again';
          hint.textContent = 'appuyez encore pour ouvrir';
          item.appendChild(hint);
        }

        /* Survol / focus clavier → bascule la toile affichée à droite
           (uniquement pertinent avec un pointeur permettant un vrai
           survol ; sur mobile, voir la gestion du clic ci-dessous). */
        item.addEventListener('mouseenter', () => {
          if (!noHoverMQ.matches) showCanvas(key);
        });
        item.addEventListener('focus', () => {
          if (!noHoverMQ.matches) showCanvas(key);
        });

        item.addEventListener('click', () => {
          if (noHoverMQ.matches) {
            /* ── Tactile : 1er appui = aperçu, 2e appui = page ────────── */
            if (!item.classList.contains('is-revealed')) {
              clearRevealed();
              item.classList.add('is-revealed');
              showCanvas(key);
              return; // on s'arrête là : pas de navigation à ce stade
            }
            if (href) window.location.href = href;
            return;
          }

          /* ── Souris : clic = navigation directe, comme avant ─────────── */
          if (href) window.location.href = href;
        });

        /* Accessibilité clavier : Entrée ou Espace = clic (redéclenche
           exactement la même logique, tactile ou non, via item.click()). */
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
          }
        });
      });
    });

    /* Si l'appareil change de profil de pointage en cours de session
       (ex. tablette rebranchée à une souris), les états "révélés" en
       cours n'auraient plus de sens : on les efface. */
    noHoverMQ.addEventListener('change', () => {
      document.querySelectorAll('.project-item.is-revealed').forEach(el => {
        el.classList.remove('is-revealed');
      });
    });
  }

  window.SiteApp.initInteriorNav      = initInteriorNav;
  window.SiteApp.initProjectCanvases  = initProjectCanvases;

})();
