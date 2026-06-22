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
   On utilise deux niveaux de stockage complémentaires :

   1. sessionStorage :
      - Partagée par toutes les pages du même onglet.
      - Effacée à la fermeture de l'onglet/du navigateur.
      - Suffit pour les navigations classiques (même onglet).
      LIMITE : un lien ouvert avec target="_blank" crée un nouvel onglet
      qui n'hérite PAS de la sessionStorage du parent → l'overlay
      réapparaîtrait.

   2. localStorage (horodaté, durée de vie : 24 h) :
      - Partagée entre TOUS les onglets du même navigateur.
      - Permet de propager l'état "déjà vu" aux nouveaux onglets.
      - La durée limitée (24 h) reproduit le comportement "effacé à la
        fermeture du navigateur" : revenir le lendemain → overlay visible.

   Au chargement de chaque page :
     1. On regarde si "greenbeans-intro-seen" existe dans sessionStorage
        (même onglet).
     2. Sinon, on regarde si une clé horodatée existe dans localStorage
        et date de moins de 24 h (autre onglet de la même session).
     3. Si aucun des deux → on affiche le message et on écrit dans les
        deux stockages.

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
        "Pour télécharger des documents de l'école (calendrier, contrat) : menu (☰) > À propos > Informations personnelles > Page recrutement",
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
    /*
      ── Stratégie de détection "déjà vu" ───────────────────────────────
      On lit dans cet ordre :
        1. sessionStorage — partagé entre les pages d'un même onglet.
           Problème : un nouvel onglet (target="_blank") n'hérite PAS de
           la sessionStorage du parent → l'overlay réapparaîtrait.
        2. localStorage — partagé entre TOUS les onglets du même navigateur
           et conservé jusqu'à fermeture du navigateur (via une clé
           horodatée, voir ci-dessous). On ne s'en sert que pour propager
           l'état "déjà vu" aux nouveaux onglets ouverts dans la même
           session de navigation.

      ── Durée de validité ──────────────────────────────────────────────
      On veut reproduire le comportement de sessionStorage (effacé à la
      fermeture du navigateur) malgré l'utilisation de localStorage.
      Pour cela, on stocke l'heure à laquelle l'overlay a été affiché et
      on le considère comme "vu" uniquement si cette heure date de moins
      de 24 heures. Ainsi :
        - Rouvrir un lien dans un nouvel onglet dans la même session → pas
          d'overlay (clé récente).
        - Revenir le lendemain (ou après fermeture prolongée) → overlay
          réapparaît (clé expirée ou absente).
    */
    const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 heures en ms

    let alreadySeen = false;

    /* 1. sessionStorage (onglet courant) */
    try {
      alreadySeen = sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (err) { /* indisponible */ }

    /* 2. localStorage (autres onglets de la même session) */
    if (!alreadySeen) {
      try {
        const ts = localStorage.getItem(STORAGE_KEY + '-ts');
        if (ts && Date.now() - Number(ts) < SESSION_TTL) {
          alreadySeen = true;
          /* Propage immédiatement à sessionStorage pour les navigations suivantes */
          try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
        }
      } catch (err) { /* localStorage indisponible */ }
    }

    if (alreadySeen) return;

    // Mémorise immédiatement dans les deux stockages :
    //   - sessionStorage → pages suivantes du même onglet
    //   - localStorage   → nouveaux onglets ouverts dans la même journée
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (err) {}
    try { localStorage.setItem(STORAGE_KEY + '-ts', String(Date.now())); } catch (err) {}

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
