// Identité d'un verbe conjugué : infinitif, mode, temps, personne, voix.
// Tout vient du dictionnaire Lexique ; une forme ambiguë (« porte » : présent
// de l'indicatif ou du subjonctif) donne plusieurs réponses acceptées.

import { analyses } from './lexique.js';
import { MODES_PERSONNELS } from './lexique.js';
import { TEMPS_VERBAUX } from '../data/terminologie.js';
import { normalise } from './decoupage.js';

// Temps simple de l'auxiliaire → temps composé du verbe.
const COMPOSE = { 'ind.pre': 'ind.pc', 'ind.imp': 'ind.pqp', 'ind.pas': 'ind.pa', 'ind.fut': 'ind.fa', 'cnd.pre': 'cnd.cp', 'sub.pre': 'sub.sp', 'sub.imp': 'sub.spqp', 'imp.pre': 'imp.ip' };
const REFLECHIS = new Set(['me', "m'", 'te', "t'", 'se', "s'", 'nous', 'vous']);

function formesPersonnelles(texte, lemmes = null) {
  return analyses(texte)
    .filter((a) => a.n === 'verbe' && (!lemmes || lemmes.includes(a.lemme)))
    .flatMap((a) => a.formes.filter((f) => MODES_PERSONNELS.has(f.mode)).map((f) => ({ ...f, lemme: a.lemme })));
}

const participePasse = (texte) => analyses(texte).filter((a) => a.n === 'verbe')
  .flatMap((a) => a.formes.filter((f) => f.mode === 'par' && f.temps === 'pas').map(() => a.lemme));

// verbe : indices des mots du verbe ; sujet : { personne, nombre } ou null
// (pas de sujet : impératif) ; passif : le verbe est à la voix passive.
export function identiteVerbe(jetons, verbe, { sujet = undefined, passif = false } = {}) {
  const mots = verbe.map((i) => jetons[i]).filter((j) => !j.euphonique && !j.ponct && !REFLECHIS.has(normalise(j.texte)));
  if (!mots.length) return null;
  const pronominal = verbe.some((i) => REFLECHIS.has(normalise(jetons[i].texte)));
  let possibilites;
  let infinitifs;
  let compose = false;
  if (mots.length === 1) {
    const formes = formesPersonnelles(mots[0].texte);
    // « suis » : être avant suivre, l'auxiliaire est le plus fréquent.
    infinitifs = [...new Set(formes.map((f) => f.lemme))].sort((a, b) => ['être', 'avoir'].includes(b) - ['être', 'avoir'].includes(a));
    possibilites = formes.map((f) => ({ mode: f.mode, temps: f.temps, personne: f.personne, nombre: f.nombre, lemme: f.lemme }));
  } else {
    // Auxiliaire (premier mot) + participe passé (dernier mot).
    const aux = formesPersonnelles(mots[0].texte, ['avoir', 'être']);
    infinitifs = [...new Set(participePasse(mots.at(-1).texte))];
    // Voix passive au temps simple (« est attrapée ») : le temps est celui de « être ».
    const simplePassif = passif && mots.length === 2;
    compose = !simplePassif;
    possibilites = aux.map((f) => {
      const cle = `${f.mode}.${f.temps}`;
      const [mode, temps] = (simplePassif ? cle : COMPOSE[cle] ?? cle).split('.');
      return { mode, temps, personne: f.personne, nombre: f.nombre };
    });
  }
  // Le sujet permet de lever l'ambiguïté sur la personne et le mode.
  if (sujet === null) {
    const imp = possibilites.filter((p) => p.mode === 'imp');
    if (imp.length) possibilites = imp;
  } else if (sujet) {
    const accord = possibilites.filter((p) => p.mode !== 'imp' && p.personne === sujet.personne && (!sujet.nombre || p.nombre === sujet.nombre));
    if (accord.length) possibilites = accord;
  }
  // L'indicatif d'abord (forme la plus probable pour les messages).
  const ORDRE = { ind: 0, cnd: 1, sub: 2, imp: 3 };
  possibilites.sort((a, b) => ORDRE[a.mode] - ORDRE[b.mode]);
  // Dédoublonnage.
  const vues = new Set();
  possibilites = possibilites.filter((p) => {
    const cle = `${p.mode}.${p.temps}.${p.personne}${p.nombre}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
  return { infinitifs, pronominal, possibilites, compose, voix: passif ? 'passive' : 'active' };
}

const DU_MODE = { ind: 'de l’indicatif', cnd: 'du conditionnel', sub: 'du subjonctif', imp: 'de l’impératif' };
export const libelleTemps = (mode, temps) => `${TEMPS_VERBAUX[mode]?.temps[temps] ?? temps} ${DU_MODE[mode] ?? mode}`;

export const libellePersonne = (p, n) => `${p}${p === 1 ? 're' : 'e'} personne du ${n === 'p' ? 'pluriel' : 'singulier'}`;

// Vérifie chaque élément de la réponse ; renvoie une liste de remarques.
export function verifieIdentite(id, reponse) {
  const r = {};
  if ('infinitif' in reponse) {
    const saisi = normalise(reponse.infinitif.trim()).replace(/^(se |s')/, '');
    r.infinitif = id.infinitifs.some((l) => normalise(l) === saisi);
  }
  if ('mode' in reponse) r.mode = id.possibilites.some((p) => p.mode === reponse.mode);
  if ('temps' in reponse) r.temps = id.possibilites.some((p) => p.mode === reponse.mode && p.temps === reponse.temps);
  if ('personne' in reponse) {
    r.personne = id.possibilites.some((p) => p.mode === reponse.mode && p.temps === reponse.temps
      && p.personne === reponse.personne && p.nombre === reponse.nombre);
  }
  return r;
}
