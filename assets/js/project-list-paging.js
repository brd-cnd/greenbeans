/* =============================================================================
   PROJECT-LIST-PAGING.JS — Pagination par groupes de 3 des ".project-list"
   =============================================================================

   Ce comportement est commun à TOUTES les ".project-list" de TOUTES les
   pages "intérieures" (projects.html, concepts.html, history.html,
   about.html), dans CHAQUE section (Réseaux, Architecture, Cybersécurité,
   Mathématiques, Ressources, Portraits, Histoire, Laboratoires, Pro,
   Perso, Contact, Crédits, Mentions…).

   Principe
   ─────────
   Tant qu'une .project-list contient 3 .item ou moins, rien ne
   change : elle reste affichée comme avant (pas de défilement).

   Dès qu'une .project-list contient PLUS de 3 .item, ce script :
     1. fixe la hauteur de la liste à la hauteur EXACTE du groupe de 3
        cases actuellement affiché (et la réajuste à chaque arrêt de
        défilement, puisque tous les groupes n'ont pas forcément
        exactement la même hauteur) — pour ne jamais laisser entrevoir
        le début du groupe suivant,
     2. la rend défilante verticalement (classe CSS .project-list--paged,
        voir assets/css/interior.css pour le détail du style),
     3. marque le début de chaque groupe de 3 (classe
        .item--snap-start) comme point d'ancrage de défilement,
     4. intercepte la molette de la souris / le trackpad pour faire
        avancer ou reculer le défilement d'un groupe ENTIER de 3 cases à
        chaque "cran" — jamais case par case, jamais à moitié.

   S'il reste, par exemple, 1 ou 2 cases après le dernier groupe complet
   de 3 (4 cases au total, 7, 8…), ce reliquat forme son propre groupe et
   apparaît seul lors du dernier "cran" de défilement — exactement comme
   les 3 premières cases, mais avec moins de cases dedans.

   Ce script ne modifie NI ne remplace les comportements déjà gérés par
   assets/js/interior-nav.js (survol/focus → toile à droite, clic → vers
   la page liée, icône de lien) : il se contente d'ajouter un mécanisme de
   défilement par-dessus la liste, sans toucher au survol, au clic ni à la
   structure des cases.

   Aucune intervention manuelle n'est nécessaire lorsque vous ajoutez ou
   retirez des .item dans le HTML : tout est recalculé tout seul,
   y compris lors d'un changement de langue (FR/DE/EN), de l'activation
   du mode sombre, de la police adaptée aux personnes dyslexiques, ou
   d'un redimensionnement de la fenêtre — voir le mécanisme de
   recalcul automatique ci-dessous (ResizeObserver).

   Utilisation : appeler SiteApp.initProjectListPaging() après le
   chargement du DOM (en même temps que les autres SiteApp.init*()).
============================================================================= */

window.SiteApp = window.SiteApp || {};

(function () {

  /*
    Nombre de cases par "page". Valeur par défaut : 3 (voir la demande
    d'origine). Peut être surchargée au cas par cas en ajoutant
    data-page-size="..." directement sur une .project-list dans le HTML,
    si un jour une section doit afficher un nombre différent de cases par
    page — aucune section actuelle n'en a besoin.
  */
  const DEFAULT_PAGE_SIZE = 3;

  /* ── Préférence "mouvement réduit" ──────────────────────────────────────
     Lue dynamiquement à chaque défilement (et non une seule fois au
     chargement) : certains systèmes permettent de l'activer/désactiver
     sans recharger la page.
  ── */
  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function pageSizeOf(list) {
    const raw = parseInt(list.dataset.pageSize, 10);
    return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_PAGE_SIZE;
  }

  function itemsOf(list) {
    return Array.from(list.children).filter(el =>
      el.classList.contains('item')
    );
  }

  /* ── Recalcule la pagination d'une .project-list ──────────────────────── */
  function recompute(list) {
    const items = itemsOf(list);
    const pageSize = pageSizeOf(list);

    if (items.length === 0) return;

    /* 3 cases ou moins : aucune pagination, liste identique à l'origine. */
    if (items.length <= pageSize) {
      list.classList.remove('project-list--paged');
      list.style.height = '';
      items.forEach(item => item.classList.remove('item--snap-start'));
      return;
    }

    /*
      Si la liste appartient à un panneau actuellement masqué
      (.section-panel sans la classe .active → display: none), ses
      dimensions mesurées seraient nulles : on annule ce calcul, il sera
      refait automatiquement par le ResizeObserver dès que le panneau
      redeviendra visible (ses .item passeront alors d'une taille
      de 0 à leur taille réelle, ce qui déclenche une nouvelle mesure).
    */
    const listRect = list.getBoundingClientRect();
    if (listRect.width === 0 && listRect.height === 0) return;

    /* Marque le début de chaque groupe de "pageSize" cases. */
    items.forEach((item, index) => {
      item.classList.toggle(
        'item--snap-start',
        index % pageSize === 0
      );
    });

    list.classList.add('project-list--paged');
    applyCurrentGroupHeight(list, items, pageSize);
  }

  /*
    ── Hauteur affichée = hauteur du groupe ACTUELLEMENT visible ─────────
    ───────────────────────────────────────────────────────────────────
    Les groupes n'ont pas forcément tous exactement la même hauteur (un
    titre ou un texte un peu plus long dans l'un d'eux suffit à le rendre
    légèrement plus haut qu'un autre). Fixer la hauteur de la liste à la
    hauteur du PLUS GRAND groupe — ce que faisait une version précédente
    de ce script — garantit qu'aucun groupe n'est jamais rogné, mais a un
    inconvénient : pour un groupe plus court que le plus grand, l'espace
    laissé libre en bas laisse alors entrevoir le début du groupe suivant
    (quelques pixels de la case d'après, visibles avant même de faire
    défiler) — exactement le "dépassement" qu'on veut éviter.

    On calcule donc ici la hauteur de CHAQUE groupe, on détermine lequel
    est actuellement en haut de la zone visible (via sa position par
    rapport à list.scrollTop), et on n'applique QUE la hauteur de ce
    groupe précis. Résultat : toujours exactement "pageSize" cases
    visibles, jamais plus, quel que soit le groupe affiché — et cette
    hauteur se met à jour à chaque arrêt de défilement (cf.
    attachWheelPaging ci-dessous), pour rester juste après chaque
    nouveau groupe atteint.
  ── */
  function applyCurrentGroupHeight(list, items, pageSize) {
    const groupHeights = [];
    const groupStarts = [];

    for (let i = 0; i < items.length; i += pageSize) {
      const group = items.slice(i, i + pageSize);
      const top = group[0].getBoundingClientRect().top;
      const bottom = group[group.length - 1].getBoundingClientRect().bottom;
      groupHeights.push(bottom - top);
      groupStarts.push(relativeTop(group[0], list));
    }

    /* Le groupe "courant" est le dernier dont le point de départ est
       déjà atteint ou dépassé par le défilement actuel — fonctionne
       quelle que soit la façon dont on a fait défiler la liste (molette
       gérée ci-dessous, mais aussi glissé tactile, barre de défilement
       à la souris, ou clavier). */
    let currentIndex = 0;
    for (let i = 0; i < groupStarts.length; i++) {
      if (groupStarts[i] <= list.scrollTop + 1) currentIndex = i;
    }

    list.style.height = Math.ceil(groupHeights[currentIndex]) + 'px';
  }

  /* ── Position (dans le contenu défilant) d'un point d'ancrage ──────────
     Indépendante de tout positionnement CSS ("offsetParent"), donc fiable
     quelle que soit la structure des ancêtres.
  ── */
  function relativeTop(item, list) {
    return (
      item.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop
    );
  }

  function snapPositions(list) {
    return Array.from(list.querySelectorAll(':scope > .item--snap-start'))
      .map(item => relativeTop(item, list));
  }

  /* ── Molette de souris / trackpad : avance ou recule d'un groupe entier ─
     ───────────────────────────────────────────────────────────────────
     Un seul "cran" de molette = un seul groupe de "pageSize" cases, que
     l'on soit sur un trackpad (beaucoup de petits évènements "wheel"
     consécutifs) ou une souris classique (un évènement par cran) :
     pendant qu'un défilement est en cours, les évènements suivants sont
     ignorés ("locked") jusqu'à la fin du défilement en cours.
     Aux deux extrémités de la liste (tout en haut / tout en bas), la
     molette n'est pas interceptée : elle reprend son rôle normal
     (défilement de la page), comme pour n'importe quelle zone défilante
     imbriquée.
  ── */
  function attachWheelPaging(list) {
    let locked = false;
    let unlockTimer = null;

    /* Déverrouille la molette ET réajuste la hauteur de la liste sur la
       hauteur exacte du groupe désormais affiché (cf.
       applyCurrentGroupHeight ci-dessus) — quelle que soit la façon
       dont on a fait défiler la liste (molette, glissé tactile, barre
       de défilement, clavier...). */
    function settle() {
      locked = false;
      const items = itemsOf(list);
      const pageSize = pageSizeOf(list);
      if (items.length > pageSize) {
        applyCurrentGroupHeight(list, items, pageSize);
      }
    }

    list.addEventListener('scrollend', settle);

    list.addEventListener(
      'wheel',
      e => {
        if (!list.classList.contains('project-list--paged')) return;

        const positions = snapPositions(list);
        if (positions.length === 0) return;

        const direction = e.deltaY > 0 ? 1 : -1;
        const maxScroll = list.scrollHeight - list.clientHeight;
        const atTop = list.scrollTop <= 1;
        const atBottom = list.scrollTop >= maxScroll - 1;

        /* Aux extrémités : on laisse l'évènement remonter normalement
           (défilement de la page), plutôt que de "piéger" la molette. */
        if ((direction > 0 && atBottom) || (direction < 0 && atTop)) return;

        e.preventDefault();
        if (locked) return;

        let targetIndex;
        if (direction > 0) {
          targetIndex = positions.findIndex(p => p > list.scrollTop + 1);
          if (targetIndex === -1) targetIndex = positions.length - 1;
        } else {
          targetIndex = 0;
          for (let i = positions.length - 1; i >= 0; i--) {
            if (positions[i] < list.scrollTop - 1) {
              targetIndex = i;
              break;
            }
          }
        }

        list.scrollTo({
          top: positions[targetIndex],
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });

        locked = true;
        clearTimeout(unlockTimer);
        /* Filet de sécurité si l'évènement "scrollend" n'est pas
           disponible (navigateurs plus anciens) : déverrouille de toute
           façon (et réajuste la hauteur) après la durée habituelle d'un
           défilement doux. */
        unlockTimer = setTimeout(settle, prefersReducedMotion() ? 0 : 700);
      },
      { passive: false }
    );
  }

  /* ── Recalcul automatique ───────────────────────────────────────────────
     Un ResizeObserver est posé sur CHAQUE .item (et non sur la
     liste elle-même, dont la hauteur est justement figée par ce script) :
     ainsi, tout changement de hauteur d'une case — traduction plus longue
     dans une autre langue, police adaptée aux personnes dyslexiques,
     redimensionnement de la fenêtre, ou simplement l'apparition du
     panneau (passage de display: none à display: block) — déclenche un
     nouveau calcul, sans avoir à se brancher sur chacun de ces
     évènements individuellement dans les autres scripts du site.
  ── */
  function initProjectListPaging() {
    const lists = document.querySelectorAll('.project-list');
    if (lists.length === 0) return;

    const scheduled = new WeakSet();

    function scheduleRecompute(list) {
      if (scheduled.has(list)) return;
      scheduled.add(list);
      requestAnimationFrame(() => {
        scheduled.delete(list);
        recompute(list);
      });
    }

    const observer = new ResizeObserver(entries => {
      const listsToUpdate = new Set();
      entries.forEach(entry => {
        const list = entry.target.closest('.project-list');
        if (list) listsToUpdate.add(list);
      });
      listsToUpdate.forEach(scheduleRecompute);
    });

    lists.forEach(list => {
      itemsOf(list).forEach(item => observer.observe(item));
      attachWheelPaging(list);
    });

    /* Filet de sécurité supplémentaire : un redimensionnement de fenêtre
       peut, dans de rares cas (ex. barres d'outils du navigateur qui
       apparaissent/disparaissent sans faire varier la hauteur des
       cases elles-mêmes), ne pas déclencher le ResizeObserver ci-dessus. */
    window.addEventListener('resize', () => {
      lists.forEach(scheduleRecompute);
    });
  }

  window.SiteApp.initProjectListPaging = initProjectListPaging;

})();
