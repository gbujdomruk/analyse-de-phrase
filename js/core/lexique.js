// Dictionnaire : mots grammaticaux décrits à la main + Lexique 3.83
// (B. New, C. Pallier et al., www.lexique.org, licence CC BY-SA 4.0)
// pour les noms, adjectifs, verbes, adverbes et interjections.

import { MOTS_OUTILS, HOMOGRAPHES_GARDES } from '../data/mots-outils.js';
import { normalise } from './decoupage.js';

let LEXIQUE = null;

export async function chargeLexique(url = 'data/lexique.json') {
  if (LEXIQUE) return;
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`Dictionnaire introuvable (${reponse.status})`);
  LEXIQUE = await reponse.json();
}

// Pour les tests (Node) : on fournit directement le contenu du fichier.
export const installeLexique = (donnees) => { LEXIQUE = donnees; };
export const lexiqueCharge = () => LEXIQUE !== null;

export const estMotCompose = (forme) => forme.includes('-') && Boolean(LEXIQUE?.[forme]);

const MODES = { ind: 'indicatif', sub: 'subjonctif', imp: 'impératif', cnd: 'conditionnel', inf: 'infinitif', par: 'participe' };
const TEMPS = { pre: 'présent', imp: 'imparfait', pas: 'passé simple', fut: 'futur' };
export const MODES_PERSONNELS = new Set(['ind', 'sub', 'imp', 'cnd']);

function litForme(code) {
  const [mode, temps, pn] = code.split('.');
  return {
    mode,
    temps: temps ?? null,
    personne: pn ? Number(pn[0]) : 0,
    nombre: pn ? pn[1] : '',
    // Lexique note « par.pas » pour le participe passé, « par.pre » pour le présent.
    libelle: mode === 'par'
      ? `participe ${temps === 'pas' ? 'passé' : 'présent'}`
      : [MODES[mode], mode === 'inf' ? '' : TEMPS[temps], pn ? `${pn[0]}e pers. ${pn[1] === 's' ? 'sing.' : 'plur.'}` : '']
        .filter(Boolean).join(' '),
  };
}

function litEntree(texte) {
  const [cat, lemme, g, nb, formes, rare] = texte.split('|');
  return {
    n: cat === 'aux' ? 'verbe' : cat === 'nom' ? 'nom.c' : cat,
    auxiliaire: cat === 'aux',
    lemme: lemme || null,
    g: g ?? '', nb: nb ?? '', p: 0,
    formes: formes ? formes.split(',').map(litForme) : [],
    rare: rare === 'r',
    source: 'lexique',
  };
}

// Toutes les analyses possibles d'une forme, mots grammaticaux en premier.
// `debutDePhrase` : la majuscule ne dit alors rien sur le nom propre.
export function analyses(forme, { debutDePhrase = false } = {}) {
  const f = normalise(forme);
  const outils = (MOTS_OUTILS[f] ?? []).map((e) => ({ ...e, source: 'outil', formes: [] }));
  let lex = (LEXIQUE?.[f] ?? '').split(';').filter(Boolean).map(litEntree);
  // Pour un mot grammatical, on écarte les homographes du dictionnaire,
  // sauf ceux qui sont courants (un pas, le son…).
  if (outils.length) lex = lex.filter((e) => !e.rare && (HOMOGRAPHES_GARDES[f] ?? []).includes(e.n));
  // Les verbes : on fusionne verbe et auxiliaire du même lemme.
  const fusion = [];
  for (const e of lex) {
    const meme = fusion.find((x) => x.n === e.n && x.lemme === e.lemme && x.n === 'verbe');
    if (meme) {
      meme.auxiliaire ||= e.auxiliaire;
      for (const fo of e.formes) if (!meme.formes.some((m) => m.libelle === fo.libelle)) meme.formes.push(fo);
    } else fusion.push(e);
  }
  const resultat = [...outils, ...fusion.sort((a, b) => a.rare - b.rare)];
  const majuscule = /^\p{Lu}/u.test(forme);
  if (majuscule && (!debutDePhrase || !resultat.length)) {
    resultat.unshift({ n: 'nom.p', g: '', nb: 's', p: 3, formes: [], source: 'majuscule' });
  }
  return resultat;
}

// Natures possibles (codes distincts), dans l'ordre de fréquence.
export function naturesPossibles(forme, options) {
  const codes = [];
  for (const a of analyses(forme, options)) if (!codes.includes(a.n)) codes.push(a.n);
  return codes;
}

// Formes conjuguées à un mode personnel (indicatif, subjonctif…).
export function formesConjuguees(forme) {
  return analyses(forme)
    .filter((a) => a.n === 'verbe')
    .flatMap((a) => a.formes.filter((f) => MODES_PERSONNELS.has(f.mode)).map((f) => ({ ...f, lemme: a.lemme, auxiliaire: a.auxiliaire })));
}

export function formesNonConjuguees(forme) {
  return analyses(forme)
    .filter((a) => a.n === 'verbe')
    .flatMap((a) => a.formes.filter((f) => !MODES_PERSONNELS.has(f.mode)).map((f) => ({ ...f, lemme: a.lemme })));
}

export const lemmesVerbaux = (forme) => [...new Set(analyses(forme).filter((a) => a.n === 'verbe').map((a) => a.lemme))];

// Infinitif d'une forme verbale (le plus fréquent), pour les messages.
export const infinitif = (forme) => lemmesVerbaux(forme)[0] ?? null;
