// greenbeans — site-search.js
// -----------------------------------------------------------------------
// Recherche live sur les pages "collectionArticles" (celles qui affichent
// une barre de recherche + une liste d'articles).
//
// Règles appliquées (validées avec l'utilisateur) :
//   - La recherche porte sur le TITRE et la DESCRIPTION de chaque article,
//     jamais sur le contenu de l'article lui-même.
//   - Les résultats situés sur la page courante sont affichés en premier,
//     puis ceux trouvés sur d'autres pages, accompagnés du chemin de menu
//     à suivre pour y accéder (ex. "Notions > Informatique > Réseaux").
//   - Les résultats apparaissent progressivement (léger décalage
//     d'animation entre chaque élément) à chaque frappe.
//   - Cliquer sur un résultat navigue directement vers l'article : aucune
//     validation par "Entrée" n'est nécessaire (il n'y a pas de <form>,
//     donc "Entrée" ne fait rien de particulier ici).
//
// ⚠️ SOURCE DES DONNÉES : ce fichier ne contient plus aucun article en dur.
// La liste complète (toutes pages confondues) est chargée depuis les .csv
// de /data via js/site-articles.js — CE SCRIPT DOIT ÊTRE CHARGÉ AVANT
// site-search.js dans le <head> de la page (window.GreenbeansArticles doit
// déjà exister). Pour ajouter/modifier un article, éditez uniquement le
// .csv concerné : plus besoin de dupliquer quoi que ce soit ici.
// -----------------------------------------------------------------------

(function () {
  // Décalage d'animation entre deux résultats consécutifs (effet
  // d'apparition progressive plutôt que tout d'un bloc).
  const STAGGER_STEP_MS = 40;

  // Comparaison insensible aux accents et à la casse (ex. "cybersecurite"
  // doit retrouver "Cybersécurité").
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
    return normalize(entry.title).includes(q) || normalize(entry.description).includes(q);
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

    // Le chemin d'accès ne s'affiche que pour un résultat qui n'est PAS
    // sur la page courante : sur la page courante, il est déjà évident où
    // l'on se trouve.
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

    // Chargement de tous les articles (tous CSV confondus) une seule fois,
    // dès l'arrivée sur la page : par la suite, chaque frappe réutilise la
    // même promesse déjà résolue (site-articles.js garde aussi son propre
    // cache par page, donc aucun re-téléchargement inutile).
    const articlesPromise = window.GreenbeansArticles.getAllArticles();

    function render(query, articles) {
      resultsList.innerHTML = '';

      if (!query.trim()) {
        resultsList.hidden = true;
        return;
      }

      // Priorité à la page courante : ses résultats sont toujours listés
      // avant ceux d'ailleurs, quel que soit leur ordre d'origine.
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

    // Fermeture au clic en dehors du bloc barre + résultats. On utilise le
    // "click" du document plutôt qu'un "blur" sur la barre de recherche :
    // "blur" se déclenche AVANT le clic sur un résultat et fermerait la
    // liste avant que la navigation n'ait eu lieu.
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
