// Aide-mémoire : fiches méthode, fonctions et natures au niveau choisi.

import { METHODES } from '../data/methodes.js';
import { FONCTIONS, NATURES, GROUPES, TYPES_PHRASE, FORMES_PHRASE, TEMPS_VERBAUX, auNiveau } from '../data/terminologie.js';
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
      el('summary', {}, 'La structure de la phrase'),
      el('p', {}, 'La phrase type se compose d’un groupe sujet et d’un groupe verbal, auxquels peut s’ajouter un complément circonstanciel : « [Le facteur] [distribue le courrier] [à huit heures] ».'),
      el('p', {}, 'Avec le vocabulaire du prédicat : sujet + prédicat (+ complément de phrase). Le prédicat, c’est ce que l’on dit du sujet : le verbe et ses compléments (COD, COI, attribut), négation comprise.')),
    el('details', { class: 'fiche' },
      el('summary', {}, 'La nature des groupes'),
      el('dl', {}, Object.values(GROUPES).flatMap((g) => [el('dt', {}, g.nom), el('dd', {}, g.aide, g.noyau ? ` Noyau : ${g.noyau}.` : '')])),
      el('p', { class: 'petit' }, 'Le noyau est le mot autour duquel le groupe est construit : on ne peut pas le supprimer.')),
    el('details', { class: 'fiche' },
      el('summary', {}, 'L’identité du verbe'),
      el('p', {}, 'Infinitif, mode, temps, personne. Pour un temps composé (auxiliaire + participe passé), le temps de l’auxiliaire donne le temps composé : présent → passé composé, imparfait → plus-que-parfait, passé simple → passé antérieur, futur → futur antérieur.'),
      el('dl', {}, Object.values(TEMPS_VERBAUX).filter((m) => auNiveau(m.niveau, niveau)).flatMap((m) => [el('dt', {}, m.nom), el('dd', {}, Object.values(m.temps).join(', '))]))),
    el('details', { class: 'fiche' },
      el('summary', {}, 'Types et formes de phrase'),
      el('p', {}, 'Toute phrase a un type, et un seul :'),
      el('dl', {}, Object.values(TYPES_PHRASE).flatMap((t) => [el('dt', {}, t.nom), el('dd', {}, t.aide)])),
      el('p', {}, 'Elle peut en plus avoir une ou plusieurs formes ; sinon c’est la phrase de base :'),
      el('dl', {}, Object.values(FORMES_PHRASE).filter((f) => auNiveau(f.niveau, niveau)).flatMap((f) => [el('dt', {}, f.nom), el('dd', {}, f.aide)]))),
    el('details', { class: 'fiche' },
      el('summary', {}, 'Les natures'),
      el('ul', { class: 'liste-natures' }, natures.map((n) => el('li', { class: n.parent ? 'sous' : '' }, n.nom)))),
    el('p', { class: 'petit' }, 'Vocabulaire conforme à « La grammaire du français. Terminologie grammaticale » (Éduscol, 2020).'),
    el('p', { class: 'petit' }, 'Dictionnaire : Lexique 3.83 (B. New, C. Pallier et al., ',
      el('a', { href: 'http://www.lexique.org' }, 'lexique.org'), '), licence CC BY-SA 4.0.'),
  );
}
