// greenbeans — site-settings.js
// -----------------------------------------------------------------------
// Composant réutilisable <site-settings> : une icône "trois curseurs de
// réglage" (glyphe habituel des paramètres, à ne pas confondre avec une
// roue dentée), "sticky" (fixe à l'écran, reste visible au scroll), qui
// ouvre un volet latéral avec les réglages du site : mode sombre,
// police pour dyslexie, langue.
//
// ÉTAT ACTUEL :
// - Mode sombre : RÉELLEMENT BRANCHÉ. Bascule l'attribut data-theme="dark"
//   sur <html> (toutes les couleurs du site en dépendent, voir
//   charte-graphique.css et style.css), et retient le choix pour les
//   prochaines pages via localStorage.
// - Police pour dyslexie : RÉELLEMENT BRANCHÉE. Bascule l'attribut
//   data-font="dyslexic" sur <html> (voir charte-graphique.css pour les
//   @font-face OpenDyslexic), et retient le choix de la même façon.
// - Langue : toujours de la préparation de terrain uniquement — le contrôle
//   réagit visuellement mais rien n'est traduit. Ce sera fait à l'étape 5.
//
// Usage minimal dans une page :
//
//   <head>
//     ...
//     <script src="js/site-settings.js" defer></script>
//   </head>
//   <body>
//     <site-header section="..."></site-header>
//     <main>...</main>
//     <site-settings></site-settings>
//   </body>
//
// Ce composant ne prend aucun attribut : il est strictement identique sur
// toutes les pages (d'où le fait de le définir une seule fois ici).
// -----------------------------------------------------------------------

(function () {
  const THEME_STORAGE_KEY = 'greenbeans-theme';
  const FONT_STORAGE_KEY = 'greenbeans-font';

  // Icône "trois curseurs de réglage" dessinée à la main en SVG (trois
  // lignes horizontales, chacune portant un curseur/point à une position
  // différente) : aucune police d'icônes ni image externe, donc aucun
  // souci de crédit/attribution.
  const SETTINGS_SVG = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <circle cx="15" cy="6" r="2.2" fill="currentColor" stroke="none"></circle>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <circle cx="9" cy="12" r="2.2" fill="currentColor" stroke="none"></circle>
      <line x1="3" y1="18" x2="21" y2="18"></line>
      <circle cx="13" cy="18" r="2.2" fill="currentColor" stroke="none"></circle>
    </svg>`;

  class SiteSettings extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <button
          id="settingsToggle"
          type="button"
          aria-label="Ouvrir les réglages du site"
          aria-expanded="false"
          aria-controls="settingsPanel"
        >${SETTINGS_SVG}</button>

        <div id="settingsOverlay" hidden></div>

        <aside id="settingsPanel" aria-hidden="true" aria-label="Réglages du site">
          <div class="settingsPanelHeader">
            <p class="settingsPanelTitle">Réglages</p>
            <button id="settingsClose" type="button" aria-label="Fermer les réglages">&times;</button>
          </div>

          <div class="settingsGroup">
            <span class="settingsLabel">Langue</span>
            <div class="settingsLangGroup" role="group" aria-label="Choix de la langue">
              <button type="button" class="settingsLangBtn isActive" data-lang="fr" aria-pressed="true">FR</button>
              <!-- Changement de langue désactivé : boutons EN/DE conservés en commentaire, pas supprimés.
              <button type="button" class="settingsLangBtn" data-lang="en" aria-pressed="false">EN</button>
              <button type="button" class="settingsLangBtn" data-lang="de" aria-pressed="false">DE</button>
              -->
            </div>
          </div>

          <div class="settingsGroup">
            <label class="settingsSwitchRow" for="darkModeToggle">
              <span class="settingsLabel">Mode sombre</span>
              <span class="settingsSwitch">
                <input type="checkbox" id="darkModeToggle" ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : ''}>
                <span class="settingsSwitchTrack"></span>
              </span>
            </label>
          </div>

          <div class="settingsGroup">
            <label class="settingsSwitchRow" for="dyslexiaToggle">
              <span class="settingsLabel">Police pour dyslexie</span>
              <span class="settingsSwitch">
                <input type="checkbox" id="dyslexiaToggle" ${document.documentElement.getAttribute('data-font') === 'dyslexic' ? 'checked' : ''}>
                <span class="settingsSwitchTrack"></span>
              </span>
            </label>
          </div>
        </aside>`;

      this._wireBehavior();
    }

    _wireBehavior() {
      const toggleBtn = this.querySelector('#settingsToggle');
      const closeBtn = this.querySelector('#settingsClose');
      const overlay = this.querySelector('#settingsOverlay');
      const panel = this.querySelector('#settingsPanel');
      const langButtons = this.querySelectorAll('.settingsLangBtn');

      const openPanel = () => {
        panel.classList.add('isOpen');
        overlay.hidden = false;
        toggleBtn.setAttribute('aria-expanded', 'true');
        panel.setAttribute('aria-hidden', 'false');
      };

      const closePanel = () => {
        panel.classList.remove('isOpen');
        overlay.hidden = true;
        toggleBtn.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
      };

      toggleBtn.addEventListener('click', () => {
        const isOpen = panel.classList.contains('isOpen');
        if (isOpen) {
          closePanel();
        } else {
          openPanel();
        }
      });

      closeBtn.addEventListener('click', closePanel);
      overlay.addEventListener('click', closePanel);

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && panel.classList.contains('isOpen')) {
          closePanel();
        }
      });

      // Choix de langue : pour l'instant, ne fait que refléter la sélection
      // visuellement (aucune traduction réelle n'est appliquée).
      langButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          langButtons.forEach((b) => {
            b.classList.remove('isActive');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('isActive');
          btn.setAttribute('aria-pressed', 'true');
        });
      });

      // Mode sombre : réellement branché. On bascule l'attribut data-theme
      // sur <html> (dont dépendent toutes les couleurs du site), et on
      // retient le choix pour qu'il s'applique aussi sur les autres pages.
      // Le try/catch évite qu'un navigateur qui bloquerait le stockage
      // (ex. fichiers ouverts en local sans serveur, sur certains
      // navigateurs) ne casse le reste du bouton.
      const darkModeToggle = this.querySelector('#darkModeToggle');
      darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
          document.documentElement.setAttribute('data-theme', 'dark');
          try { localStorage.setItem(THEME_STORAGE_KEY, 'dark'); } catch (e) {}
        } else {
          document.documentElement.removeAttribute('data-theme');
          try { localStorage.setItem(THEME_STORAGE_KEY, 'light'); } catch (e) {}
        }
      });

      // Police pour dyslexie : réellement branchée, même mécanisme que le
      // mode sombre (attribut sur <html> + persistance).
      const dyslexiaToggle = this.querySelector('#dyslexiaToggle');
      dyslexiaToggle.addEventListener('change', () => {
        if (dyslexiaToggle.checked) {
          document.documentElement.setAttribute('data-font', 'dyslexic');
          try { localStorage.setItem(FONT_STORAGE_KEY, 'dyslexic'); } catch (e) {}
        } else {
          document.documentElement.removeAttribute('data-font');
          try { localStorage.setItem(FONT_STORAGE_KEY, 'default'); } catch (e) {}
        }
      });
    }
  }

  customElements.define('site-settings', SiteSettings);
})();
