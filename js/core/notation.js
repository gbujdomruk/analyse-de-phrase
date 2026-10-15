// Lecture des corrigés écrits en notation à crochets (voir README) :
//
//   [S Le chat [CN de la voisine]] [V dort] [CC:lieu sur le canapé].
//
// - [FONCTION contenu] : un groupe et sa fonction (S, V, COD, COI, ATS, ATO,
//   CC, CC:temps, CAG, CVI, EPI, CN, APP, CADJ).
//   Un suffixe #n relie les morceaux d'un même groupe coupé en deux :
//   [V#1 A]-t-[S il] [V#1 mangé] ?
// - {TYPE contenu} : une proposition (IND, PRINC, SUB-REL, SUB-CONJ,
//   SUB-CIRC, SUB-INT, SUB-INF, SUB-PART). Inutile pour une phrase simple.
//   Une subordonnée qui a une fonction s'écrit [COD {SUB-CONJ que …}].
// - Les mots hors crochets n'ont pas de fonction (ne… pas, et, ponctuation).

import { decoupe, normalise } from './decoupage.js';
import { FONCTIONS, PROPOSITIONS, GROUPES } from '../data/terminologie.js';

export function litNotation(notation, estMotCompose) {
  let texte = '';
  const pile = [];
  const noeuds = [];
  let i = 0;
  while (i < notation.length) {
    const c = notation[i];
    if (c === '[' || c === '{') {
      const m = notation.slice(i + 1).match(/^(\S+)\s*/);
      if (!m) throw new Error(`Étiquette manquante après « ${c} » (position ${i})`);
      const noeud = analyseEtiquette(m[1], c === '{' ? 'proposition' : 'groupe');
      noeud.debut = texte.length;
      noeud.parent = pile.at(-1) ?? null;
      pile.push(noeud);
      noeuds.push(noeud);
      i += 1 + m[0].length;
    } else if (c === ']' || c === '}') {
      const noeud = pile.pop();
      if (!noeud || (c === ']') !== (noeud.genre === 'groupe')) {
        throw new Error(`« ${c} » ne ferme rien (position ${i})`);
      }
      noeud.fin = texte.length;
      i++;
    } else if (/\s/.test(c)) {
      // Les espaces doublés par la notation (« dort] [CC ») ne comptent qu'une fois.
      if (texte && !texte.endsWith(' ')) texte += ' ';
      i++;
    } else {
      texte += c;
      i++;
    }
  }
  if (pile.length) throw new Error(`Crochet non fermé : ${pile.at(-1).etiquette}`);

  texte = texte.trimEnd();
  const jetons = decoupe(texte, estMotCompose);
  for (const n of noeuds) {
    n.jetons = jetons.filter((j) => j.debut >= n.debut && j.fin <= n.fin).map((j) => j.i);
    if (!n.jetons.length) throw new Error(`Groupe vide : [${n.etiquette}]`);
  }
  return { texte, jetons, noeuds: fusionneMorceaux(noeuds) };
}

function analyseEtiquette(etiquette, genre) {
  // [CC:temps/GN#1 …] : fonction, précision, nature du groupe, lien.
  const [avantLien, lien] = etiquette.split('#');
  const [base, natureGroupe] = avantLien.split('/');
  if (natureGroupe && !GROUPES[natureGroupe]) throw new Error(`Nature de groupe inconnue : ${natureGroupe}`);
  const [fonction, precision] = base.split(':');
  if (genre === 'proposition' && !PROPOSITIONS[fonction]) {
    throw new Error(`Type de proposition inconnu : ${fonction}`);
  }
  if (genre === 'groupe' && !FONCTIONS[fonction]) {
    throw new Error(`Fonction inconnue : ${fonction}`);
  }
  return { genre, etiquette, fonction, precision: precision ?? null, lien: lien ?? null, natureGroupe: natureGroupe ?? null };
}

// [V#1 a] … [V#1 mangé] ne forment qu'un seul groupe.
function fusionneMorceaux(noeuds) {
  const resultat = [];
  const parLien = new Map();
  for (const n of noeuds) {
    if (!n.lien) { resultat.push(n); continue; }
    const cle = `${n.fonction}#${n.lien}`;
    const premier = parLien.get(cle);
    if (premier) {
      premier.jetons = [...premier.jetons, ...n.jetons].sort((a, b) => a - b);
      for (const autre of noeuds) if (autre.parent === n) autre.parent = premier;
    } else {
      parLien.set(cle, n);
      resultat.push(n);
    }
  }
  return resultat;
}

// --- Corrigé structuré ------------------------------------------------------

// Transforme une entrée de la banque en corrigé exploitable :
// propositions, groupes de chaque proposition, natures de chaque mot.
export function construitCorrige(entree, estMotCompose) {
  const { texte, jetons, noeuds } = litNotation(entree.analyse, estMotCompose);

  // Proposition implicite quand la phrase est simple.
  let propositions = noeuds.filter((n) => n.genre === 'proposition');
  if (!propositions.length) {
    const racine = { genre: 'proposition', fonction: 'IND', etiquette: 'IND', parent: null,
      jetons: jetons.filter((j) => !j.ponct).map((j) => j.i) };
    for (const n of noeuds) if (!n.parent) n.parent = racine;
    propositions = [racine];
  }

  const propositionDe = (n) => {
    let p = n.parent;
    while (p && p.genre !== 'proposition') p = p.parent;
    return p;
  };
  const groupes = noeuds.filter((n) => n.genre === 'groupe');
  for (const g of groupes) g.proposition = propositionDe(g);

  const props = propositions.map((p, k) => {
    const dePhrase = groupes.filter((g) => g.proposition === p && estDePhrase(g));
    const verbe = dePhrase.find((g) => g.fonction === 'V');
    // Mots de la proposition sans ceux des subordonnées qu'elle contient.
    const internes = propositions.filter((q) => q !== p && q.jetons.every((i) => p.jetons.includes(i)));
    return {
      numero: k + 1,
      type: p.fonction,
      jetons: p.jetons,
      jetonsPropres: p.jetons.filter((i) => !internes.some((q) => q.jetons.includes(i)) && !jetons[i].ponct),
      // L'infinitive et la participiale n'ont pas de verbe conjugué.
      conjuguee: !['SUB-INF', 'SUB-PART'].includes(p.fonction),
      noeud: p,
      verbe,
      sujet: dePhrase.find((g) => g.fonction === 'S') ?? null,
      // Compléments de la proposition (hors sujet et verbe)
      complements: dePhrase.filter((g) => g.fonction !== 'S' && g.fonction !== 'V'),
      // Groupe qui contient la proposition (subordonnée COD…)
      fonctionDansPhrase: p.parent && p.parent.genre === 'groupe' ? p.parent : null,
    };
  });

  const expansions = groupes.filter((g) => FONCTIONS[g.fonction].place === 'groupe')
    .map((g) => ({ ...g, support: g.parent }));

  return {
    id: entree.id,
    texte,
    jetons,
    propositions: props,
    groupes,
    expansions,
    natures: litNatures(entree.natures, jetons),
    note: entree.note ?? null,
    // Type et formes imposés par l'auteur (sinon calculés).
    type: entree.type ?? null,
    formes: entree.formes ?? null,
  };
}

// Un groupe « de phrase » est rattaché directement à sa proposition,
// et non inclus dans un autre groupe (COD d'un infinitif…).
const estDePhrase = (g) => FONCTIONS[g.fonction].place === 'phrase' && g.parent?.genre === 'proposition';

// La ligne « natures » donne un code par mot (ponctuation exclue).
// « = » rattache un mot au précédent pour former une locution (parce que).
export function litNatures(ligne, jetons) {
  if (!ligne) return null;
  const codes = ligne.trim().split(/\s+/);
  const mots = jetons.filter((j) => !j.ponct && !j.euphonique);
  if (codes.length !== mots.length) {
    throw new Error(`${codes.length} natures pour ${mots.length} mots : ${mots.map((m) => m.texte).join(' ')}`);
  }
  const unites = [];
  codes.forEach((code, k) => {
    if (code === '=') {
      if (!unites.length) throw new Error('« = » ne peut pas commencer la ligne des natures');
      unites.at(-1).jetons.push(mots[k].i);
    } else {
      unites.push({ nature: code, jetons: [mots[k].i] });
    }
  });
  return unites.map((u) => ({ ...u, texte: u.jetons.map((i) => jetons[i].texte).join(' ') }));
}

export const motsDe = (jetons, indices) => indices.map((i) => jetons[i].texte);
export const texteDe = (jetons, indices) => {
  const tri = [...indices].sort((a, b) => a - b);
  return tri.map((i, k) => (k > 0 ? (tri[k - 1] === i - 1 ? jetons[i].avant : ' … ') : '') + jetons[i].texte).join('');
};
export { normalise };
