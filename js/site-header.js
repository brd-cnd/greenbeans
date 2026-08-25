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
          subsubmenu: [],
          href: 'notions-computerscience.html',
        },
        {
          key: 'mathematics',
          label: 'Mathématiques',
          subsubmenu: [],
          href: 'notions-mathematiques.html',
        },
        {
          key: 'resources',
          label: 'Ressources',
          subsubmenu: [],
          href: 'notions-resources.html',
        },
      ],
    },
    history: {
      label: 'Histoire',
      href: 'history.html',
      heroTitle: 'history',
      bodyClass: 'page-histoire',
      submenu: [
        { key: 'portraits', label: 'Portraits', subsubmenu: [], href: 'histoire-portraits.html' },
        {
          key: 'computingHistory',
          label: "Histoire de l'informatique",
          subsubmenu: [
            { key: 'fromCalculatingMachinesToComputers', label: 'Des machines à calculer aux ordinateurs' },
            { key: 'riseOfNetworksAndInternet', label: "L'essor des réseaux et d'Internet" },
            { key: 'riseOfOpenSourceSoftware', label: "L'émergence du logiciel libre" },
          ],
        },
        { key: 'cyberattacks', label: 'Cyberattaques', subsubmenu: [], href: 'histoire-cyberattaques.html' },
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
          subsubmenu: [],
          href: 'projects-professional.html',
        },
        {
          key: 'personal',
          label: 'Personnels',
          subsubmenu: [],
          href: 'projects-personal.html',
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

      // Rendu construit élément par élément (createElement + textContent),
      // jamais par concaténation de chaînes HTML : même si un libellé de
      // SITE_STRUCTURE contenait un jour un caractère spécial (", <...),
      // il serait toujours traité comme du texte brut, jamais interprété
      // comme du HTML. Défense en profondeur : SITE_STRUCTURE n'est
      // aujourd'hui modifiable que par vous, mais ce n'est jamais plus
      // coûteux de s'en prémunir.
      this.innerHTML = '';

      const hero = document.createElement('header');
      hero.id = 'hero';
      const heroTitle = document.createElement('p');
      heroTitle.className = 'heroTitle';
      const title1 = document.createElement('span');
      title1.id = 'title1';
      title1.textContent = 'greenbeans';
      const separator = document.createElement('span');
      separator.className = 'heroSeparator';
      separator.textContent = '\u2022';
      const title2 = document.createElement('span');
      title2.id = 'title2';
      title2.textContent = section.heroTitle;
      heroTitle.append(title1, separator, title2);
      hero.appendChild(heroTitle);
      this.appendChild(hero);

      const menuNav = document.createElement('nav');
      const menuList = document.createElement('ul');
      menuList.id = 'menu';
      Object.entries(SITE_STRUCTURE).forEach(([key, s]) => {
        const li = document.createElement('li');
        if (key === sectionKey) li.className = 'isActive';
        const a = document.createElement('a');
        a.href = s.href;
        a.textContent = s.label;
        li.appendChild(a);
        menuList.appendChild(li);
      });
      menuNav.appendChild(menuList);
      this.appendChild(menuNav);

      if (section.submenu.length > 0) {
        const stack = document.createElement('div');
        stack.className = 'submenuStack';

        const submenuNav = document.createElement('nav');
        const submenuList = document.createElement('ul');
        submenuList.id = 'submenu';

        section.submenu.forEach((item) => {
          const li = document.createElement('li');
          const classes = [];
          if (item.key === activeSubmenuKey) classes.push('isActive');
          if (item.disabled) classes.push('isDisabled');
          if (classes.length) li.className = classes.join(' ');

          const a = document.createElement('a');
          const hasSubsubmenu = item.subsubmenu.length > 0;
          // Un item désactivé n'est jamais un lien réel, qu'il ait ou non
          // un subsubmenu : href neutralisé, subsubmenu vidé (ceinture et
          // bretelles avec l'interception au clic ci-dessous).
          a.href = item.disabled ? '#' : hasSubsubmenu ? '#' : item.href || '#';
          a.textContent = item.label;

          // Les items du subsubmenu sont gardés comme propriété JS sur le
          // lien lui-même, pas sérialisés dans un attribut HTML : plus
          // simple, et ça évite tout aller-retour JSON <-> HTML.
          a._subsubmenuItems = item.disabled ? [] : item.subsubmenu;

          // Un item désactivé porte une infobulle native ("title") posée
          // par le navigateur au survol, et est retiré de la navigation
          // clavier (tabindex="-1") en plus d'être marqué non-actionnable
          // pour les technologies d'assistance (aria-disabled).
          if (item.disabled) {
            a.setAttribute('aria-disabled', 'true');
            a.setAttribute('tabindex', '-1');
            a.setAttribute('title', 'En cours de rédaction');
          }

          li.appendChild(a);
          submenuList.appendChild(li);
        });

        submenuNav.appendChild(submenuList);

        const subsubmenuNav = document.createElement('nav');
        const subsubmenuList = document.createElement('ul');
        subsubmenuList.id = 'subsubmenu';
        subsubmenuNav.appendChild(subsubmenuList);

        stack.append(submenuNav, subsubmenuNav);
        this.appendChild(stack);
      }

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
          const items = link._subsubmenuItems || [];

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

          subsubmenu.innerHTML = '';
          items.forEach((item) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.href || '#';
            a.textContent = item.label;
            li.appendChild(a);
            subsubmenu.appendChild(li);
          });

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
