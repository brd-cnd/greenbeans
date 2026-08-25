// greenbeans — site-youtube.js
// -----------------------------------------------------------------------
// Grille de chaînes YouTube, chargée depuis un .csv (colonnes : nom,
// utilisateur, photo), sur le même principe que js/site-articles.js pour
// les articles — mais pour ce contenu-là, une simple grille suffit, pas
// besoin de recherche.
//
// ⚠️ Ce script doit être chargé APRÈS js/site-articles.js : il réutilise
// son parseur CSV via window.GreenbeansArticles.parseCSV, pour ne pas
// dupliquer de code.
//
// UTILISATION DANS LA PAGE :
//   <div class="youtubeGrid" data-csv="data/xxx-youtube.csv"></div>
// Ne fait rien si ce conteneur est absent de la page.
//
// FORMAT DU CSV : première ligne = en-têtes ("nom,utilisateur,photo"), une
// ligne par chaîne ensuite.
//   - "utilisateur" : le pseudo AVEC l'arobase (ex. "@Micode") — le lien
//     vers la chaîne est reconstruit automatiquement
//     (https://www.youtube.com/<utilisateur>), inutile de le renseigner.
//   - "photo" : chemin vers l'image, relatif à la racine du site (ex.
//     "picture/youtube/micode.jpg"). Tant que le fichier n'existe pas
//     encore, un simple rond avec l'initiale du nom s'affiche à la place
//     — dès que la photo est ajoutée au bon endroit, elle apparaît
//     automatiquement, sans rien changer au code.
//
// Pour ajouter une chaîne : une seule ligne à ajouter dans le .csv, rien
// d'autre à toucher.
// -----------------------------------------------------------------------

(function () {
  function rowsToChannels(rows) {
    return rows
      .slice(1)
      .filter((r) => r.some((cell) => cell.trim() !== ''))
      .map((r) => ({
        nom: (r[0] || '').trim(),
        utilisateur: (r[1] || '').trim(),
        photo: (r[2] || '').trim(),
      }));
  }

  function buildChannelCard(channel) {
    const card = document.createElement('div');
    card.className = 'youtubeChannel';

    const photoWrap = document.createElement('div');
    photoWrap.className = 'youtubeChannel__photo';

    if (channel.photo) {
      const img = document.createElement('img');
      img.src = channel.photo;
      img.alt = `Photo de la chaîne ${channel.nom}`;
      img.loading = 'lazy';
      // Tant que la photo n'existe pas (dossier pas encore rempli), on
      // remplace l'icône d'image cassée par un simple rond avec
      // l'initiale du nom, plutôt que de laisser un visuel cassé.
      img.addEventListener('error', () => {
        img.remove();
        photoWrap.textContent = channel.nom.trim().charAt(0).toUpperCase();
        photoWrap.classList.add('youtubeChannel__photo--fallback');
      });
      photoWrap.appendChild(img);
    } else {
      photoWrap.textContent = channel.nom.trim().charAt(0).toUpperCase();
      photoWrap.classList.add('youtubeChannel__photo--fallback');
    }

    const info = document.createElement('div');
    info.className = 'youtubeChannel__info';

    const name = document.createElement('span');
    name.className = 'youtubeChannel__name';
    name.textContent = channel.nom;
    info.appendChild(name);

    if (channel.utilisateur) {
      const handle = document.createElement('a');
      handle.className = 'youtubeChannel__handle';
      handle.href = `https://www.youtube.com/${channel.utilisateur}`;
      handle.target = '_blank';
      handle.rel = 'noopener noreferrer';
      handle.textContent = channel.utilisateur;
      info.appendChild(handle);
    }

    card.appendChild(photoWrap);
    card.appendChild(info);
    return card;
  }

  async function renderYoutubeGrid() {
    const grid = document.querySelector('.youtubeGrid');
    if (!grid) return;

    const csvPath = grid.getAttribute('data-csv');
    if (!csvPath) return;

    if (!window.GreenbeansArticles || !window.GreenbeansArticles.parseCSV) {
      console.error(
        'site-youtube.js : window.GreenbeansArticles.parseCSV introuvable. ' +
          "Vérifiez que js/site-articles.js est bien chargé AVANT js/site-youtube.js."
      );
      return;
    }

    try {
      const res = await fetch(csvPath);
      if (!res.ok) {
        throw new Error(`CSV introuvable ou inaccessible : ${csvPath} (${res.status})`);
      }
      const text = await res.text();
      const channels = rowsToChannels(window.GreenbeansArticles.parseCSV(text));
      grid.innerHTML = '';
      channels.forEach((channel) => grid.appendChild(buildChannelCard(channel)));
    } catch (err) {
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderYoutubeGrid);
  } else {
    renderYoutubeGrid();
  }
})();
