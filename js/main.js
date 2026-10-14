// Point d'entrée : navigation entre les écrans et choix du niveau.

import { NIVEAUX } from './data/terminologie.js';
import { ecranThemes, ecranExercice } from './ui/entrainement.js';
import { ecranSaisie } from './ui/libre.js';
import { ecranFiches } from './ui/fiches.js';
import { el, vide, memoire } from './ui/composants.js';

const racine = document.getElementById('app');
const choixNiveau = document.getElementById('niveau');
let niveau = memoire.lit('niveau', 'c3');
if (!NIVEAUX.some((n) => n.id === niveau)) niveau = 'c3';

for (const n of NIVEAUX) choixNiveau.append(el('option', { value: n.id }, `${n.nom} (${n.detail})`));
choixNiveau.value = niveau;
choixNiveau.addEventListener('change', () => {
  niveau = choixNiveau.value;
  memoire.ecrit('niveau', niveau);
  route();
});

function accueil() {
  vide(racine).append(
    el('h1', {}, 'Analyser une phrase'),
    el('p', { class: 'intro' }, 'Apprends à trouver les verbes, les sujets, les compléments et la nature des mots, étape par étape.'),
    el('div', { class: 'cartes cartes-accueil' },
      el('a', { class: 'carte carte-grande', href: '#/entrainement' },
        el('span', { class: 'carte-icone', 'aria-hidden': 'true' }, '🎯'),
        el('strong', {}, 'S’entraîner'),
        el('span', {}, 'Des phrases corrigées, classées par difficulté : le sujet, les compléments, les natures…')),
      el('a', { class: 'carte carte-grande', href: '#/libre' },
        el('span', { class: 'carte-icone', 'aria-hidden': 'true' }, '✏️'),
        el('strong', {}, 'Analyser ma phrase'),
        el('span', {}, 'Une phrase d’un exercice ? L’application te guide test après test.')),
      el('a', { class: 'carte carte-grande', href: '#/fiches' },
        el('span', { class: 'carte-icone', 'aria-hidden': 'true' }, '📘'),
        el('strong', {}, 'Aide-mémoire'),
        el('span', {}, 'Les méthodes et les définitions à connaître.'))),
  );
}

function route() {
  const [, ecran, param] = location.hash.split('/');
  window.scrollTo(0, 0);
  if (ecran === 'entrainement' && param) return ecranExercice(racine, niveau, param);
  if (ecran === 'entrainement') return ecranThemes(racine, niveau);
  if (ecran === 'libre') return ecranSaisie(racine, niveau);
  if (ecran === 'fiches') return ecranFiches(racine, niveau);
  return accueil();
}

window.addEventListener('hashchange', route);
route();
