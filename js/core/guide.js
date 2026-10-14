// Mode « Analyser ma phrase » : aucun corrigé n'est disponible. Le guide
// fait appliquer à l'élève les manipulations de la méthode (supprimer,
// déplacer, encadrer, remplacer) et en déduit la conclusion de façon
// certaine à partir de ses réponses. Le dictionnaire sert à signaler les
// incohérences (un mot qui ne peut pas être un verbe, un accord impossible).

import { INTRODUCTEURS_PREPOSITIONNELS, LOCUTIONS, MOTS_OUTILS } from '../data/mots-outils.js';
import { VERBES_ATTRIBUTIFS, CIRCONSTANCES, auNiveau } from '../data/terminologie.js';
import { analyses, formesConjuguees, formesNonConjuguees, lemmesVerbaux, naturesPossibles } from './lexique.js';
import { normalise, recompose } from './decoupage.js';
import * as M from './manipulations.js';

const NEGATION = new Set(['ne', "n'", 'pas', 'plus', 'jamais', 'point', 'guère', 'rien']);
const est = (j, ...formes) => formes.includes(normalise(j.texte));
const mots = (jetons) => jetons.filter((j) => !j.ponct);
const cite = (jetons, indices) => `« ${indices.map((i) => jetons[i].texte).join(' ').replace(/' /g, "'")} »`;

// --- Verbes ------------------------------------------------------------------

// Mots qui peuvent être des verbes conjugués d'après le dictionnaire.
// `certain` : le mot n'a pas d'autre nature possible.
export function candidatsVerbes(jetons) {
  return mots(jetons).flatMap((j) => {
    if (!formesConjuguees(j.texte).length) return [];
    const natures = naturesPossibles(j.texte, { debutDePhrase: j.i === 0 });
    return [{ i: j.i, certain: natures.every((n) => n === 'verbe') }];
  });
}

// Regroupe les mots sélectionnés en verbes : « a » + « mangé » = un verbe.
// Entre l'auxiliaire et le participe, on tolère la négation, les adverbes
// et le sujet inversé (« n'a pas mangé », « a totalement oublié »,
// « a-t-il mangé »). `etats` : participes que l'élève a déclarés attributs
// (« je suis égarée » au sens de « perdue ») ; ils ne font pas partie du verbe.
export function regroupeVerbes(jetons, selection, etats = new Set()) {
  const tri = [...new Set(selection)].filter((i) => !etats.has(i)).sort((a, b) => a - b);
  const verbes = [];
  for (const i of tri) {
    const dernier = verbes.at(-1);
    if (dernier && rattacheAuxiliaire(jetons, dernier, i)) { dernier.push(i); continue; }
    verbes.push([i]);
  }
  return verbes;
}

function rattacheAuxiliaire(jetons, verbe, i) {
  const entre = jetons.slice(verbe.at(-1) + 1, i);
  const lie = entre.every((j) => !j.ponct && (NEGATION.has(normalise(j.texte)) || j.euphonique
    || (j.avant === '-' && analyses(j.texte).some((a) => a.n === 'pro.pers'))
    || naturesPossibles(j.texte).includes('adv')));
  const auxiliaire = estFormeAuxiliaire(jetons[verbe.at(-1)]) || estFormeAuxiliaire(jetons[verbe[0]]);
  const participe = formesNonConjuguees(jetons[i].texte).some((f) => f.mode === 'par');
  return lie && auxiliaire && participe;
}

// Verbes qui forment leurs temps composés avec « être » (je suis parti).
const VERBES_EN_ETRE = new Set([
  'aller', 'venir', 'revenir', 'devenir', 'redevenir', 'parvenir', 'survenir', 'intervenir', 'advenir',
  'partir', 'repartir', 'arriver', 'naître', 'mourir', 'décéder', 'rester', 'tomber', 'retomber',
  'entrer', 'rentrer', 'sortir', 'ressortir', 'monter', 'remonter', 'descendre', 'redescendre',
  'retourner', 'passer', 'repasser', 'apparaître',
]);
const PRONOMS_REFLECHIS = new Set(['me', "m'", 'te', "t'", 'se', "s'", 'nous', 'vous']);

// « être » + participe passé d'un verbe qui ne se conjugue pas avec « être » :
// temps composé pronominal, voix passive… ou participe employé comme adjectif
// attribut (« je suis égarée » = perdue). Seul l'élève peut trancher.
export function ambiguitesEtre(jetons, selection) {
  const resultat = [];
  for (const v of regroupeVerbes(jetons, selection)) {
    if (v.length < 2) continue;
    const aux = v.slice(0, -1).find((i) => lemmesVerbaux(jetons[i].texte).includes('être'));
    if (aux === undefined || v.slice(0, -1).some((i) => lemmesVerbaux(jetons[i].texte).includes('avoir'))) continue;
    const participe = v.at(-1);
    if (lemmesVerbaux(jetons[participe].texte).some((l) => VERBES_EN_ETRE.has(l))) continue;
    const avant = jetons.slice(0, aux).reverse().find((j) => !j.ponct && !NEGATION.has(normalise(j.texte)));
    if (avant && PRONOMS_REFLECHIS.has(normalise(avant.texte))) continue; // je me suis égarée
    resultat.push({ auxiliaire: aux, participe, verbe: v });
  }
  return resultat;
}

const estFormeAuxiliaire = (j) => analyses(j.texte).some((a) => a.n === 'verbe' && ['avoir', 'être'].includes(a.lemme) && a.formes.length);

// Remarques sur les verbes choisis par l'élève (rien n'est bloquant).
export function remarquesVerbes(jetons, selection) {
  const remarques = [];
  for (const i of selection) {
    const j = jetons[i];
    if (NEGATION.has(normalise(j.texte))) {
      remarques.push({ i, type: 'erreur', texte: `« ${j.texte} » sert à la négation : il encadre le verbe mais n’en fait pas partie.` });
      continue;
    }
    const conj = formesConjuguees(j.texte);
    const nonConj = formesNonConjuguees(j.texte);
    if (conj.length) continue;
    if (nonConj.length) {
      const f = nonConj[0];
      const participe = f.mode === 'par';
      const auxAvant = participe && regroupeVerbes(jetons, selection).some((v) => v.length > 1 && v.includes(i));
      if (!auxAvant) {
        remarques.push({ i, type: 'attention', texte: `« ${j.texte} » est un ${f.libelle} (verbe ${f.lemme}) : seul, il n’est pas conjugué.${participe ? ' Est-il accompagné d’un auxiliaire (avoir, être) ?' : ''}` });
      }
      continue;
    }
    remarques.push({ i, type: 'erreur', texte: `« ${j.texte} » n’est pas une forme de verbe dans le dictionnaire. Change le temps de la phrase : ce mot change-t-il ?` });
  }
  // Auxiliaire sélectionné sans son participe.
  for (const v of regroupeVerbes(jetons, selection)) {
    if (v.length !== 1 || !estFormeAuxiliaire(jetons[v[0]])) continue;
    const suite = jetons.slice(v[0] + 1, v[0] + 5).find((j) => !j.ponct && !NEGATION.has(normalise(j.texte)) && !j.euphonique
      && j.avant !== '-' && !naturesPossibles(j.texte).includes('adv'));
    if (!suite || selection.includes(suite.i) || !formesNonConjuguees(suite.texte).some((f) => f.mode === 'par' && f.temps === 'pas')) continue;
    const etre = lemmesVerbaux(jetons[v[0]].texte).includes('être') && !lemmesVerbaux(jetons[v[0]].texte).includes('avoir');
    if (etre && !lemmesVerbaux(suite.texte).some((l) => VERBES_EN_ETRE.has(l))) {
      remarques.push({ i: v[0], type: 'attention', texte: `Après « ${jetons[v[0]].texte} », « ${suite.texte} » est un participe passé. S’il fait partie du verbe (voix passive, comme « est mangée par… »), sélectionne-le aussi. S’il décrit l’état du sujet, comme un adjectif (« je suis perdue, fatiguée »), c’est un attribut du sujet : garde ton choix.` });
    } else if (!analyses(suite.texte).some((a) => a.n === 'adj' && !a.rare)) {
      remarques.push({ i: v[0], type: 'attention', texte: `« ${jetons[v[0]].texte} ${suite.texte} » est peut-être un verbe à un temps composé : sélectionne aussi le participe « ${suite.texte} ».` });
    }
  }
  return remarques;
}

// --- Propositions ------------------------------------------------------------------

const estSubordonnant = (j) => {
  const n = naturesPossibles(j.texte);
  return !j.ponct && n.some((x) => x === 'conj.sub' || x === 'pro.rel') && !n.includes('pro.pers');
};
const estCoordination = (j) => !j.ponct && naturesPossibles(j.texte).every((x) => x === 'conj.coord');

// Propose une délimitation des propositions (l'élève la confirme ou la
// corrige). Renvoie, pour chaque verbe, les indices des mots de sa
// proposition ; une proposition peut être coupée par une autre qu'elle
// contient (« Le chat [qui dort] appartient à ma voisine »).
// Entre deux verbes, on cherche :
// - une conjonction de coordination : elle sépare deux propositions et
//   n'appartient à aucune ;
// - un mot subordonnant (qui, que, dont, où, quand…) : il ouvre une
//   proposition emboîtée dans la précédente ;
// - une ponctuation : elle ferme la proposition emboîtée en cours, ou
//   sépare deux propositions juxtaposées ;
// - rien : la proposition emboîtée s'arrête avant le verbe suivant, qui
//   appartient à la proposition qui la contient (« Le livre que tu m'as
//   prêté est passionnant »).
export function delimitePropositions(jetons, verbes) {
  const ordre = verbes.map((v, k) => ({ k, debut: Math.min(...v), fin: Math.max(...v) })).sort((a, b) => a.debut - b.debut);
  if (!ordre.length) return [];
  const props = [];
  const nouvelle = (k = null) => { const p = { verbes: k === null ? [] : [k], mots: [] }; props.push(p); return p; };
  const pile = [];
  const ajoute = (p, de, a) => { for (let i = de; i < a; i++) if (!jetons[i].ponct) p.mots.push(i); };

  // Avant le premier verbe : un subordonnant (sauf en tête de phrase) ouvre
  // une proposition emboîtée dans une proposition dont le verbe vient après.
  const avant = jetons.slice(0, ordre[0].debut);
  const sub = [...avant].reverse().find((j) => estSubordonnant(j) && j.i > 0);
  let courante = nouvelle(ordre[0].k);
  if (sub) {
    const parent = nouvelle();
    ajoute(parent, 0, sub.i);
    pile.push(parent);
    ajoute(courante, sub.i, ordre[0].debut);
  } else ajoute(courante, 0, ordre[0].debut);

  ordre.forEach((o, n) => {
    ajoute(courante, o.debut, o.fin + 1);
    const suivant = ordre[n + 1];
    const fin = suivant ? suivant.debut : jetons.length;
    if (!suivant) { ajoute(courante, o.fin + 1, fin); return; }
    const entre = jetons.slice(o.fin + 1, fin);
    const coord = [...entre].reverse().find(estCoordination);
    const subord = [...entre].reverse().find(estSubordonnant);
    const ponct = [...entre].reverse().find((j) => [',', ';', ':'].includes(j.texte));

    if (subord && (!coord || subord.i > coord.i)) {
      // Un subordonnant ouvre une proposition emboîtée…
      if (coord && subord.i === coord.i + 1) {
        // … coordonnée à la précédente (« qui dort et qui ronronne ») : même niveau.
        ajoute(courante, o.fin + 1, coord.i);
      } else {
        ajoute(courante, o.fin + 1, subord.i);
        pile.push(courante);
      }
      courante = nouvelle(suivant.k);
      ajoute(courante, subord.i, fin);
    } else if (coord) {
      ajoute(courante, o.fin + 1, coord.i);
      pile.length = 0;
      courante = nouvelle(suivant.k);
      ajoute(courante, coord.i + 1, fin);
    } else if (ponct) {
      ajoute(courante, o.fin + 1, ponct.i);
      // La virgule ferme la proposition emboîtée : on revient à celle qui la
      // contient si son verbe n'est pas encore passé (« Dans la forêt où vivent
      // les loups, les lapins se cachent »), sinon les propositions sont juxtaposées.
      const parent = pile.pop();
      if (parent && !parent.verbes.length) { courante = parent; parent.verbes.push(suivant.k); } else courante = nouvelle(suivant.k);
      ajoute(courante, ponct.i + 1, fin);
    } else if (pile.length) {
      // Rien entre les deux verbes : l'emboîtée s'arrête, on revient au parent.
      ajoute(courante, o.fin + 1, fin);
      const parent = pile.pop();
      parent.verbes.push(suivant.k);
      courante = parent;
    } else {
      // Aucune frontière repérable : on ne sépare pas (l'élève corrigera).
      ajoute(courante, o.fin + 1, fin);
      courante.verbes.push(suivant.k);
    }
  });

  const resultat = new Array(verbes.length);
  for (const p of props) for (const k of p.verbes) resultat[k] = [...new Set(p.mots)].sort((a, b) => a - b);
  return resultat;
}

// --- Vérification de la sélection avant les tests ----------------------------------

// Mots-outils qui n'ont pas de fonction par eux-mêmes (terminologie I.1.6).
const SANS_FONCTION = (n) => n === 'prep' || n.startsWith('det') || n === 'conj.coord' || n === 'conj.sub';
// « le » peut être déterminant ou pronom : on suit l'indice de contexte
// (suivi d'un nom → déterminant).
function natureProbable(jetons, j) {
  const n = naturesPossibles(j.texte, { debutDePhrase: j.i === 0 });
  if (n.length > 1 && !n.every(SANS_FONCTION)) return candidatsNature(jetons, { jetons: [j.i], locution: null }).probable;
  return n[0];
}
const natureOutil = (jetons, j) => {
  const n = natureProbable(jetons, j);
  return n && SANS_FONCTION(n) ? n : null;
};

// Les tests de suppression et de déplacement n'ont de sens que sur un groupe
// entier. Renvoie null si la sélection convient, sinon une explication et,
// si possible, le groupe que l'élève voulait sans doute sélectionner.
// `interdits` : mots déjà analysés (verbe, sujet, autres groupes).
export function verifieSelection(jetons, groupe, interdits = new Set()) {
  const ind = [...groupe].filter((i) => !jetons[i].ponct).sort((a, b) => a - b);
  if (!ind.length) return null;
  const premier = jetons[ind[0]];
  const dernier = jetons[ind.at(-1)];
  const trous = jetons.slice(ind[0], ind.at(-1) + 1).filter((j) => !j.ponct && !ind.includes(j.i));
  if (trous.length) {
    return { message: `Ta sélection n’est pas d’un seul tenant (il manque ${trous.map((j) => `« ${j.texte} »`).join(', ')}) : un groupe est formé de mots qui se suivent.`, suggestion: null };
  }
  const mot = normalise(premier.texte);
  if (ind.length === 1 && NEGATION.has(mot)) {
    return { message: `« ${premier.texte} » sert à la négation : il n’a pas de fonction. Tu n’as pas besoin de l’analyser.`, suggestion: null };
  }
  if (ind.length === 1 && natureOutil(jetons, premier)) {
    const n = natureOutil(jetons, premier);
    if (n === 'conj.coord') {
      return { message: `« ${premier.texte} » est une conjonction de coordination : elle relie deux groupes ou deux propositions et n’a pas de fonction. Tu n’as pas besoin de l’analyser.`, suggestion: null };
    }
    if (n === 'conj.sub') {
      return { message: `« ${premier.texte} » est une conjonction de subordination : seule, elle n’a pas de fonction. Elle introduit une proposition subordonnée : sélectionne toute la subordonnée pour trouver sa fonction.`, suggestion: null };
    }
    const suggestion = etend(jetons, ind[0], interdits, n);
    const quoi = n === 'prep' ? 'une préposition' : 'un déterminant';
    const role = n === 'prep' ? 'Elle introduit un groupe' : 'Il introduit un nom';
    return {
      message: `« ${premier.texte} » est ${quoi} : seul, ce mot n’a pas de fonction. ${role}, et c’est ce groupe entier qui a une fonction.`,
      suggestion: suggestion.length > 1 ? suggestion : null,
    };
  }
  if (ind.length > 1 && natureOutil(jetons, dernier)) {
    const suite = etend(jetons, dernier.i, interdits, natureOutil(jetons, dernier));
    return {
      message: `Ton groupe se termine par « ${dernier.texte} », qui annonce un mot ou un groupe : il est incomplet.`,
      suggestion: suite.length > 1 ? [...ind, ...suite.slice(1)] : null,
    };
  }
  // Groupe qui commence juste après une préposition : « dans [le jardin] ».
  const avant = jetons[ind[0] - 1];
  if (avant && !avant.ponct && !interdits.has(avant.i) && natureProbable(jetons, avant) === 'prep') {
    return {
      message: `Juste avant ton groupe, il y a la préposition « ${avant.texte} ». Un complément introduit par une préposition la contient : le groupe commence sans doute par « ${avant.texte} ».`,
      suggestion: [avant.i, ...ind],
    };
  }
  return null;
}

// Le groupe appartient-il à la proposition d'un autre verbe ? On accepte une
// subordonnée entière (elle contient son propre verbe) : « Je crois [que Léa
// viendra] ». Renvoie l'indice du verbe concerné, ou -1.
export function autreProposition(groupe, propositions, verbes, k) {
  const ind = groupe;
  return propositions.findIndex((p, n) => n !== k && p && ind.every((i) => p.includes(i))
    && !verbes[n].some((i) => ind.includes(i)));
}

// Prolonge une sélection à partir d'une préposition (jusqu'à la ponctuation,
// une conjonction de coordination ou un mot déjà analysé) ou d'un déterminant
// (jusqu'au nom).
function etend(jetons, debut, interdits, nature) {
  const groupe = [debut];
  for (const j of jetons.slice(debut + 1)) {
    if (j.ponct || interdits.has(j.i) || naturesPossibles(j.texte).every((n) => n === 'conj.coord')) break;
    groupe.push(j.i);
    if (nature !== 'prep' && naturesPossibles(j.texte).some((n) => n.startsWith('nom'))) break;
  }
  return groupe;
}

// --- Sujet et accord ------------------------------------------------------------

// Personnes et nombres possibles pour un sujet (« le chat » → 3e sing.).
export function traitsSujet(jetons, indices) {
  const ms = indices.map((i) => jetons[i]).filter((j) => !j.ponct);
  if (!ms.length) return null;
  const t = ms.map((j) => normalise(j.texte));
  if (t.includes('et') || t.includes('ni')) {
    const personne = t.some((m) => ['moi', 'je', 'nous'].includes(m)) ? 1 : t.some((m) => ['toi', 'tu', 'vous'].includes(m)) ? 2 : 3;
    return { personne, nombre: 'p' };
  }
  if (ms.length === 1) {
    const pro = (MOTS_OUTILS[t[0]] ?? []).find((e) => e.n === 'pro.pers' || e.n === 'pro.dem' || e.n === 'pro.indef');
    if (t[0] === 'qui' || t[0] === 'que') return null; // l'accord dépend de l'antécédent
    if (pro) return { personne: pro.p || 3, nombre: pro.nb || null };
    const nom = analyses(ms[0].texte).find((a) => a.n.startsWith('nom'));
    return { personne: 3, nombre: nom?.nb || null };
  }
  // Groupe nominal : le déterminant donne le nombre.
  const det = (MOTS_OUTILS[t[0]] ?? []).find((e) => e.n.startsWith('det'));
  if (det?.nb) return { personne: 3, nombre: det.nb };
  const nom = ms.map((j) => analyses(j.texte).find((a) => a.n === 'nom.c')).find(Boolean);
  return { personne: 3, nombre: nom?.nb || null };
}

// Vérifie l'accord sujet-verbe ; renvoie un message si l'accord est impossible.
export function verifieAccord(jetons, sujet, verbe) {
  const traits = traitsSujet(jetons, sujet);
  if (!traits) return null;
  const formes = formesConjuguees(jetons[verbe[0]].texte);
  if (!formes.length) return null;
  const compatibles = formes.filter((f) => f.personne === traits.personne && (!traits.nombre || f.nombre === traits.nombre));
  if (compatibles.length) return null;
  const f = formes[0];
  const nb = (n) => (n === 'p' ? 'pluriel' : 'singulier');
  return `Attention à l’accord : « ${jetons[verbe[0]].texte} » est à la ${f.personne}e personne du ${nb(f.nombre)}, alors que ${cite(jetons, sujet)} est à la ${traits.personne}e personne${traits.nombre ? ` du ${nb(traits.nombre)}` : ''}. Le sujet commande l’accord du verbe : vérifie ton choix.`;
}

// --- Fonctions des groupes : arbre de décision ------------------------------------

// Contexte : { jetons, verbe: indices, sujet: indices, groupe: indices,
//              niveau, autres: [{ fonction, jetons }] déjà analysés }.
// Chaque question a des réponses ; chaque réponse mène à une autre question
// ou à une conclusion. On garde le chemin pour justifier la conclusion.

export function premiereQuestion(ctx) {
  return questionSuivante(ctx, []);
}

export function questionSuivante(ctx, chemin) {
  const r = Object.fromEntries(chemin.map((c) => [c.question, c.reponse]));
  const { jetons, groupe, verbe } = ctx;
  const premier = jetons[groupe[0]];
  const premierMot = normalise(premier.texte);
  const seul = groupe.filter((i) => !jetons[i].ponct).length === 1;

  // Pronoms placés devant le verbe : on raisonne autrement (pas de déplacement).
  const pronom = seul && analyses(premier.texte).some((a) => a.n === 'pro.pers' || a.n === 'pro.adv') && groupe[0] < verbe[0];
  if (pronom) return questionPronom(ctx, r, premierMot);

  if (!('supprime' in r)) {
    return {
      id: 'supprime',
      titre: 'Test de suppression',
      texte: `Voici ${ctx.proposition ? 'la proposition' : 'la phrase'} sans le groupe. Est-elle correcte et garde-t-elle son sens principal ?`,
      exemple: M.supprime(champDe(ctx), groupe),
      contexte: contexteProposition(ctx),
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (!('deplace' in r)) {
    const d = M.deplace(champDe(ctx), groupe);
    const ou = d.ou === 'fin' ? 'le groupe est déjà en tête : le voici déplacé à la fin' : 'avec le groupe déplacé en tête';
    return {
      id: 'deplace',
      titre: 'Test de déplacement',
      texte: `Voici ${ctx.proposition ? 'la proposition' : 'la phrase'} ; ${ou}. Est-elle correcte, et dit-elle la même chose ?`,
      exemple: d.texte,
      contexte: contexteProposition(ctx),
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (r.supprime === 'oui' && r.deplace === 'oui') {
    // Un adverbe détachable n'est pas forcément un complément circonstanciel :
    // il peut commenter la phrase (heureusement) ou la relier à ce qui
    // précède (justement, pourtant). Terminologie 2020, II.2.7 et II.3.5.
    const adverbe = seul && naturesPossibles(premier.texte).includes('adv');
    if ((adverbe || r.circonstance === 'aucune') && !('role' in r)) {
      return {
        id: 'role',
        titre: 'Circonstance, avis ou lien ?',
        texte: `Que fait ${cite(jetons, groupe)} dans ta phrase ?`,
        reponses: [
          { id: 'circonstance', texte: 'Il indique une circonstance : quand ? où ? comment ? pourquoi ?…' },
          { id: 'avis', texte: 'Il donne l’avis de celui qui parle ou son degré de certitude (heureusement, peut-être, sans doute, franchement…)' },
          { id: 'lien', texte: 'Il relie la phrase à ce qui a été dit avant (justement, pourtant, d’ailleurs, en effet…)' },
        ],
      };
    }
    if (r.role === 'avis') {
      return conclusion('MOD', 'modalisateur (fonction énonciative)', [
        'Le mot ne donne pas une circonstance : il exprime l’avis ou la certitude de celui qui parle.',
        'Ce n’est pas une fonction dans la phrase mais un commentaire sur la phrase : « Bizarrement, elle a agi » = « elle a agi, et je trouve cela bizarre ».',
      ]);
    }
    if (r.role === 'lien') {
      return conclusion('CONN', 'connecteur (fonction textuelle)', [
        'Le mot ne donne pas une circonstance : il relie la phrase à ce qui a été dit avant, comme une conjonction de coordination.',
        'Il n’a donc pas de fonction dans la phrase elle-même.',
      ]);
    }
    if (!('circonstance' in r)) {
      return {
        id: 'circonstance',
        titre: 'Le sens du complément',
        texte: 'Le groupe peut être supprimé et déplacé : c’est un complément circonstanciel. À quelle question répond-il ?',
        reponses: Object.entries(CIRCONSTANCES).filter(([, c]) => auNiveau(c.niveau, ctx.niveau))
          .map(([id, c]) => ({ id, texte: `${c.question} (${c.nom})` }))
          .concat([{ id: 'aucune', texte: 'À aucune de ces questions' }]),
      };
    }
    const circ = CIRCONSTANCES[r.circonstance];
    return conclusion('CC', circ ? `complément circonstanciel de ${circ.nom}` : 'complément circonstanciel', [
      'On peut le supprimer : il n’est pas indispensable.',
      'On peut le déplacer : il n’est pas lié au verbe.',
    ], circ ? r.circonstance : null);
  }
  if (r.supprime === 'oui' && r.deplace === 'non') {
    // Cas intermédiaire : on demande si le groupe est impliqué par le verbe.
    if (!('implique' in r)) {
      return {
        id: 'implique',
        titre: 'Le lien avec le verbe',
        texte: `On peut supprimer le groupe mais pas le déplacer. Complète-t-il le sens du verbe ${cite(jetons, verbe)} (répond-il à « quoi ? », « à qui ? », « de quoi ? »…) ?`,
        reponses: [{ id: 'oui', texte: 'Oui, il complète le verbe' }, { id: 'non', texte: 'Non, il donne une circonstance (lieu, temps…)' }],
      };
    }
    if (r.implique === 'non') return questionSuivante(ctx, [...chemin.filter((c) => c.question !== 'deplace'), { question: 'deplace', reponse: 'oui' }]);
  }

  // Le groupe est lié au verbe.
  const lemmes = lemmesDuVerbe(ctx);
  const attributif = lemmes.some((l) => VERBES_ATTRIBUTIFS.includes(l)) || estAvoirLAir(ctx);
  const prep = INTRODUCTEURS_PREPOSITIONNELS.has(premierMot);
  const passif = estPassif(ctx);

  if (passif && ['par', 'de', "d'"].includes(premierMot) && auNiveau('c4', ctx.niveau) && !('agent' in r)) {
    return {
      id: 'agent',
      titre: 'Voix passive ?',
      texte: 'Le verbe semble à la voix passive (être + participe passé). Si tu mets la phrase à la voix active, ce groupe (sans « par ») devient-il le sujet ?',
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (r.agent === 'oui') {
    return conclusion('CAG', 'complément d’agent', ['La phrase est à la voix passive.', 'À la voix active, ce groupe devient le sujet : c’est lui qui fait l’action.']);
  }

  if (attributif && !prep && !('attribut' in r)) {
    return {
      id: 'attribut',
      titre: 'Verbe attributif',
      texte: `Le verbe ${cite(jetons, verbe)} est un verbe attributif. Le groupe dit-il comment est le sujet ou ce qu’il est ? (On pourrait écrire : sujet = groupe.)`,
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (r.attribut === 'oui') {
    return conclusion('ATS', 'attribut du sujet', [`Le verbe ${cite(jetons, verbe)} est attributif.`, 'Le groupe exprime une caractéristique du sujet.']);
  }

  if (estImpersonnel(ctx) && auNiveau('lycee', ctx.niveau)) {
    return conclusion('CVI', 'complément du verbe impersonnel', ['Le sujet « il » ne désigne rien : le verbe est impersonnel.', 'Le groupe qui suit complète ce verbe impersonnel.']);
  }

  if (['du', 'des', 'de', "d'"].includes(premierMot) && !('partitif' in r)) {
    return {
      id: 'partitif',
      titre: '« de » : préposition ou article ?',
      texte: `Dans ce groupe, « ${premier.texte} » signifie-t-il « une certaine quantité de » ou « des » (manger du pain, voir des oiseaux), ou bien est-ce la préposition « de » (parler de quelque chose, du film = de + le film) ?`,
      reponses: [{ id: 'article', texte: 'Une quantité : c’est un article' }, { id: 'prep', texte: 'La préposition « de »' }],
    };
  }
  const indirect = r.partitif ? r.partitif === 'prep' : prep;
  if (indirect) {
    return conclusion('COI', 'complément d’objet indirect (COI)', [
      'Le groupe est lié au verbe : on ne peut pas le déplacer.',
      `Il est introduit par une préposition (« ${premier.texte} »).`,
    ]);
  }
  // Attribut du COD : il faut déjà un COD dans la proposition.
  const cod = ctx.autres?.find((a) => a.fonction === 'COD');
  if (cod && auNiveau('c4', ctx.niveau) && !('ato' in r)) {
    const codTexte = cite(jetons, cod.jetons);
    return {
      id: 'ato',
      titre: 'Attribut du COD ?',
      texte: `Peut-on dire : ${codTexte} est ${cite(jetons, groupe)} ?`,
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (r.ato === 'oui') {
    return conclusion('ATO', 'attribut du COD', ['Le groupe donne une caractéristique du COD.', `On peut dire : ${cite(jetons, cod.jetons)} est ${cite(jetons, groupe)}.`]);
  }
  return conclusion('COD', 'complément d’objet direct (COD)', [
    'Le groupe est lié au verbe : on ne peut ni le supprimer ni le déplacer.',
    'Il n’est pas introduit par une préposition.',
  ]);
}

function questionPronom(ctx, r, mot) {
  const { jetons, verbe } = ctx;
  if (['lui', 'leur'].includes(mot)) {
    return conclusion('COI', 'complément d’objet indirect (COI)', [`« ${mot} » remplace un groupe introduit par « à » (à quelqu’un).`]);
  }
  if (['le', 'la', "l'", 'les'].includes(mot)) {
    if (lemmesDuVerbe(ctx).some((l) => VERBES_ATTRIBUTIFS.includes(l))) {
      return conclusion('ATS', 'attribut du sujet', ['Avec un verbe attributif, « le » reprend un attribut (« Heureux, il l’est »).']);
    }
    return conclusion('COD', 'complément d’objet direct (COD)', [`« ${mot} » remplace un groupe nominal construit sans préposition.`]);
  }
  if (mot === 'en') {
    if (!('en' in r)) {
      return {
        id: 'en',
        titre: 'Que remplace « en » ?',
        texte: 'Remplace « en » par ce qu’il représente. Est-ce une quantité (du, de la, des… : « j’en mange » = « je mange du pain ») ou un groupe introduit par la préposition « de » (« j’en parle » = « je parle de ce film ») ?',
        reponses: [{ id: 'quantite', texte: 'Une quantité (du, de la, des…)' }, { id: 'de', texte: 'Un groupe avec la préposition « de »' }],
      };
    }
    return r.en === 'quantite'
      ? conclusion('COD', 'complément d’objet direct (COD)', ['« en » remplace un groupe nominal introduit par un article partitif ou indéfini (du, des…), sans préposition.'])
      : conclusion('COI', 'complément d’objet indirect (COI)', ['« en » remplace un groupe introduit par la préposition « de ».']);
  }
  if (mot === 'y') {
    return conclusion('COI', 'complément d’objet indirect (COI)', ['« y » remplace un groupe introduit par une préposition (à cela, à Paris, dans la maison…) lié au verbe.']);
  }
  if (!('preposition' in r)) {
    const exemple = `Par exemple : « il me parle » → « il parle à Paul » (avec « à ») ; « il me voit » → « il voit Paul » (sans préposition).`;
    return {
      id: 'preposition',
      titre: 'Remplacer le pronom',
      texte: `Remplace « ${jetons[ctx.groupe[0]].texte} » par un nom placé après le verbe ${cite(jetons, verbe)}. Faut-il une préposition (à, de) ? ${exemple}`,
      reponses: [{ id: 'oui', texte: 'Oui, il faut une préposition' }, { id: 'non', texte: 'Non' }],
    };
  }
  return r.preposition === 'oui'
    ? conclusion('COI', 'complément d’objet indirect (COI)', ['Le pronom remplace un groupe introduit par une préposition.'])
    : conclusion('COD', 'complément d’objet direct (COD)', ['Le pronom remplace un groupe construit sans préposition.']);
}

// Mots sur lesquels portent les tests : la proposition du verbe (+ le groupe).
// Les connecteurs et modalisateurs déjà repérés sont retirés : ils sont hors
// de la syntaxe et faussent le test (« J'en fais, précisément, pour… »).
const champDe = (ctx) => {
  const c = ctx.proposition ? M.champ(ctx.jetons, ctx.proposition, ctx.groupe) : ctx.jetons;
  const hors = new Set((ctx.autres ?? []).filter((a) => a.fonction === 'MOD' || a.fonction === 'CONN').flatMap((a) => a.jetons));
  if (!hors.size) return c;
  // On retire aussi la virgule qui détachait le mot retiré.
  return c.filter((j, n) => !hors.has(j.i) && !(j.texte === ',' && (hors.has(c[n - 1]?.i) || hors.has(c[n + 1]?.i))));
};

// Rappel affiché quand la proposition n'est qu'une partie de la phrase.
function contexteProposition(ctx) {
  if (!ctx.proposition) return null;
  const c = champDe(ctx);
  if (c.filter((j) => !j.ponct).length === ctx.jetons.filter((j) => !j.ponct).length) return null;
  const mots = c.filter((j) => !M.estPonctuationFinale(j));
  return `On fait le test dans la proposition du verbe ${cite(ctx.jetons, ctx.verbe)} : « ${recompose(mots).replace(/^[,;:]\s*/, '')} ».`;
}

function conclusion(fonction, nom, raisons, precision = null) {
  return { conclusion: true, fonction, nom, raisons, precision };
}

function lemmesDuVerbe(ctx) {
  // Pour un temps composé, c'est le participe qui porte le sens (a été → être).
  const dernier = ctx.jetons[ctx.verbe.at(-1)];
  return lemmesVerbaux(dernier.texte);
}

function estAvoirLAir(ctx) {
  const apres = ctx.jetons.slice(ctx.verbe.at(-1) + 1, ctx.verbe.at(-1) + 3).map((j) => normalise(j.texte)).join(' ');
  return lemmesDuVerbe(ctx).includes('avoir') && apres === "l' air";
}

function estPassif(ctx) {
  const v = ctx.verbe.map((i) => ctx.jetons[i]);
  if (v.length < 2) return false;
  const etre = v.slice(0, -1).some((j) => lemmesVerbaux(j.texte).includes('être'));
  const participe = formesNonConjuguees(v.at(-1).texte).some((f) => f.mode === 'par' && f.temps === 'pas');
  const lemmeFinal = lemmesVerbaux(v.at(-1).texte);
  return etre && participe && !lemmeFinal.includes('être');
}

function estImpersonnel(ctx) {
  const sujet = ctx.sujet?.map((i) => normalise(ctx.jetons[i].texte)).join(' ');
  return sujet === 'il' && lemmesDuVerbe(ctx).some((l) => ['falloir', 'pleuvoir', 'neiger', 'agir'].includes(l));
}

// --- Expansions du nom ---------------------------------------------------------------

export function questionExpansion(ctx, chemin) {
  const r = Object.fromEntries(chemin.map((c) => [c.question, c.reponse]));
  const { jetons, groupe } = ctx;
  const premier = jetons[groupe[0]];
  const avant = jetons[groupe[0] - 1];
  const detache = avant?.texte === ',' || avant?.texte === ':';
  const relatif = analyses(premier.texte).some((a) => a.n === 'pro.rel') && !INTRODUCTEURS_PREPOSITIONNELS.has(normalise(premier.texte));
  const prep = INTRODUCTEURS_PREPOSITIONNELS.has(normalise(premier.texte));

  if (!('complete' in r)) {
    return {
      id: 'complete',
      titre: 'Que complète ce groupe ?',
      texte: 'Ce groupe complète-t-il un nom (le chat [de la voisine], un chat [noir]) ou un adjectif (fier [de son travail], [très] grand) ?',
      reponses: [{ id: 'nom', texte: 'Un nom' }, { id: 'adj', texte: 'Un adjectif' }],
    };
  }
  if (r.complete === 'adj') {
    const adverbe = groupe.length === 1 && naturesPossibles(premier.texte).includes('adv');
    return conclusion('CADJ', 'complément de l’adjectif', adverbe
      ? [`« ${premier.texte} » est un adverbe placé devant l’adjectif : il en précise le degré (très, peu, totalement…).`, 'Test : remplace-le par « très » ; il forme avec l’adjectif un groupe adjectival.']
      : ['Le groupe complète un adjectif.', prep ? `Il est introduit par la préposition « ${premier.texte} ».` : '']);
  }
  if (detache && auNiveau('c4', ctx.niveau)) {
    return conclusion('APP', 'apposition', ['Le groupe est détaché du nom par une virgule.', 'On peut le supprimer sans changer ce que désigne le nom.']);
  }
  if (relatif) {
    return conclusion('EPI', 'épithète (proposition subordonnée relative)', [`Le groupe commence par le pronom relatif « ${premier.texte} ».`, 'Il complète le nom placé avant lui, son antécédent.']);
  }
  if (prep) {
    return conclusion('CN', 'complément du nom', [`Le groupe est introduit par la préposition « ${premier.texte} ».`, 'Il précise le nom.']);
  }
  return conclusion('EPI', 'épithète', ['Le groupe (un adjectif) est placé à côté du nom, sans verbe entre eux.']);
}

// --- Natures ---------------------------------------------------------------------------

// Découpe la phrase en unités à analyser : mots et locutions (parce que),
// en rattachant l'auxiliaire au participe pour les verbes déjà repérés.
export function unitesNatures(jetons, verbes = []) {
  const unites = [];
  const pris = new Set();
  for (const v of verbes) {
    const noyau = v.filter((i) => !jetons[i].euphonique);
    // On ne regroupe que les mots contigus (a mangé), pas « a -t-il mangé ».
    if (noyau.every((i, k) => k === 0 || i === noyau[k - 1] + 1)) {
      unites.push({ jetons: noyau, locution: 'verbe' });
      noyau.forEach((i) => pris.add(i));
    }
  }
  const ms = mots(jetons).filter((j) => !j.euphonique);
  for (let k = 0; k < ms.length; k++) {
    if (pris.has(ms[k].i)) continue;
    const loc = LOCUTIONS.find((l) => l.mots.every((m, d) => ms[k + d] && normalise(ms[k + d].texte) === m && !pris.has(ms[k + d].i)));
    if (loc) {
      const idx = loc.mots.map((_, d) => ms[k + d].i);
      unites.push({ jetons: idx, locution: loc.nature });
      idx.forEach((i) => pris.add(i));
      k += loc.mots.length - 1;
    } else {
      unites.push({ jetons: [ms[k].i], locution: null });
      pris.add(ms[k].i);
    }
  }
  return unites.sort((a, b) => a.jetons[0] - b.jetons[0])
    .map((u) => ({ ...u, texte: recompose(u.jetons.map((i) => jetons[i])) }));
}

// Natures possibles d'une unité, avec la plus probable d'après le contexte.
export function candidatsNature(jetons, unite) {
  if (unite.locution) return { possibles: [unite.locution], probable: unite.locution, raison: unite.locution === 'verbe' ? 'C’est le verbe que tu as repéré.' : 'C’est une locution : plusieurs mots qui forment une seule unité.' };
  const j = jetons[unite.jetons[0]];
  const possibles = naturesPossibles(j.texte, { debutDePhrase: j.i === 0 });
  if (!possibles.length) return { possibles: [], probable: null, raison: 'Ce mot n’est pas dans le dictionnaire : vérifie l’orthographe. Si c’est un nom propre, il prend une majuscule.' };
  if (possibles.length === 1) return { possibles, probable: possibles[0], raison: 'Le dictionnaire ne connaît qu’une nature pour ce mot.' };
  const { code, raison } = devineNature(jetons, j, possibles);
  return { possibles, probable: code, raison };
}

// Quelques règles de contexte, présentées comme des indices et non comme
// des certitudes.
function devineNature(jetons, j, possibles) {
  const suivant = jetons.slice(j.i + 1).find((x) => !x.ponct);
  const precedent = jetons.slice(0, j.i).reverse().find((x) => !x.ponct);
  const natSuivant = suivant ? naturesPossibles(suivant.texte) : [];
  const mot = normalise(j.texte);
  const aDet = possibles.find((p) => p.startsWith('det'));
  const aPro = possibles.find((p) => p.startsWith('pro'));

  if (aDet && aPro) {
    const suiviDeNom = natSuivant.some((n) => n.startsWith('nom') || n === 'adj');
    const suiviDeVerbe = natSuivant.includes('verbe') && !suiviDeNom;
    if (suiviDeVerbe || (suivant && natSuivant[0] === 'verbe' && formesConjuguees(suivant.texte).length && !natSuivant.some((n) => n.startsWith('nom')))) {
      return { code: aPro, raison: `« ${j.texte} » est suivi d’un verbe : il le complète, c’est sans doute un pronom.` };
    }
    if (suiviDeNom) return { code: aDet, raison: `« ${j.texte} » est suivi d’un nom ou d’un adjectif : c’est sans doute un déterminant.` };
  }
  if (possibles.includes('verbe') && possibles.some((p) => p.startsWith('nom'))) {
    const nom = possibles.find((p) => p.startsWith('nom'));
    const natPrec = precedent ? naturesPossibles(precedent.texte) : [];
    // « la porte » : déterminant + nom ; « je la porte » : sujet + pronom + verbe.
    const avantPrec = precedent ? jetons.slice(0, precedent.i).reverse().find((x) => !x.ponct) : null;
    const sujetAvant = avantPrec && naturesPossibles(avantPrec.texte).some((n) => n === 'pro.pers' || n.startsWith('nom'));
    const determinant = natPrec.some((n) => n.startsWith('det')) && (!natPrec.some((n) => n.startsWith('pro')) || !sujetAvant);
    if (determinant) {
      return { code: nom, raison: `« ${j.texte} » est précédé d’un déterminant : c’est sans doute un nom.` };
    }
    return { code: 'verbe', raison: `Change le temps de la phrase : si « ${j.texte} » change, c’est un verbe ; s’il peut être précédé d’un déterminant, c’est un nom.` };
  }
  // « en » : pronom devant un verbe (j'en mange), préposition sinon (en hiver).
  if (possibles.includes('pro.adv') && possibles.includes('prep')) {
    const devantVerbe = suivant && (formesConjuguees(suivant.texte).length || naturesPossibles(suivant.texte).includes('pro.adv')
      || ['y'].includes(normalise(suivant.texte)));
    return devantVerbe
      ? { code: 'pro.adv', raison: `« ${j.texte} » est placé devant un verbe : il remplace un groupe, c’est un pronom.` }
      : { code: 'prep', raison: `« ${j.texte} » introduit un groupe (en hiver, en train) : c’est une préposition.` };
  }
  if (mot === 'que' || mot === "qu'") {
    const precedentNom = precedent && naturesPossibles(precedent.texte).some((n) => n.startsWith('nom'));
    return precedentNom
      ? { code: 'pro.rel', raison: '« que » suit un nom qu’il peut reprendre (son antécédent) : c’est sans doute un pronom relatif.' }
      : { code: 'conj.sub', raison: '« que » ne suit pas un nom : il relie sans doute une proposition à un verbe (conjonction de subordination).' };
  }
  return { code: possibles[0], raison: 'Plusieurs natures sont possibles : la première est la plus fréquente. Vérifie avec la fiche méthode.' };
}

export { normalise };
