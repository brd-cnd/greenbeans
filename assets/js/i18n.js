/* =============================================================================
   I18N.JS — Moteur de traduction (FR / DE / EN)
   =============================================================================

   Ce fichier remplace l'ancien objet "translations" qui était écrit en dur
   dans le <script> de chaque page. Désormais, les textes traduits vivent
   dans des fichiers JSON séparés (un par langue), dans le dossier
   assets/i18n/ :

     - assets/i18n/common_fr.json / common_en.json / common_de.json
         → textes du tiroir de navigation (liens de menu, accessibilité)
           communs à TOUTES les pages.

     - assets/i18n/<page>_fr.json / <page>_en.json / <page>_de.json
         → textes propres à CHAQUE page (titres, descriptions, panneaux...).
           <page> correspond à l'attribut data-page="..." posé sur <body>
           (ex : data-page="apropos" → assets/i18n/apropos_fr.json).

   Pour traduire un élément HTML, on lui donne un attribut data-i18n="clé"
   (déjà présent dans le HTML existant). Quand on appelle
   SiteApp.setLanguage('en'), ce script :
     1. charge assets/i18n/common_en.json + assets/i18n/<page>_en.json,
     2. fusionne les deux dictionnaires,
     3. remplace le texte de chaque élément [data-i18n] par la traduction
        correspondant à sa clé,
     4. met à jour le bouton de langue actif et l'attribut <html lang="...">.

   IMPORTANT — fichiers JSON et navigation locale (file://) :
   Les navigateurs bloquent par sécurité les requêtes "fetch" vers des
   fichiers JSON locaux ouverts en double-cliquant (protocole file://).
   Pour que le changement de langue fonctionne pendant les tests, lancez un
   petit serveur local depuis le dossier du site, par exemple :

       python3 -m http.server 8000

   puis ouvrez http://localhost:8000/home.html dans votre navigateur.
   Une fois le site déposé sur un hébergement web normal (ce qui sera le
   cas en production), tout fonctionne sans configuration particulière.
   Si les fichiers ne peuvent pas être chargés, la page reste affichée dans
   sa langue par défaut (le français, déjà présent dans le HTML) : rien ne
   casse, seul le changement de langue est indisponible.
============================================================================= */

window.SiteApp = window.SiteApp || {};

(function () {

  /* Petit cache pour ne charger chaque dictionnaire qu'une seule fois */
  const cache = {};

  /*
   * ── Chargement et fusion des dictionnaires ──────────────────────────────
   * - assets/i18n/common_<lang>.json : toujours chargé (tiroir de navigation).
   * - assets/i18n/<page>_<lang>.json : chargé uniquement si
   *   <body data-page="..."> est défini (toutes les pages du site le
   *   définissent).
   */
  async function loadDictionary(lang) {
    if (cache[lang]) return cache[lang];

    const page = document.body.dataset.page;
    const urls = [`assets/i18n/common_${lang}.json`];
    if (page) urls.push(`assets/i18n/${page}_${lang}.json`);

    const dicts = await Promise.all(
      urls.map(url =>
        fetch(url).then(res => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText} (${url})`);
          return res.json();
        })
      )
    );

    const merged = Object.assign({}, ...dicts);
    cache[lang] = merged;
    return merged;
  }

  /*
   * ── Application de la langue ─────────────────────────────────────────────
   * Met à jour tous les éléments [data-i18n], les boutons de langue,
   * et l'attribut <html lang="...">.
   */
  async function setLanguage(lang) {
    let dict;
    try {
      dict = await loadDictionary(lang);
    } catch (err) {
      console.warn(`i18n : impossible de charger les traductions "${lang}".`, err);
      console.warn(
        'Astuce : ouvrez le site via un serveur local ' +
        '(ex. "python3 -m http.server" puis http://localhost:8000/), ' +
        'le chargement direct des fichiers JSON (file://) est bloqué par le navigateur.'
      );
      return;
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll('.lang-item').forEach(btn => {
      const isActive = btn.dataset.lang === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    document.documentElement.lang = lang;
  }

  window.SiteApp.setLanguage = setLanguage;

})();
