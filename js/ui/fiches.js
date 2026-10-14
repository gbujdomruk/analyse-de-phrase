// Aide-mémoire : fiches méthode, fonctions et natures au niveau choisi.

import { METHODES } from '../data/methodes.js';
import { FONCTIONS, NATURES, auNiveau } from '../data/terminologie.js';
import { el, remplit } from './composants.js';

export function ecranFiches(racine, niveau) {
  const fonctions = Object.values(FONCTIONS).filter((f) => auNiveau(f.niveau, niveau));
  const natures = Object.values(NATURES).filter((n) => auNiveau(n.niveau, niveau));
  remplit(racine, 
    el('h1', {}, 'Aide-mémoire'),
    el('p', { class: 'intro' }, 'Les méthodes pour ne plus rester bloqué·e. Touche un titre pour l’ouvrir.'),
    ...Object.values(METHODES).map((m) => el('details', { class: 'fiche' },
      el('summary', {}, m.titre),
      el('ol', {}, m.etapes.map((e) => el('li', {}, e))))),
    el('details', { class: 'fiche' },
      el('summary', {}, 'Les fonctions'),
      el('dl', {}, fonctions.flatMap((f) => [el('dt', { class: `c-${f.couleur}` }, f.nom), el('dd', {}, f.definition)]))),
    el('details', { class: 'fiche' },
      el('summary', {}, 'Les natures'),
      el('ul', { class: 'liste-natures' }, natures.map((n) => el('li', { class: n.parent ? 'sous' : '' }, n.nom)))),
    el('p', { class: 'petit' }, 'Vocabulaire conforme à « La grammaire du français. Terminologie grammaticale » (Éduscol, 2020).'),
    el('p', { class: 'petit' }, 'Dictionnaire : Lexique 3.83 (B. New, C. Pallier et al., ',
      el('a', { href: 'http://www.lexique.org' }, 'lexique.org'), '), licence CC BY-SA 4.0.'),
  );
}
