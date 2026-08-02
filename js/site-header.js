// greenbeans — site-header.js
// -----------------------------------------------------------------------
// Composant réutilisable <site-header> : injecte le hero, le menu, le
// submenu et le subsubmenu, avec leur comportement (clic, positionnement).
//
// Usage minimal dans une page :
//
//   <head>
//     ...
//     <link rel="stylesheet" href="css/style.css">
//     <script src="js/site-header.js" defer></script>
//   </head>
//   <body>
//     <site-header section="history" submenu="portraits"></site-header>
//     <main>...</main>
//   </body>
//
// Attributs :
//   section  (obligatoire) clé de la partie active :
//            home | notions | history | projects | about
//   submenu  (optionnel) clé de l'item de submenu à afficher comme actif
//            (blanc). Le subsubmenu, lui, reste toujours fermé par défaut :
//            il ne s'ouvre qu'au clic (cf. règle validée précédemment).
//
// Toute la structure du site (libellés, items de submenu/subsubmenu, et
// les href des pages déjà construites) est centralisée ci-dessous : c'est
// le seul endroit à modifier pour ajouter/renommer un item de menu, ou
// pour brancher le lien d'une page une fois qu'elle existe.
//
// NAVIGATION — règle appliquée :
//   - Un item de submenu SANS subsubmenu (ex. "Portraits") est un lien
//     direct : son `href` (s'il est renseigné) est suivi normalement par
//     le navigateur.
//   - Un item de submenu AVEC subsubmenu (ex. "Informatique") n'est jamais
//     un lien : le clic ouvre/ferme la liste déroulante, il ne navigue pas.
//   - Un item de subsubmenu (ex. "Réseaux") est toujours un lien direct :
//     son `href` (s'il est renseigné) est suivi normalement. Tant qu'une
//     page n'existe pas encore, on laisse `href` absent (donc "#").
// -----------------------------------------------------------------------

(function () {
  const SITE_STRUCTURE = {
    home: {
      label: 'Accueil',
      href: 'home.html',
      heroTitle: 'home',
      bodyClass: 'page-home',
      submenu: [],
    },
    notions: {
      label: 'Notions',
      href: 'notions.html',
      heroTitle: 'notions',
      bodyClass: 'page-notions',
      submenu: [
        {
          key: 'computerScience',
          label: 'Informatique',
          disabled: true,
          subsubmenu: [
            { key: 'networks', label: 'Réseaux', href: 'notions-informatique-reseaux.html' },
            { key: 'computerArchitecture', label: "Architecture de l'ordinateur", href: 'notions-informatique-architecture_ordinateur.html' },
            { key: 'cybersecurityBestPractices', label: 'Cybersécurité', href: 'notions-informatique-cybersecurite.html' },
          ],
        },
        {
          key: 'mathematics',
          label: 'Mathématiques',
          disabled: true,
          subsubmenu: [],
          href: 'notions-mathematiques.html',
        },
        {
          key: 'resources',
          label: 'Ressources',
          subsubmenu: [
            { key: 'physicalResources', label: 'Ressources physiques', href: 'notions-ressources-physiques.html' },
            { key: 'digitalResources', label: 'Ressources numériques', href: 'notions-ressources-numeriques.html' },
            { key: 'techWatch', label: 'Veille technologique', href: 'notions-ressources-veille-technologique.html' },
          ],
        },
      ],
    },
    history: {
      label: 'Histoire',
      href: 'history.html',
      heroTitle: 'history',
      bodyClass: 'page-histoire',
      submenu: [
        { key: 'portraits', label: 'Portraits', disabled: true, subsubmenu: [], href: 'histoire-portraits.html' },
        {
          key: 'computingHistory',
          label: "Histoire de l'informatique",
          disabled: true,
          subsubmenu: [
            { key: 'fromCalculatingMachinesToComputers', label: 'Des machines à calculer aux ordinateurs' },
            { key: 'riseOfNetworksAndInternet', label: "L'essor des réseaux et d'Internet" },
            { key: 'riseOfOpenSourceSoftware', label: "L'émergence du logiciel libre" },
          ],
        },
        { key: 'cyberattacks', label: 'Cyberattaques', disabled: true, subsubmenu: [], href: 'histoire-cyberattaques.html' },
      ],
    },
    projects: {
      label: 'Projets',
      href: 'projects.html',
      heroTitle: 'projects',
      bodyClass: 'page-projets',
      submenu: [
        {
          key: 'professional',
          label: 'Professionnels',
          subsubmenu: [
            { key: 'cnedWorkshops', label: 'Ateliers du CNED', href: 'pro-ateliers-cned.html' },
          ],
        },
        {
          key: 'personal',
          label: 'Personnels',
          disabled: true,
          subsubmenu: [
            { key: 'laboratories', label: 'Laboratoires' },
            { key: 'miscellaneous', label: 'Divers', href: 'projets-personnels.html' },
          ],
        },
      ],
    },
    about: {
      label: 'A propos',
      href: 'about.html',
      heroTitle: 'about',
      bodyClass: 'page-about',
      submenu: [
        {
          key: 'siteInformation',
          label: 'Informations du site',
          subsubmenu: [
            { key: 'legalNotice', label: 'Mentions légales', href: 'mentions-legales.html' },
            { key: 'credits', label: 'Crédits' },
            { key: 'graphicCharter', label: 'Charte graphique', href: 'charte-graphique.html' },
          ],
        },
        { key: 'personalInformation', label: 'Informations personnelles', subsubmenu: [], href: 'about-perso.html' },
      ],
    },
  };

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      const sectionKey = this.getAttribute('section');
      const activeSubmenuKey = this.getAttribute('submenu');
      const section = SITE_STRUCTURE[sectionKey];

      if (!section) {
        console.error(`<site-header> : section inconnue "${sectionKey}".`);
        return;
      }

      document.body.classList.add(section.bodyClass);

      const menuHtml = Object.entries(SITE_STRUCTURE)
        .map(([key, s]) => {
          const active = key === sectionKey ? ' class="isActive"' : '';
          return `<li${active}><a href="${s.href}">${s.label}</a></li>`;
        })
        .join('');

      let submenuBlock = '';
      if (section.submenu.length > 0) {
        const submenuHtml = section.submenu
          .map((item) => {
            const classes = [];
            if (item.key === activeSubmenuKey) classes.push('isActive');
            if (item.disabled) classes.push('isDisabled');
            const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';

            const hasSubsubmenu = item.subsubmenu.length > 0;
            // Un item désactivé n'est jamais un lien réel, qu'il ait ou non
            // un subsubmenu : href neutralisé, subsubmenu vidé (ceinture et
            // bretelles avec l'interception au clic ci-dessous).
            const href = item.disabled ? '#' : (hasSubsubmenu ? '#' : (item.href || '#'));
            const subsubmenuAttr = item.disabled
              ? '[]'
              : JSON.stringify(item.subsubmenu).replace(/"/g, '&quot;');
            // Un item désactivé porte une infobulle native ("title") posée
            // par le navigateur au survol, et est retiré de la navigation
            // clavier (tabindex="-1") en plus d'être marqué non-actionnable
            // pour les technologies d'assistance (aria-disabled).
            const disabledAttrs = item.disabled
              ? ' aria-disabled="true" tabindex="-1" title="En cours de rédaction"'
              : '';

            return `<li${classAttr}><a href="${href}" data-subsubmenu="${subsubmenuAttr}"${disabledAttrs}>${item.label}</a></li>`;
          })
          .join('');

        submenuBlock = `
          <div class="submenuStack">
            <nav><ul id="submenu">${submenuHtml}</ul></nav>
            <nav><ul id="subsubmenu"></ul></nav>
          </div>`;
      }

      this.innerHTML = `
        <header id="hero">
          <p class="heroTitle">
            <span id="title1">greenbeans</span><span class="heroSeparator">&bull;</span><span id="title2">${section.heroTitle}</span>
          </p>
        </header>
        <nav><ul id="menu">${menuHtml}</ul></nav>
        ${submenuBlock}`;

      this._wireSubmenuBehavior();
    }

    // Comportement du submenu/subsubmenu : masqué par défaut, n'apparaît
    // qu'au clic, positionné (position: absolute) sous l'item cliqué,
    // sans pousser le contenu de la page.
    _wireSubmenuBehavior() {
      const submenuLinks = this.querySelectorAll('#submenu a');
      const subsubmenu = this.querySelector('#subsubmenu');
      if (!subsubmenu || submenuLinks.length === 0) return;

      const closeSubsubmenu = () => {
        subsubmenu.classList.remove('isOpen');
        subsubmenu.innerHTML = '';
        subsubmenu.style.left = '0px';
        subsubmenu.style.width = '';
      };

      submenuLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
          // Item désactivé ("En cours de rédaction") : on bloque tout,
          // avant même de regarder s'il y a un subsubmenu à ouvrir.
          if (link.getAttribute('aria-disabled') === 'true') {
            event.preventDefault();
            return;
          }

          const parentLi = link.closest('li');

          let items = [];
          try {
            items = JSON.parse(link.dataset.subsubmenu || '[]');
          } catch {
            // Attribut absent ou mal formé (ne devrait pas arriver, la
            // valeur étant générée par connectedCallback ci-dessus) :
            // on retombe simplement sur "pas de subsubmenu".
            items = [];
          }

          if (items.length === 0) {
            // Pas de subsubmenu : lien direct vers une page (ou "#" si
            // elle n'existe pas encore). On laisse le navigateur suivre
            // le href normalement, donc pas de preventDefault ici.
            return;
          }

          event.preventDefault();

          const wasActiveAndOpen =
            parentLi.classList.contains('isActive') && subsubmenu.classList.contains('isOpen');

          submenuLinks.forEach((l) => l.closest('li').classList.remove('isActive'));
          parentLi.classList.add('isActive');

          if (wasActiveAndOpen) {
            closeSubsubmenu();
            return;
          }

          subsubmenu.innerHTML = items
            .map((item) => `<li><a href="${item.href || '#'}">${item.label}</a></li>`)
            .join('');

          subsubmenu.classList.add('isOpen');
          this._positionSubsubmenu(parentLi);
        });
      });
    }

    // Le subsubmenu prend exactement la largeur et la position de l'onglet
    // du submenu qui l'a ouvert : un prolongement direct de cet onglet.
    _positionSubsubmenu(parentLi) {
      const subsubmenu = this.querySelector('#subsubmenu');
      subsubmenu.style.left = `${parentLi.offsetLeft}px`;
      subsubmenu.style.width = `${parentLi.offsetWidth}px`;
    }
  }

  customElements.define('site-header', SiteHeader);
})();
