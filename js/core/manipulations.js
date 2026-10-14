// Manipulations syntaxiques : on fabrique la phrase transformée pour que
// l'élève puisse juger lui-même si elle reste correcte.

import { FORME_TONIQUE } from '../data/mots-outils.js';
import { analyses } from './lexique.js';
import { normalise } from './decoupage.js';

const FIN = new Set(['.', '!', '?', '…', '...']);

// Assemble des jetons (ou des morceaux de texte) en une phrase propre.
function assemble(morceaux) {
  let s = '';
  let precedent = null;
  for (const m of morceaux) {
    const t = typeof m === 'string' ? m : m.texte;
    // Deux jetons voisins dans la phrase d'origine restent collés (dis-moi).
    const colle = typeof m !== 'string' && precedent && precedent.i === m.i - 1 && m.avant !== ' ';
    precedent = typeof m === 'string' ? null : m;
    if (!s) s = t;
    else if (/^[,.…!?;:»)]/.test(t) && !/^[!?;:»]/.test(t)) s += t;
    else if (/^[!?;:»]/.test(t)) s += ' ' + t;
    else if (/['’]$/.test(s) || s.endsWith('-') || (colle && !/[,;:]$/.test(s))) s += t;
    else s += ' ' + t;
  }
  return s
    .replace(/^[\s,;:]+/, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*([.…!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const minuscule = (j) => ({ ...j, texte: j.texte.charAt(0).toLowerCase() + j.texte.slice(1) });

// Met en minuscule le premier mot d'une phrase quand il change de place,
// sauf s'il peut être un nom propre : on ne le fait que pour les mots
// grammaticaux et les adverbes (Le, Il, Hier…), jamais pour « Marie ».
function minusculeSiPossible(jeton) {
  if (!jeton || jeton.ponct) return jeton;
  const sur = analyses(jeton.texte.toLowerCase()).some((a) => a.source === 'outil' || a.n === 'adv');
  return sur ? minuscule(jeton) : jeton;
}

function sansMajusculeInitiale(jetons) {
  if (!jetons.length) return jetons;
  return [minusculeSiPossible(jetons[0]), ...jetons.slice(1)];
}

// « Le chat dort sur le canapé. » → « Le chat dort. »
export function supprime(jetons, indices) {
  const garde = new Set(indices);
  const restants = jetons.filter((j) => !garde.has(j.i));
  const debutSupprime = jetons.find((j) => !j.ponct)?.i === Math.min(...indices);
  const morceaux = debutSupprime ? sansMajusculeInitiale(restants) : restants;
  return majuscule(assemble(morceaux));
}

// « Le chat dort sur le canapé. » → « Sur le canapé, le chat dort. »
export function deplaceEnTete(jetons, indices) {
  const garde = new Set(indices);
  const groupe = jetons.filter((j) => garde.has(j.i) && !(j.ponct && j.texte === ','));
  const reste = sansMajusculeInitiale(jetons.filter((j) => !garde.has(j.i)));
  return majuscule(assemble([...groupe, ',', ...reste]));
}

// Question pour trouver le sujet : « Qui est-ce qui dort ? »
export function questionSujet(jetons, verbe) {
  const v = texteVerbe(jetons, verbe);
  return [`Qui est-ce qui ${v} ?`, `Qu'est-ce qui ${v} ?`];
}

// Encadrement : « C'est le chat de la voisine qui dort sur le canapé. »
// `verbe` = indices du verbe conjugué ; `sujet` = indices du sujet proposé.
export function encadreSujet(jetons, sujet, verbe) {
  const s = new Set(sujet);
  let mots = jetons.filter((j) => s.has(j.i));
  if (mots.length === 1 && FORME_TONIQUE[normalise(mots[0].texte)]) {
    mots = [{ ...mots[0], texte: FORME_TONIQUE[normalise(mots[0].texte)] }];
  } else {
    mots = sansMajusculeInitiale(mots);
  }
  const pluriel = sujetPluriel(mots);
  const debutVerbe = Math.min(...verbe);
  const suite = retireInversion(jetons.filter((j) => j.i >= debutVerbe && !s.has(j.i) && j.texte !== '-t-'));
  if (suite.length) suite[0] = minuscule(suite[0]);
  return assemble([pluriel ? 'Ce sont' : "C'est", ...mots, 'qui', ...suite]);
}

// Dans « Où vont-ils ? », on retire le pronom inversé « -ils ».
function retireInversion(jetons) {
  return jetons.filter((j) => !(j.avant === '-' && FORME_TONIQUE[normalise(j.texte)]));
}

function sujetPluriel(mots) {
  const t = mots.map((m) => normalise(m.texte));
  if (t.includes('et')) return true;
  if (t.length === 1) return ['eux', 'elles'].includes(t[0]);
  return ['les', 'des', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'plusieurs', 'quelques'].includes(t[0]);
}

export function texteVerbe(jetons, verbe) {
  return verbe.map((i) => jetons[i]).filter((j) => j.texte !== '-t-').map((j) => j.texte.toLowerCase()).join(' ');
}

export const estPonctuationFinale = (j) => j.ponct && FIN.has(j.texte);
