/* =============================================================================
   INTRO-OVERLAY.JS — Message plein écran à la première visite
   =============================================================================

   Comportement souhaité :
     - À la première arrivée sur le site (quelle que soit la page d'entrée),
       un message plein écran apparaît : fond blanc, bref instant "vide",
       puis apparition du titre, d'un bouton de fermeture (d'abord inactif)
       et d'un paragraphe par langue (FR / EN / DE).
     - Si l'utilisateur change ensuite de page sans avoir quitté le
       navigateur (même onglet ou nouvel onglet de la même session), le
       message ne réapparaît pas.
     - S'il ferme l'onglet/le navigateur puis revient plus tard, le message
       réapparaît (nouvelle "première visite").

   ── Comment la "première visite" est détectée ───────────────────────────
   On utilise sessionStorage, une mémoire clé/valeur fournie par le
   navigateur :
     - Elle est PARTAGÉE par toutes les pages du même site ouvertes dans le
       même onglet (donc utilisable même si l'utilisateur n'arrive pas par
       la page d'accueil : la clé est lue/écrite de la même façon partout).
     - Elle est CONSERVÉE quand on navigue d'une page à l'autre du site
       (contrairement à de simples variables JavaScript, qui seraient
       réinitialisées à chaque chargement de page).
     - Elle est EFFACÉE automatiquement quand l'onglet/la fenêtre est fermé,
       ce qui correspond exactement à "tant qu'on n'a pas quitté le
       navigateur".

   Au chargement de chaque page :
     1. On regarde si la clé "greenbeans-intro-seen" existe dans
        sessionStorage.
     2. Si elle existe → on ne fait rien, le message ne s'affiche pas.
     3. Si elle n'existe pas → on construit et affiche le message, ET on
        écrit immédiatement la clé, afin que les pages suivantes (même
        avant la fermeture du message) sachent qu'il a déjà été montré.

   ── Le contenu (textes FR / EN / DE) ─────────────────────────────────────
   Pour l'instant, ce contenu n'est PAS lié au système de traduction
   (common_<lang>.json, <page>_<lang>.json) : les trois langues sont
   affichées en même temps, quel
   que soit la langue active du site. Modifiez simplement le tableau
   MESSAGES ci-dessous pour changer les textes.

   Chaque entrée de MESSAGES est désormais découpée en "intro", "points"
   (un par puce numérotée) et "outro" : chacun est affiché dans son propre
   <p>, ce qui garantit un saut de ligne entre les points même en l'absence
   de toute feuille de style. Si une feuille de style externe existe pour
   ce site, elle peut cibler les classes .intro-lang-intro, .intro-lang-point
   et .intro-lang-outro pour affiner les espacements ; ce n'est toutefois
   pas requis pour que les sauts de ligne fonctionnent.

   Utilisation : appeler SiteApp.initIntroOverlay() après le chargement du
   DOM, sur TOUTES les pages du site (comme SiteApp.initDrawer()).
============================================================================= */

window.SiteApp = window.SiteApp || {};

(function () {

  const STORAGE_KEY = 'greenbeans-intro-seen';

  /*
    ── Textes affichés (à modifier librement) ─────────────────────────────
    "code"  : affiché dans le style du sélecteur de langue du tiroir (FR/EN/DE).
    "intro" : phrase d'introduction.
    "points": tableau de phrases, une par puce numérotée — chaque entrée est
              affichée sur sa propre ligne (un saut de ligne entre le 1 et
              le 2 est donc garanti, indépendamment de la feuille de style).
    "outro" : phrase de remerciement, sur sa propre ligne également.
  */
  const MESSAGES = [
    {
      code: 'FR',
      intro: "[17.06.2026] – INFORMATIONS : Site récent (date de création : 10.06.2026), qui remplace un ancien portfolio.",
      points: [
        "Traduction en cours",
        "Pour télécharger des documents de l'école (calendrier, contrat) : menu (☰) > À propos > Informations personnelles > Page recrutement"
        "Le contenu affiché est pour l'instant fictif et temporaire, à l'exception des mentions légales : menu (☰) > À propos > Mentions légales."
      ],
      outro: "Merci pour votre patience !",
    },
    {
      code: 'EN',
      intro: "[17.06.2026] – NOTICE: This is a brand-new website (creation date : 10.06.2026), replacing an older portfolio.",
      points: [
        "Translation in progress",
        "Most of the content you see is placeholder text for now, except for the legal notice: menu (☰) > About > Legal notice.",
        "Downloading documents from the engineering school (calendar, contract) : menu (☰) > About > Personal informations > Hiring page"
      ],
      outro: "Thank you for your patience!",
    },
    {
      code: 'DE',
      intro: "[17.06.2026] – HINWEIS: Dies ist eine neue Website (Erstellungsdatum : 10.06.2026), die ein früheres Portfolio ersetzt. Übersetzung läuft. ",
      points: [
        "Übersetzung läuft",
        "Die angezeigten Inhalte sind derzeit größtenteils Platzhalter und vorläufig, mit Ausnahme von dem Impressum: Menü (☰) > Über mich > Impressum.",
        "Unterlagen der Ingenieurs*schule herunterladen: Menü (☰) > Über mich > Persönliche Informationen > Seite Karriere"
      ],
      outro: "Vielen Dank für Ihre Geduld!",
    },
  ];

  /* Titre affiché (police de titre du site) */
  const SITE_TITLE = 'greenbeans';

  /* Texte du bouton de fermeture */
  const CLOSE_LABEL = 'Fermer · Close · Schließen';

  /* ── Délais (en millisecondes) ──────────────────────────────────────── */
  const REVEAL_DELAY = 450;   // durée du "bref instant" d'écran blanc
  const ENABLE_DELAY  = 4000; // délai avant que le bouton devienne actif
  const FADE_DURATION = 500;  // doit correspondre à la transition CSS (opacity)

  /* ── Construction du DOM de la fenêtre ──────────────────────────────── */
  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', SITE_TITLE);
    overlay.tabIndex = -1; // permet de recevoir le focus au clavier dès l'ouverture

    const content = document.createElement('div');
    content.className = 'intro-content';

    const title = document.createElement('h1');
    title.className = 'intro-title';
    title.textContent = SITE_TITLE;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'intro-close';
    closeBtn.disabled = true;
    closeBtn.textContent = CLOSE_LABEL;

    const langs = document.createElement('div');
    langs.className = 'intro-langs';

    MESSAGES.forEach(({ code, intro, points, outro }) => {
      const block = document.createElement('div');
      block.className = 'intro-lang-block';

      const codeEl = document.createElement('span');
      codeEl.className = 'intro-lang-code';
      codeEl.textContent = code;
      block.appendChild(codeEl);

      // Phrase d'introduction : sa propre ligne (élément <p>, donc en
      // bloc par défaut — le saut de ligne ne dépend d'aucune règle CSS).
      const introEl = document.createElement('p');
      introEl.className = 'intro-lang-intro';
      introEl.textContent = intro;
      block.appendChild(introEl);

      // Un <p> par point numéroté : garantit un saut de ligne entre le
      // point 1) et le point 2), même sans aucune feuille de style.
      points.forEach((point) => {
        const pointEl = document.createElement('p');
        pointEl.className = 'intro-lang-point';
        pointEl.textContent = point;
        block.appendChild(pointEl);
      });

      // Phrase de remerciement : également sur sa propre ligne.
      const outroEl = document.createElement('p');
      outroEl.className = 'intro-lang-outro';
      outroEl.textContent = outro;
      block.appendChild(outroEl);

      langs.appendChild(block);
    });

    content.appendChild(title);
    content.appendChild(closeBtn);
    content.appendChild(langs);
    overlay.appendChild(content);

    return { overlay, closeBtn };
  }

  function initIntroOverlay() {

    /*
      Lecture de sessionStorage dans un bloc try/catch : certains
      navigateurs/configurations (mode privé très restrictif, ouverture en
      file://...) peuvent bloquer son accès. Dans ce cas, on affiche tout de
      même le message (par sécurité), mais sans pouvoir mémoriser qu'il a
      déjà été vu.
    */
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (err) {
      alreadySeen = false;
    }

    if (alreadySeen) return;

    // Mémorise immédiatement : si l'utilisateur change de page avant même
    // d'avoir fermé le message, celui-ci ne réapparaîtra pas.
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (err) {
      /* tant pis : le message pourra réapparaître sur la page suivante */
    }

    const { overlay, closeBtn } = buildOverlay();
    document.body.appendChild(overlay);
    document.body.classList.add('intro-open');

    /*
      ── Apparition du contenu ─────────────────────────────────────────
      requestAnimationFrame laisse le temps au navigateur de peindre le
      calque blanc une première fois (overlay sans .is-visible), puis le
      setTimeout fait patienter REVEAL_DELAY ms avant d'ajouter
      .is-visible, qui déclenche les transitions CSS (apparition du
      contenu). C'est ce court délai qui donne l'effet "écran blanc, puis
      texte qui apparaît", sans ressembler à un bug de chargement.
    */
    requestAnimationFrame(() => {
      setTimeout(() => {
        overlay.classList.add('is-visible');
      }, REVEAL_DELAY);
    });

    /* ── Activation du bouton après quelques secondes ─────────────────── */
    const enableTimer = setTimeout(() => {
      closeBtn.disabled = false;
      closeBtn.classList.add('is-enabled');
      closeBtn.focus();
    }, ENABLE_DELAY);

    /* ── Fermeture de la fenêtre ───────────────────────────────────────── */
    function close() {
      if (closeBtn.disabled) return;

      clearTimeout(enableTimer);
      overlay.classList.remove('is-visible');
      document.body.classList.remove('intro-open');

      // Retire la fenêtre du DOM une fois le fondu terminé.
      setTimeout(() => overlay.remove(), FADE_DURATION);
    }

    closeBtn.addEventListener('click', close);

    // Touche Échap : ferme uniquement si le bouton est déjà actif
    // (cohérent avec le fait que la fermeture reste impossible avant cela).
    document.addEventListener('keydown', function onKeydown(e) {
      if (e.key === 'Escape' && !closeBtn.disabled) {
        document.removeEventListener('keydown', onKeydown);
        close();
      }
    });

    // Focus initial sur la fenêtre elle-même : le bouton, encore désactivé,
    // ne peut pas recevoir le focus (il le recevra automatiquement une fois
    // activé, voir plus haut).
    overlay.focus();
  }

  window.SiteApp.initIntroOverlay = initIntroOverlay;

})();
