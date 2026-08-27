// greenbeans — site-articles.js
// -----------------------------------------------------------------------
// Source unique de vérité pour les pages "collectionArticles" : chaque
// page a son propre fichier .csv (colonnes : titre, description, lien),
// stocké dans /data. Ce module :
//   1. Charge le .csv de la page courante et remplit son
//      <ul class="articlesList"> (remplace ce qui était écrit à la main).
//   2. Expose une fonction pour charger TOUS les .csv du site, utilisée
//      par js/site-search.js pour la recherche inter-pages — plus besoin
//      de dupliquer chaque article à la main dans un second fichier.
//   3. Gère aussi des listes de LIENS simples (pas d'articles), pour des
//      renvois ponctuels vers une autre page : voir plus bas "Listes de
//      liens simples".
//
// ⚠️ REGISTRE CENTRALISÉ : ARTICLES_PAGES ci-dessous fait le lien entre
// une page, son .csv et son "chemin de menu" (utilisé par la recherche
// pour afficher où se trouve un résultat trouvé sur une autre page).
// Quand vous créez une nouvelle page collectionArticles :
//   1. Ajoutez un fichier .csv dans /data (mêmes 3 colonnes).
//   2. Ajoutez une entrée ici. Si la page a PLUSIEURS listes (ex. deux
//      sections distinctes), ajoutez une entrée par liste avec la même
//      `page` mais un `csv`/`path` propres, plus une clé `list` qui doit
//      correspondre à l'attribut `data-list` du <ul class="articlesList">
//      visé dans le HTML.
//   3. Si la page a une barre de recherche, chargez ce script AVANT
//      js/site-search.js dans le <head> (site-search.js dépend de
//      window.GreenbeansArticles). Sinon, ce script suffit seul.
//
// FORMAT DU CSV : première ligne = en-têtes ("titre,description,lien"),
// une ligne par article ensuite. Deux colonnes optionnelles peuvent suivre :
// "source" et "date" (ex. "Forbes", "18 mai 2026") — si elles sont présentes
// et non vides, elles s'affichent en petit entre le titre et la description.
// Absentes ou vides, rien ne s'affiche (comportement des pages existantes,
// inchangé). Si un champ contient une virgule, un guillemet ou un retour à
// la ligne, encadrez-le de guillemets doubles (comportement CSV standard,
// celui qu'Excel/LibreOffice/Google Sheets produisent automatiquement à
// l'enregistrement — aucune manipulation particulière requise de votre côté).
// -----------------------------------------------------------------------

(function () {
  const ARTICLES_PAGES = [
    {
      page: 'notions-computerscience.html',
      csv: 'data/notions-informatique-reseaux.csv',
      path: 'Notions > Informatique > Réseaux',
      list: 'networks',
    },
    {
      page: 'notions-computerscience.html',
      csv: 'data/notions-informatique-architecture_ordinateur.csv',
      path: "Notions > Informatique > Architecture de l'ordinateur",
      list: 'architecture',
    },
    {
      page: 'notions-computerscience.html',
      csv: 'data/notions-informatique-cybersecurite.csv',
      path: 'Notions > Informatique > Cybersécurité',
      list: 'cybersecurity',
    },
    {
      page: 'notions-mathematiques.html',
      csv: 'data/notions-mathematiques.csv',
      path: 'Notions > Mathématiques',
    },
    {
      page: 'notions-vt-social_engineering_and_AI.html',
      csv: 'data/notions-resources-veille-technologique.csv',
      path: 'Notions > Ressources > Veille technologique',
    },
    {
      page: 'histoire-portraits.html',
      csv: 'data/histoire-portraits.csv',
      path: 'Histoire > Portraits',
    },
    {
      page: 'histoire-cyberattaques.html',
      csv: 'data/histoire-cyberattaques.csv',
      path: 'Histoire > Cyberattaques',
    },
    {
      page: 'projects-professional.html',
      csv: 'data/projects-professional.csv',
      path: 'Projets > Professionnels',
    },
    {
      page: 'projects-personal.html',
      csv: 'data/projects-personal-labs.csv',
      path: 'Projets > Personnels > Laboratoire',
      list: 'labs',
    },
    {
      page: 'projects-personal.html',
      csv: 'data/projects-personal-others.csv',
      path: 'Projets > Personnels > Divers',
      list: 'others',
    },
  ];

  // ── Parseur CSV minimal (aucune librairie externe) ──────────────────────
  // Gère les champs entre guillemets (guillemet littéral = "" à l'intérieur
  // d'un champ), les virgules et retours à la ligne à l'intérieur d'un
  // champ cité, ainsi que les fins de ligne \n et \r\n.
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        // ignoré : on attend le \n qui suit (fins de ligne Windows/Excel)
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    // Dernier champ/ligne si le fichier ne se termine pas par un retour à
    // la ligne.
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  // Convertit les lignes du CSV (hors en-tête) en objets {title, description, href}.
  // Ignore les lignes entièrement vides (ex. ligne blanche en fin de fichier).
  function rowsToArticles(rows) {
    return rows
      .slice(1)
      .filter((r) => r.some((cell) => cell.trim() !== ''))
      .map((r) => ({
        title: (r[0] || '').trim(),
        description: (r[1] || '').trim(),
        href: (r[2] || '').trim() || '#',
        source: (r[3] || '').trim(),
        date: (r[4] || '').trim(),
      }));
  }

  // Cache par page : évite de re-télécharger/re-parser le même .csv pour
  // rien (ex. si la page courante ET la recherche en ont besoin toutes les
  // deux, ou si l'utilisateur retape dans la barre de recherche).
  const cache = new Map();

  function fetchPageArticles(entry) {
    //if (!cache.has(entry.page)) {
    if (!cache.has(entry.csv)) {    
      const promise = fetch(entry.csv)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`CSV introuvable ou inaccessible : ${entry.csv} (${res.status})`);
          }
          return res.text();
        })
        .then((text) => rowsToArticles(parseCSV(text)))
        .catch((err) => {
          // Un .csv manquant/mal formé sur une page ne doit pas casser le
          // reste du site : on log l'erreur et on retombe sur une liste
          // vide pour cette page-là uniquement.
          console.error(err);
          return [];
        });
      //cache.set(entry.page, promise);
      cache.set(entry.csv, promise);
    }
    //return cache.get(entry.page);
    return cache.get(entry.csv);
  }

  // Charge TOUS les .csv du registre (utilisé par la recherche inter-pages).
  async function getAllArticles() {
    const perPage = await Promise.all(
      ARTICLES_PAGES.map(async (entry) => {
        const articles = await fetchPageArticles(entry);
        return articles.map((a) => ({ ...a, page: entry.page, path: entry.path }));
      })
    );
    return perPage.flat();
  }

  function currentPageFile() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || 'home.html';
  }

  function buildArticleLi(article) {
    const li = document.createElement('li');
    li.className = 'article';

    const a = document.createElement('a');
    a.className = 'titleArticle';
    a.href = article.href;
    a.textContent = article.title;
    // Lien externe (source de veille, article de presse, etc.) : s'ouvre
    // dans un nouvel onglet, sans donner accès à `window.opener`. Les liens
    // internes au site (autre page de greenbeans) restent inchangés.
    if (/^https?:\/\//i.test(article.href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    li.appendChild(a);

    if (article.source || article.date) {
      const meta = document.createElement('p');
      meta.className = 'small';
      meta.textContent = [article.source, article.date].filter(Boolean).join(' — ');
      li.appendChild(meta);
    }

    const descr = document.createElement('p');
    descr.className = 'descrArticle';
    descr.textContent = article.description;
    li.appendChild(descr);

    return li;
  }

  // Remplit le(s) <ul class="articlesList"> de la page courante à partir de
  // son (ou ses) propre(s) .csv (identifié(s) via ARTICLES_PAGES). Ne fait
  // rien si la page n'a pas de liste d'articles, ou n'est pas dans le
  // registre.
  //
  // Une page peut avoir PLUSIEURS listes distinctes (ex. "Laboratoire" et
  // "Divers" sur projects-personal.html) : dans ce cas, chaque entrée du
  // registre porte une clé `list`, qui doit correspondre à l'attribut
  // `data-list` du <ul> ciblé. Une page à liste unique (cas le plus
  // fréquent) n'a besoin ni de `list` ni de `data-list`.
  async function renderCurrentPageList() {
    const entries = ARTICLES_PAGES.filter((e) => e.page === currentPageFile());
    if (!entries.length) return;

    for (const entry of entries) {
      const list = entry.list
        ? document.querySelector(`.articlesList[data-list="${entry.list}"]`)
        : document.querySelector('.articlesList');
      if (!list) continue;

      const articles = await fetchPageArticles(entry);
      list.innerHTML = '';
      articles.forEach((article) => list.appendChild(buildArticleLi(article)));
    }
  }

  // ── Listes de liens simples (pas des articles) ──────────────────────────
  // Utilisées pour des renvois ponctuels vers une autre page (ex. le lien
  // vers "Veille technologique" sur notions-resources.html) : juste un
  // lien vers une page dédiée, sans description ni recherche. Toujours
  // alimentées par un .csv (colonnes : titre, lien), jamais écrites en dur
  // dans le HTML — même principe que les articles, en plus minimal.
  //
  // UTILISATION DANS LA PAGE :
  //   <ul class="articlesList" data-nav-csv="data/xxx-links.csv"></ul>
  // (la classe "articlesList" suffit à hériter du bon style ; l'attribut
  // "data-nav-csv" est ce que ce module utilise pour repérer ces listes-là
  // et les distinguer des listes d'articles classiques.)
  //
  // FORMAT DU CSV : première ligne = en-têtes ("titre,lien"), une ligne par
  // lien ensuite.
  function rowsToLinks(rows) {
    return rows
      .slice(1)
      .filter((r) => r.some((cell) => cell.trim() !== ''))
      .map((r) => ({
        title: (r[0] || '').trim(),
        href: (r[1] || '').trim() || '#',
      }));
  }

  function buildLinkLi(item) {
    const li = document.createElement('li');
    li.className = 'article';

    const a = document.createElement('a');
    a.className = 'titleArticle';
    a.href = item.href;
    a.textContent = item.title;
    if (/^https?:\/\//i.test(item.href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    li.appendChild(a);

    return li;
  }

  async function renderLinkLists() {
    const lists = document.querySelectorAll('.articlesList[data-nav-csv]');
    for (const list of lists) {
      try {
        const res = await fetch(list.dataset.navCsv);
        if (!res.ok) {
          throw new Error(`CSV introuvable ou inaccessible : ${list.dataset.navCsv} (${res.status})`);
        }
        const text = await res.text();
        const links = rowsToLinks(parseCSV(text));
        list.innerHTML = '';
        links.forEach((item) => list.appendChild(buildLinkLi(item)));
      } catch (err) {
        // Un .csv manquant/mal formé sur une liste ne doit pas casser le
        // reste de la page : on log l'erreur et on passe à la suivante.
        console.error(err);
      }
    }
  }

  // Exposé pour que js/site-search.js (chargé après ce script) puisse
  // réutiliser la même source de données pour la recherche inter-pages.
  // Exposé aussi pour d'autres scripts qui ont besoin de lire un .csv sur
  // le même modèle mais avec des colonnes différentes (ex. site-youtube.js
  // pour les chaînes YouTube : nom, utilisateur, photo).
  window.GreenbeansArticles = { getAllArticles, ARTICLES_PAGES, parseCSV };

  function init() {
    renderCurrentPageList();
    renderLinkLists();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
