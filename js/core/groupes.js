// Nature et noyau d'un groupe de mots, déduits de la nature de ses mots.
// `natureDe(i)` donne le code de nature du mot i (corrigé de la banque, ou
// nature la plus probable d'après le dictionnaire en mode libre).

import { categorie } from '../data/terminologie.js';
import { normalise } from './decoupage.js';

const CONTRACTES = new Set(['au', 'aux']);
// « du », « des » valent « de + le / les » dans un groupe prépositionnel
// (le président du club) ; on le sait par la fonction du groupe.
const FONCTIONS_PREPOSITIONNELLES = new Set(['CN', 'COI', 'CADJ', 'CAG']);

const cite = (jetons, i) => `« ${jetons[i].texte} »`;

// options : { proposition: le groupe est une subordonnée, fonction }
export function natureGroupe(jetons, indices, natureDe, { proposition = false, fonction = null } = {}) {
  const ind = indices.filter((i) => !jetons[i].ponct && !jetons[i].euphonique).sort((a, b) => a - b);
  if (!ind.length) return null;
  const cat = (i) => categorie(natureDe(i) ?? '');
  const nat = (i) => natureDe(i) ?? '';
  const premier = ind[0];
  const mot = normalise(jetons[premier].texte);

  if (proposition) {
    return {
      code: 'SUB', noyau: null,
      raison: `Le groupe contient un verbe conjugué et commence par ${cite(jetons, premier)}, un mot subordonnant : c’est une proposition subordonnée.`,
    };
  }

  const contracte = CONTRACTES.has(mot) || (['du', 'des'].includes(mot) && FONCTIONS_PREPOSITIONNELLES.has(fonction));
  if (cat(premier) === 'prep' || contracte) {
    // Noyau : premier nom, pronom ou infinitif après la préposition (et ses
    // éventuels prolongements de locution : « à cause de »).
    // On saute déterminants, adjectifs et adverbes ; un pronom collé à un
    // infinitif (« pour m'entraîner ») est son complément : le noyau est
    // l'infinitif. « pour réussir ses examens » : le noyau est « réussir ».
    const reste = ind.slice(1).filter((i) => cat(i) !== 'prep' || nat(i) !== nat(premier));
    let noyau = reste.find((i) => ['nom', 'pro', 'verbe'].includes(cat(i)));
    if (noyau !== undefined && cat(noyau) === 'pro') {
      const apres = reste.find((i) => i > noyau && cat(i) !== 'pro');
      if (apres !== undefined && cat(apres) === 'verbe') noyau = apres;
    }
    const contraction = contracte ? ` (« ${jetons[premier].texte} » = ${mot === 'au' ? 'à + le' : mot === 'aux' ? 'à + les' : mot === 'du' ? 'de + le' : 'de + les'})` : '';
    return {
      code: 'GP', noyau: noyau ?? null,
      raison: `Le groupe commence par la préposition ${cite(jetons, premier)}${contraction} : c’est un groupe prépositionnel.`,
    };
  }
  if (ind.length === 1 && cat(premier) === 'pro') {
    return { code: 'PRO', noyau: null, raison: `${cite(jetons, premier)} est un pronom employé seul.` };
  }
  // On saute les adverbes de tête pour trouver le mot qui organise le groupe.
  const tete = ind.find((i) => cat(i) !== 'adv') ?? premier;
  if (cat(tete) === 'det' || cat(tete) === 'nom') {
    const noyau = ind.find((i) => cat(i) === 'nom');
    return {
      code: 'GN', noyau: noyau ?? null,
      raison: cat(tete) === 'det'
        ? `Le groupe commence par le déterminant ${cite(jetons, tete)}, qui introduit le nom${noyau !== undefined ? ` ${cite(jetons, noyau)}` : ''} : c’est un groupe nominal.`
        : `Le groupe est construit autour du nom ${cite(jetons, tete)} : c’est un groupe nominal.`,
    };
  }
  if (cat(tete) === 'adj') {
    return { code: 'GAdj', noyau: tete, raison: `Le groupe est construit autour de l’adjectif ${cite(jetons, tete)} : c’est un groupe adjectival.` };
  }
  if (cat(tete) === 'verbe') {
    return { code: 'GInf', noyau: tete, raison: `Le groupe est construit autour du verbe à l’infinitif ${cite(jetons, tete)} : c’est un groupe infinitif.` };
  }
  if (cat(tete) === 'pro') {
    return { code: 'PRO', noyau: tete, raison: `Le groupe est construit autour du pronom ${cite(jetons, tete)}.` };
  }
  if (ind.every((i) => cat(i) === 'adv')) {
    return { code: 'GAdv', noyau: ind.at(-1), raison: `Le groupe est formé ${ind.length > 1 ? 'd’adverbes' : 'd’un adverbe'} : c’est un adverbe ou un groupe adverbial.` };
  }
  return { code: 'GN', noyau: ind.find((i) => cat(i) === 'nom') ?? null, raison: 'Le groupe semble construit autour d’un nom.' };
}

// On ne demande le noyau que s'il y a un choix à faire.
export const noyauADemander = (nature, indices, jetons) =>
  nature?.noyau !== null && nature?.noyau !== undefined && indices.filter((i) => !jetons[i].ponct).length > 1
  && ['GN', 'GP', 'GAdj', 'GInf', 'GAdv'].includes(nature.code);
