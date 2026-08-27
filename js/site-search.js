(function () {

  const STAGGER_STEP_MS = 40;

  function normalize(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function currentPageFile() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || 'home.html';
  }

  function matchesQuery(entry, query) {
    const q = normalize(query);
    return (
      normalize(entry.title).includes(q) ||
      normalize(entry.description).includes(q) ||
      (!!entry.source && normalize(entry.source).includes(q)) ||
      (!!entry.date && normalize(entry.date).includes(q))
    );
  }

  function buildResultItem(entry, isCurrentPage, index) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * STAGGER_STEP_MS}ms`;

    const a = document.createElement('a');
    a.href = entry.href || '#';

    const title = document.createElement('span');
    title.className = 'searchResultTitle';
    title.textContent = entry.title;
    a.appendChild(title);

    const descr = document.createElement('span');
    descr.className = 'searchResultDescr';
    descr.textContent = entry.description;
    a.appendChild(descr);

    if (entry.source || entry.date) {
      const meta = document.createElement('span');
      meta.className = 'searchResultMeta';
      meta.textContent = [entry.source, entry.date].filter(Boolean).join(' — ');
      a.appendChild(meta);
    }

    if (!isCurrentPage) {
      const path = document.createElement('span');
      path.className = 'searchResultPath';
      path.textContent = entry.path;
      a.appendChild(path);
    }

    li.appendChild(a);
    return li;
  }

  function initSearch() {
    const searchBar = document.getElementById('searchBar');
    const resultsList = document.getElementById('searchResults');
    if (!searchBar || !resultsList) return;

    if (!window.GreenbeansArticles) {
      console.error(
        'site-search.js : window.GreenbeansArticles est introuvable. ' +
          "Vérifiez que js/site-articles.js est bien chargé AVANT js/site-search.js dans le <head> de la page."
      );
      return;
    }

    const pageFile = currentPageFile();

    const articlesPromise = window.GreenbeansArticles.getAllArticles();

    function render(query, articles) {
      resultsList.innerHTML = '';

      if (!query.trim()) {
        resultsList.hidden = true;
        return;
      }

      const onCurrentPage = articles.filter(
        (entry) => entry.page === pageFile && matchesQuery(entry, query)
      );
      const elsewhere = articles.filter(
        (entry) => entry.page !== pageFile && matchesQuery(entry, query)
      );
      const combined = onCurrentPage.concat(elsewhere);

      if (combined.length === 0) {
        resultsList.hidden = true;
        return;
      }

      combined.forEach((entry, index) => {
        const isCurrentPage = entry.page === pageFile;
        resultsList.appendChild(buildResultItem(entry, isCurrentPage, index));
      });

      resultsList.hidden = false;
    }

    function renderFromQuery(query) {
      if (!query.trim()) {
        resultsList.hidden = true;
        return;
      }
      articlesPromise.then((articles) => render(query, articles));
    }

    searchBar.addEventListener('input', () => {
      renderFromQuery(searchBar.value);
    });

    searchBar.addEventListener('focus', () => {
      if (searchBar.value.trim()) {
        renderFromQuery(searchBar.value);
      }
    });

    searchBar.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        resultsList.hidden = true;
      }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.searchBarWrapper')) {
        resultsList.hidden = true;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();
