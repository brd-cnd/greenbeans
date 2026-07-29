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
//
// ⚠️ REGISTRE CENTRALISÉ : ARTICLES_PAGES ci-dessous fait le lien entre
// une page, son .csv et son "chemin de menu" (utilisé par la recherche
// pour afficher où se trouve un résultat trouvé sur une autre page).
// Quand vous créez une nouvelle page collectionArticles :
//   1. Ajoutez un fichier .csv dans /data (mêmes 3 colonnes).
//   2. Ajoutez une entrée ici.
//   3. Chargez ce script AVANT js/site-search.js dans le <head> de la page
//      (site-search.js dépend de window.GreenbeansArticles).
//
// FORMAT DU CSV : première ligne = en-têtes ("titre,description,lien"),
// une ligne par article ensuite. Si un champ contient une virgule, un
// guillemet ou un retour à la ligne, encadrez-le de guillemets doubles
// (comportement CSV standard, celui qu'Excel/LibreOffice/Google Sheets
// produisent automatiquement à l'enregistrement — aucune manipulation
// particulière requise de votre côté).
// -----------------------------------------------------------------------

(function () {
  const ARTICLES_PAGES = [
    {
      page: 'notions-informatique-reseaux.html',
      csv: 'data/notions-informatique-reseaux.csv',
      path: 'Notions > Informatique > Réseaux',
    },
    {
      page: 'notions-informatique-architecture_ordinateur.html',
      csv: 'data/notions-informatique-architecture_ordinateur.csv',
      path: "Notions > Informatique > Architecture de l'ordinateur",
    },
    {
      page: 'notions-informatique-cybersecurite.html',
      csv: 'data/notions-informatique-cybersecurite.csv',
      path: 'Notions > Informatique > Cybersécurité',
    },
    {
      page: 'notions-mathematiques.html',
      csv: 'data/notions-mathematiques.csv',
      path: 'Notions > Mathématiques',
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
      page: 'projets-personnels.html',
      csv: 'data/projets-personnels.csv',
      path: 'Projets > Personnels > Divers',
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
      }));
  }

  // Cache par page : évite de re-télécharger/re-parser le même .csv pour
  // rien (ex. si la page courante ET la recherche en ont besoin toutes les
  // deux, ou si l'utilisateur retape dans la barre de recherche).
  const cache = new Map();

  function fetchPageArticles(entry) {
    if (!cache.has(entry.page)) {
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
      cache.set(entry.page, promise);
    }
    return cache.get(entry.page);
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

    const descr = document.createElement('p');
    descr.className = 'descrArticle';
    descr.textContent = article.description;

    li.appendChild(a);
    li.appendChild(descr);
    return li;
  }

  // Remplit le <ul class="articlesList"> de la page courante à partir de
  // son propre .csv (identifié via ARTICLES_PAGES). Ne fait rien si la
  // page n'a pas de liste d'articles, ou n'est pas dans le registre.
  async function renderCurrentPageList() {
    const list = document.querySelector('.articlesList');
    if (!list) return;

    const entry = ARTICLES_PAGES.find((e) => e.page === currentPageFile());
    if (!entry) return;

    const articles = await fetchPageArticles(entry);
    list.innerHTML = '';
    articles.forEach((article) => list.appendChild(buildArticleLi(article)));
  }

  // Exposé pour que js/site-search.js (chargé après ce script) puisse
  // réutiliser la même source de données pour la recherche inter-pages.
  window.GreenbeansArticles = { getAllArticles, ARTICLES_PAGES };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCurrentPageList);
  } else {
    renderCurrentPageList();
  }
})();
