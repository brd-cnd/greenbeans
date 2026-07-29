// greenbeans — site-disclaimer.js
// -----------------------------------------------------------------------
// Message d'information affiché une seule fois, à la toute première visite
// du site — quelle que soit la page sur laquelle on atterrit. Persistant
// via localStorage (même mécanisme que le thème/la police, cf.
// site-settings.js) : une fois fermé, ne réapparaît plus tant que le
// stockage local du navigateur n'est pas vidé.
//
// Reste impossible à fermer pendant 5 secondes (bouton désactivé, avec un
// compte à rebours), pour laisser le temps de lire le message.
//
// Ce script se charge sur TOUTES les pages, juste après site-settings.js.
// Il n'a besoin d'aucune balise dans le <body> : il s'injecte lui-même,
// contrairement à <site-header>/<site-settings> qui sont des composants à
// poser explicitement.
//
//   <script src="js/site-disclaimer.js" defer></script>
//
// Pour modifier le texte du message : tout se trouve dans le template ci-
// dessous (DISCLAIMER_HTML). Pour changer la durée du verrou : LOCK_SECONDS.
// -----------------------------------------------------------------------

(function () {
  const STORAGE_KEY = 'greenbeans-disclaimer-seen';
  const LOCK_SECONDS = 5;

  let alreadySeen = false;
  try {
    alreadySeen = localStorage.getItem(STORAGE_KEY) === '1';
  } catch (e) {
    // Stockage indisponible (navigation privée très restrictive, etc.) :
    // on affiche quand même le message plutôt que de risquer de ne
    // jamais l'afficher.
  }

  if (alreadySeen) return;

  const DISCLAIMER_HTML = `
    <div class="disclaimerBody">
      <p class="eyebrow">Note</p>
      <h3>Avant de continuer</h3>
      <p>De nombreuses parties de ce site ne sont pas encore disponibles.</p>
      <p>La partie la plus aboutie se trouve dans Projets &gt; Projets professionnels &gt; Ateliers du CNED.</p>
      <p>Les articles seront rédigés une fois une alternance trouvée ; je me concentre actuellement sur mes candidatures.</p>
      <p>Les mentions légales sont disponibles dans À propos &gt; Informations du site &gt; Mentions légales.</p>
      <p>Ce site n'utilise pas de cookies.</p>
    </div>
    <button id="disclaimerClose" type="button" disabled>Fermer (${LOCK_SECONDS})</button>
  `;

  function mount() {
    const overlay = document.createElement('div');
    overlay.id = 'disclaimerOverlay';

    const panel = document.createElement('aside');
    panel.id = 'disclaimerPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', "Message d'information");
    panel.innerHTML = DISCLAIMER_HTML;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('#disclaimerClose');

    // Compte à rebours : le bouton reste désactivé pendant LOCK_SECONDS,
    // avec le nombre de secondes restantes affiché dessus.
    let remaining = LOCK_SECONDS;
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        closeBtn.textContent = 'Fermer';
        closeBtn.disabled = false;
      } else {
        closeBtn.textContent = `Fermer (${remaining})`;
      }
    }, 1000);

    function close() {
      if (closeBtn.disabled) return;
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch (e) {}
      clearInterval(timer);
      overlay.remove();
      panel.remove();
      document.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
