// Moteur du mode « S'entraîner » : à partir d'un corrigé, il prépare les
// étapes de l'exercice, vérifie les réponses de l'élève et fabrique des
// aides graduées. Aucune dépendance au DOM (testable avec Node).

import { FONCTIONS, CIRCONSTANCES, PROPOSITIONS, NATURES, natureAuNiveau, categorie, auNiveau } from '../data/terminologie.js';
import { CONFUSIONS_NATURES } from '../data/methodes.js';
import { INTRODUCTEURS_PREPOSITIONNELS } from '../data/mots-outils.js';
import * as M from './manipulations.js';
import { texteDe, normalise } from './notation.js';
import { formesNonConjuguees } from './lexique.js';
import { GROUPES, TYPES_PHRASE, FORMES_PHRASE, TEMPS_VERBAUX } from '../data/terminologie.js';
import { natureGroupe, noyauADemander } from './groupes.js';
import { identiteVerbe, verifieIdentite, libelleTemps, libellePersonne } from './verbe.js';
import { typeEtFormes, formePassive } from './phrase.js';
import { traitsSujet } from './guide.js';

// Thèmes d'entraînement. Une étape suivie de « * » est donnée (affichée
// d'emblée) pour que l'élève se concentre sur la suite.
export const THEMES = {
  verbe: { titre: 'Le verbe', resume: 'Repérer les verbes conjugués, puis donner leur infinitif, leur mode, leur temps et leur personne.', etapes: ['verbes', 'identite'] },
  sujet: { titre: 'Le sujet', resume: 'Sujets inversés, éloignés, pronoms, groupes longs…', etapes: ['verbes*', 'sujets'] },
  complements: { titre: 'Les compléments', resume: 'COD, COI, attribut du sujet, compléments circonstanciels.', etapes: ['verbes*', 'sujets*', 'fonctions', 'predicat'] },
  expansions: { titre: 'Le groupe nominal', resume: 'Expansions du nom : épithète, complément du nom, relative, apposition.', etapes: ['expansions'] },
  groupes: { titre: 'La nature des groupes', resume: 'Groupe nominal, prépositionnel, adjectival… et leur noyau.', etapes: ['verbes*', 'sujets*', 'fonctions*', 'expansions*', 'groupes'] },
  natures: { titre: 'La nature des mots', resume: 'Nom, déterminant, pronom, adjectif, préposition…', etapes: ['natures'] },
  propositions: { titre: 'Les propositions', resume: 'Indépendantes, principales, subordonnées.', etapes: ['verbes*', 'propositions'] },
  phrase: { titre: 'Types et formes de phrase', resume: 'Déclarative, interrogative, impérative ; négative, passive, exclamative…', etapes: ['phrase'] },
  complete: { titre: 'Analyse complète', resume: 'Toutes les étapes, comme en classe.', etapes: ['verbes', 'identite', 'sujets', 'fonctions', 'predicat', 'expansions', 'groupes', 'propositions', 'natures', 'phrase'] },
};

export const TITRES_ETAPES = {
  verbes: 'Les verbes conjugués',
  identite: 'L’identité du verbe',
  sujets: 'Les sujets',
  fonctions: 'Les compléments',
  predicat: 'Le prédicat',
  expansions: 'Le groupe nominal',
  groupes: 'La nature des groupes',
  propositions: 'Les propositions',
  natures: 'La nature des mots',
  phrase: 'Type et formes',
};

export function phrasesDuTheme(banque, theme, niveau) {
  const tous = ['complete', 'verbe', 'phrase', 'groupes'];
  return banque.filter((p) => auNiveau(p.niveau, niveau)
    && (!p.seulement || p.seulement.includes(theme))
    && (tous.includes(theme) || p.themes.includes(theme))
    && (!['natures', 'groupes'].includes(theme) || p.natures));
}

// --- Construction de l'exercice --------------------------------------------

// options.vocabulaire : 'gv' (groupe verbal, terminologie 2020) ou 'predicat'.
export function creeExercice(corrige, theme, niveau, options = {}) {
  const etapes = [];
  for (const code of THEMES[theme].etapes) {
    const donne = code.endsWith('*');
    const type = code.replace('*', '');
    if (type === 'predicat' && options.vocabulaire !== 'predicat') continue;
    const items = itemsEtape(type, corrige, niveau);
    if (items.length) etapes.push({ type, donne, items });
  }
  return { corrige, niveau, theme, etapes };
}

function itemsEtape(type, c, niveau) {
  const avecVerbe = c.propositions.filter((p) => p.verbe);
  const conjuguees = avecVerbe.filter((p) => p.conjuguee);
  switch (type) {
    case 'verbes':
      return [{ attendu: conjuguees.flatMap((p) => p.verbe.jetons).sort((a, b) => a - b) }];
    case 'sujets':
      return conjuguees.map((p) => ({ prop: p, attendu: p.sujet?.jetons ?? [] }));
    case 'fonctions':
      return avecVerbe.filter((p) => p.complements.length).map((p) => ({ prop: p, cibles: p.complements }));
    case 'expansions': {
      const cibles = c.expansions.filter((e) => auNiveau(FONCTIONS[e.fonction].niveau, niveau));
      return cibles.length ? [{ cibles }] : [];
    }
    case 'propositions':
      return c.propositions.length > 1 ? c.propositions.map((p) => ({ prop: p })) : [];
    case 'natures':
      return c.natures ? c.natures.map((u) => ({ unite: u, attendu: natureAuNiveau(u.nature, niveau) })) : [];
    case 'identite':
      return conjuguees.map((p) => ({ prop: p, identite: identiteDe(c, p) })).filter((it) => it.identite?.possibilites.length && it.identite.infinitifs.length);
    case 'predicat':
      // Seulement pour les propositions principales et indépendantes.
      return conjuguees.filter((p) => !p.type.startsWith('SUB')).map((p) => ({ prop: p, attendu: predicatDe(c, p) })).filter((it) => it.attendu.length);
    case 'groupes':
      return c.natures ? groupesAClasser(c, niveau) : [];
    case 'phrase':
      return [{ attendu: typeFormesDe(c, niveau) }];
    default:
      return [];
  }
}

// --- Outils de comparaison ---------------------------------------------------

const ensemble = (t) => new Set(t);
const memes = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const sansPonct = (c, indices) => indices.filter((i) => !c.jetons[i].ponct);
const cite = (c, indices) => `« ${texteDe(c.jetons, indices)} »`;
// Cite une phrase transformée sans son point final : « Le chat dort ».
const phrase = (s) => `« ${s.replace(/\s*\.$/, '')} »`;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

const juste = (message) => ({ statut: 'juste', message });
const faux = (message, test = null) => ({ statut: 'faux', message, test });

// --- Étape 1 : verbes conjugués ----------------------------------------------

export function verifieVerbes(c, item, selection) {
  const sel = sansPonct(c, selection);
  const attendu = item.attendu;
  const enTrop = sel.filter((i) => !attendu.includes(i));
  const manquants = attendu.filter((i) => !sel.includes(i));
  if (!enTrop.length && !manquants.length) {
    const n = c.propositions.filter((p) => p.verbe && p.conjuguee).length;
    return juste(n > 1
      ? `Bravo ! Il y a ${n} verbes conjugués, donc ${n} propositions.`
      : 'Bravo ! Une seule proposition : c’est une phrase simple.');
  }
  if (enTrop.length) {
    const i = enTrop[0];
    const mot = c.jetons[i].texte;
    const nature = natureDuJeton(c, i);
    if (['ne', "n'", 'pas', 'plus', 'jamais', 'rien', 'point', 'guère'].includes(normalise(mot))) {
      return faux(`« ${mot} » sert à la négation : il encadre le verbe mais n’en fait pas partie. C’est un adverbe.`);
    }
    if (nature && categorie(nature) === 'verbe') {
      const f = formesNonConjuguees(mot)[0];
      const forme = f ? ` (${f.libelle})` : '';
      return faux(`« ${mot} » est bien un verbe, mais il n’est pas conjugué${forme} : il ne change pas quand on change le temps de la phrase.`);
    }
    return faux(`« ${mot} » n’est pas un verbe conjugué : ajoute « Hier » ou « Demain » au début de la phrase, ce mot ne change pas.`);
  }
  // Il manque des mots : partie d'un temps composé ou verbe oublié.
  const coupe = c.propositions.find((p) => p.verbe && p.conjuguee && p.verbe.jetons.some((i) => sel.includes(i))
    && p.verbe.jetons.some((i) => !sel.includes(i)));
  if (coupe) {
    return faux(`Le verbe ${cite(c, coupe.verbe.jetons)} est en plusieurs mots (temps composé ou forme pronominale) : sélectionne-les tous.`);
  }
  const restants = c.propositions.filter((p) => p.verbe && p.conjuguee && p.verbe.jetons.every((i) => !sel.includes(i))).length;
  return faux(`Il manque ${pluriel(restants, 'verbe')} conjugué${restants > 1 ? 's' : ''}.`);
}

function natureDuJeton(c, i) {
  return c.natures?.find((u) => u.jetons.includes(i))?.nature ?? null;
}

// --- Étape 2 : sujets ----------------------------------------------------------

export function verifieSujet(c, item, selection, pasDeSujet = false) {
  const { prop } = item;
  const verbe = texteDe(c.jetons, prop.verbe.jetons);
  if (!item.attendu.length) {
    if (pasDeSujet) return juste(`Exact : ${cite(c, prop.verbe.jetons)} est à l’impératif, il n’a pas de sujet exprimé.`);
    return faux(`Regarde bien : ${cite(c, prop.verbe.jetons)} est à l’impératif. Ce mode n’a pas de sujet exprimé.`);
  }
  if (pasDeSujet) return faux(`Ce verbe a un sujet. Pose la question « Qui est-ce qui ${verbe} ? »`);

  const sel = sansPonct(c, selection);
  const attendu = sansPonct(c, item.attendu);
  // « Léa, ma meilleure amie, adore… » : on accepte aussi « Léa » seul.
  const apposition = c.expansions.filter((e) => e.fonction === 'APP' && e.support === prop.sujet).flatMap((e) => e.jetons);
  if (apposition.length && memes(sel, attendu.filter((i) => !apposition.includes(i)))) {
    return juste(`Oui ! Le sujet est ${cite(c, sel)}, complété par une apposition : ${cite(c, apposition)}.`);
  }
  if (memes(sel, attendu)) {
    return juste(`Bravo ! ${M.encadreSujet(c.jetons, attendu, prop.verbe.jetons)}`);
  }
  if (!sel.length) return faux('Sélectionne d’abord les mots du sujet.');
  const dans = sel.filter((i) => attendu.includes(i));
  if (dans.length === sel.length) {
    return faux(`C’est le bon groupe, mais il est incomplet : le sujet compte ${pluriel(attendu.length, 'mot')}. Il comprend aussi les mots qui complètent le nom.`);
  }
  if (dans.length === attendu.length) {
    const intrus = sel.filter((i) => !attendu.includes(i));
    return faux(`Tu as pris trop de mots : ${cite(c, intrus)} ne fait pas partie du sujet.`);
  }
  if (prop.verbe.jetons.some((i) => sel.includes(i))) {
    return faux('Le verbe ne fait pas partie du sujet.');
  }
  const confondu = prop.complements.find((g) => memes(sansPonct(c, g.jetons), sel));
  const test = M.encadreSujet(c.jetons, sel, prop.verbe.jetons);
  if (confondu) {
    return faux(`Fais le test « C’est… qui » : ${phrase(test)}. Est-ce bien ce que dit la phrase ? Demande-toi plutôt « Qui est-ce qui ${verbe} ? ».`, test);
  }
  return faux(`Ce n’est pas le sujet de ${cite(c, prop.verbe.jetons)}. Demande-toi « Qui est-ce qui ${verbe} ? » ou « Qu’est-ce qui ${verbe} ? ».`, test);
}

// --- Étape 3 : compléments --------------------------------------------------

// `trouves` : groupes déjà identifiés dans cet item.
export function verifieComplement(c, item, selection, fonction, trouves = []) {
  const sel = sansPonct(c, selection);
  if (!sel.length) return faux('Sélectionne d’abord un groupe de mots.');
  const { prop } = item;
  const cibles = item.cibles.filter((g) => !trouves.includes(g));

  if (prop.sujet && memes(sel, sansPonct(c, prop.sujet.jetons))) return faux('Ce groupe est le sujet : tu l’as déjà trouvé.');
  if (sel.some((i) => prop.verbe.jetons.includes(i))) return faux('Ta sélection contient le verbe : sélectionne seulement le complément.');
  if (item.cibles.some((g) => trouves.includes(g) && memes(sansPonct(c, g.jetons), sel))) return faux('Tu as déjà analysé ce groupe.');

  const exact = cibles.find((g) => memes(sansPonct(c, g.jetons), sel));
  if (exact) {
    if (exact.fonction === fonction) {
      return { ...juste(`Oui : ${cite(c, exact.jetons)} est ${article(fonction)}.`), groupe: exact };
    }
    return { ...faux(explicationConfusion(c, prop, exact, fonction)), groupe: null };
  }
  // Recouvrement partiel avec un groupe attendu.
  const touche = cibles.find((g) => g.jetons.some((i) => sel.includes(i)));
  if (touche) {
    const g = sansPonct(c, touche.jetons);
    if (sel.every((i) => g.includes(i))) {
      return faux('Ce groupe est incomplet : un complément comprend aussi les mots qui précisent son nom noyau (complément du nom, adjectif…).');
    }
    if (g.every((i) => sel.includes(i))) {
      return faux('Ta sélection contient plusieurs groupes ou des mots en trop : découpe-la en groupes plus petits.');
    }
    return faux('Ta sélection ne correspond pas à un groupe : vérifie où il commence et où il finit.');
  }
  const sansFonction = sel.every((i) => !c.groupes.some((g) => g.jetons.includes(i)));
  if (sansFonction) {
    return faux(`${cite(c, sel)} n’a pas de fonction : ce sont des mots outils (négation, conjonction de coordination…).`);
  }
  return faux('Ce groupe n’est pas un complément de ce verbe. Cherche les groupes qui dépendent du verbe ou de toute la phrase.');
}

const ARTICLES = {
  S: 'le sujet', COD: 'complément d’objet direct (COD)', COI: 'complément d’objet indirect (COI)',
  ATS: 'attribut du sujet', ATO: 'attribut du COD', CC: 'complément circonstanciel',
  CAG: 'complément d’agent', CVI: 'complément du verbe impersonnel', EPI: 'épithète',
  CN: 'complément du nom', APP: 'en apposition', CADJ: 'complément de l’adjectif',
};
const article = (f) => ARTICLES[f] ?? FONCTIONS[f].nom;

// Explication quand l'élève a trouvé le bon groupe mais pas la bonne fonction.
// On ne donne pas la réponse : on fait faire le test qui permet de trancher.
function explicationConfusion(c, prop, groupe, choisi) {
  const attendu = groupe.fonction;
  const premier = normalise(c.jetons[groupe.jetons[0]].texte);
  const champ = M.champ(c.jetons, prop.jetons, groupe.jetons);
  const sansLui = M.supprime(champ, groupe.jetons);
  const enTete = M.deplace(champ, groupe.jetons).texte;
  const verbe = cite(c, prop.verbe.jetons);

  if (choisi === 'CC' && attendu !== 'CC') {
    return `Fais les tests. Supprime le groupe : ${phrase(sansLui)}. Déplace-le : ${phrase(enTete)}. Ces phrases sont-elles correctes et gardent-elles le même sens ? Si non, le groupe est lié au verbe : ce n’est pas un complément circonstanciel.`;
  }
  if (attendu === 'CC') {
    return `Essaie de supprimer ce groupe : ${phrase(sansLui)}. Puis de le déplacer : ${phrase(enTete)}. Les deux phrases restent correctes : le groupe n’est pas lié au verbe.`;
  }
  if (choisi === 'ATS' || attendu === 'ATS') {
    return attendu === 'ATS'
      ? `Le verbe ${verbe} est un verbe attributif : le groupe dit comment est le sujet (ou ce qu’il est).`
      : `Le verbe ${verbe} n’est pas employé ici comme verbe attributif : le groupe ne désigne pas une qualité du sujet.`;
  }
  if (choisi === 'COD' && attendu === 'COI') {
    return `Regarde le premier mot du groupe : « ${c.jetons[groupe.jetons[0]].texte} ». Un complément d’objet introduit par une préposition n’est pas direct.`;
  }
  if (choisi === 'COI' && attendu === 'COD') {
    const partitif = ['du', 'des', 'de', "d'"].includes(premier);
    return partitif
      ? `Ici « ${c.jetons[groupe.jetons[0]].texte} » n’est pas une préposition : c’est un déterminant (article) qui introduit directement le nom. Le complément est donc construit sans préposition.`
      : 'Ce complément n’est introduit par aucune préposition : il se rattache directement au verbe.';
  }
  if (attendu === 'CAG') {
    return 'La phrase est à la voix passive : mets-la à la voix active. Que devient ce groupe ?';
  }
  if (choisi === 'S') return `Ce n’est pas le sujet : fais le test « C’est… qui » avec le verbe ${verbe}.`;
  return `Ce n’est pas ${article(choisi)}. Relis la fiche « Distinguer les compléments » et refais les tests.`;
}

export function circonstancesProposees(niveau) {
  return Object.entries(CIRCONSTANCES).filter(([, x]) => auNiveau(x.niveau, niveau))
    .map(([code, x]) => ({ code, ...x }));
}

export function verifieCirconstance(groupe, code) {
  if (!groupe.precision) return juste('');
  const attendu = CIRCONSTANCES[groupe.precision];
  if (code === groupe.precision) return juste(`Oui, c’est un complément circonstanciel de ${attendu.nom}.`);
  return faux(`Pas tout à fait. Pose la question « ${attendu.question.replace(/ \?$/, '')} » : ce groupe y répond-il ?`);
}

// --- Étape 4 : expansions du nom ----------------------------------------------

export function verifieExpansion(c, item, selection, fonction, trouves = []) {
  const sel = sansPonct(c, selection);
  if (!sel.length) return faux('Sélectionne d’abord une expansion.');
  const cibles = item.cibles.filter((g) => !trouves.includes(g));
  const exact = cibles.find((g) => memes(sansPonct(c, g.jetons), sel));
  if (exact) {
    if (fonction === 'EXP' && ['EPI', 'CN', 'APP'].includes(exact.fonction)) {
      return { ...juste(`Oui : ${cite(c, exact.jetons)} est une expansion du nom ${cite(c, noyauDe(c, exact))} (ici, ${article(exact.fonction)}).`), groupe: exact };
    }
    if (exact.fonction === fonction) {
      return { ...juste(`Oui : ${cite(c, exact.jetons)} est ${article(fonction)} de ${cite(c, noyauDe(c, exact))}.`), groupe: exact };
    }
    return faux(explicationExpansion(c, exact, fonction));
  }
  const touche = cibles.find((g) => g.jetons.some((i) => sel.includes(i)));
  if (touche) return faux('Vérifie les limites de ta sélection : elle ne correspond pas exactement à une expansion.');
  return faux('Ce n’est pas une expansion du nom. Cherche ce qui complète un nom : adjectif, groupe introduit par une préposition, relative…');
}

// Le nom complété : premier nom du groupe support qui précède l'expansion.
function noyauDe(c, expansion) {
  const support = expansion.support?.jetons ?? [];
  const avant = support.filter((i) => i < expansion.jetons[0] && !expansion.jetons.includes(i));
  const noms = avant.filter((i) => categorie(natureDuJeton(c, i) ?? '') === 'nom');
  if (noms.length) return [noms.at(-1)];
  const apres = support.filter((i) => i > expansion.jetons.at(-1));
  const nomsApres = apres.filter((i) => categorie(natureDuJeton(c, i) ?? '') === 'nom');
  return nomsApres.length ? [nomsApres[0]] : support.slice(0, 1);
}

function explicationExpansion(c, groupe, choisi) {
  const premier = normalise(c.jetons[groupe.jetons[0]].texte);
  const virgule = c.jetons[groupe.jetons[0] - 1]?.texte === ',';
  if (groupe.fonction === 'APP') return 'Ce groupe est détaché du nom par une virgule : on peut le supprimer sans changer ce que désigne le nom.';
  if (choisi === 'APP' && !virgule) return 'Il n’y a pas de virgule entre le nom et ce groupe : il n’est pas détaché.';
  if (groupe.fonction === 'CN' && INTRODUCTEURS_PREPOSITIONNELS.has(premier)) return `Ce groupe est introduit par la préposition « ${c.jetons[groupe.jetons[0]].texte} » et précise le nom.`;
  if (groupe.fonction === 'EPI' && choisi === 'CN') return 'Ce groupe n’est pas introduit par une préposition : c’est un adjectif ou une proposition relative qui qualifie le nom.';
  if (groupe.fonction === 'CADJ') return 'Ce groupe ne complète pas un nom mais un adjectif placé juste avant lui.';
  return `Ce n’est pas ${article(choisi)}.`;
}

// --- Étape 5 : propositions -----------------------------------------------------

export function typesPropositions(niveau) {
  return Object.entries(PROPOSITIONS).filter(([, p]) => auNiveau(p.niveau, niveau))
    .map(([code, p]) => ({ code, nom: p.nom }));
}

export function verifieProposition(c, item, code) {
  const attendu = item.prop.type;
  if (code === attendu) return juste(`Oui : ${PROPOSITIONS[attendu].nom.toLowerCase()}.`);
  const premier = c.jetons[item.prop.jetons[0]];
  if (attendu.startsWith('SUB') && !code.startsWith('SUB')) {
    return faux(`Cette proposition commence par « ${premier.texte} » et dépend d’une autre proposition : elle ne peut pas être employée seule.`);
  }
  if (!attendu.startsWith('SUB') && code.startsWith('SUB')) {
    return faux('Cette proposition n’est introduite par aucun mot subordonnant (pronom relatif, conjonction de subordination).');
  }
  if (attendu === 'PRINC') return faux('Une autre proposition dépend de celle-ci : c’est une principale.');
  if (attendu === 'IND') return faux('Aucune proposition ne dépend de celle-ci, et elle ne dépend d’aucune autre.');
  if (attendu === 'SUB-REL') return faux('Le premier mot reprend un nom placé avant lui (son antécédent) : c’est un pronom relatif.');
  if (attendu === 'SUB-CONJ') return faux('La proposition complète le verbe (on peut la remplacer par « cela ») et commence par la conjonction « que ».');
  if (attendu === 'SUB-CIRC') return faux('La proposition donne une circonstance (temps, cause, but…) et on peut la déplacer ou la supprimer.');
  return faux(`Ce n’est pas une ${PROPOSITIONS[code].nom.toLowerCase()}.`);
}

// --- Étape 6 : natures -------------------------------------------------------------

export function verifieNature(item, code, niveau) {
  const attendu = item.attendu;
  if (code === attendu) return juste(`Oui : « ${item.unite.texte} » est ${libelleNature(attendu)}.`);
  // Bonne catégorie : il manque seulement la précision (sous-catégorie).
  if (categorie(code) === categorie(attendu) && code === categorie(code)) {
    return { statut: 'partiel', message: 'Bonne catégorie ! Précise maintenant laquelle.' };
  }
  if (categorie(code) === categorie(attendu)) {
    return faux(`C’est bien ${libelleNature(categorie(attendu))}, mais pas ${libelleNature(code)}.`);
  }
  const cle = `${categorie(code)}→${categorie(attendu)}`;
  const cleFine = `${code}→${attendu}`;
  return faux(CONFUSIONS_NATURES[cleFine] ?? CONFUSIONS_NATURES[cle] ?? `Ce n’est pas ${libelleNature(code)}. Relis la fiche « Trouver la nature d’un mot ».`);
}

export function libelleNature(code) {
  const n = NATURES[code];
  if (!n) return code;
  const nom = n.nom.toLowerCase();
  const feminin = /^(préposition|conjonction|interjection)/.test(nom);
  return `${feminin ? 'une' : 'un'} ${nom}`;
}

// --- Aides graduées -------------------------------------------------------------------

// Liste d'aides de plus en plus précises ; la dernière donne la réponse.
export function aides(c, etape, item, niveau, trouves = []) {
  switch (etape.type) {
    case 'verbes': {
      const n = c.propositions.filter((p) => p.verbe && p.conjuguee).length;
      const premier = c.propositions.find((p) => p.verbe && p.conjuguee).verbe;
      return [
        'Ajoute « Hier, » ou « Demain, » au début de la phrase : quels mots changent ?',
        'Essaie d’encadrer les mots par « ne… pas » : seul un verbe conjugué le permet.',
        `Il y a ${pluriel(n, 'verbe')} conjugué${n > 1 ? 's' : ''} dans cette phrase.`,
        { texte: `Le premier verbe conjugué est ${cite(c, premier.jetons)}.`, montre: premier.jetons },
      ];
    }
    case 'sujets': {
      const { prop } = item;
      if (!item.attendu.length) {
        return ['Ce verbe est-il à l’impératif ? (un ordre, un conseil)', 'À l’impératif, le sujet n’est pas exprimé : choisis « Pas de sujet ».'];
      }
      const [q1] = M.questionSujet(c.jetons, prop.verbe.jetons);
      const avant = item.attendu[0] < prop.verbe.jetons[0];
      return [
        `Pose la question : « ${q1} »`,
        `Le sujet est placé ${avant ? 'avant' : 'après'} le verbe et compte ${pluriel(item.attendu.length, 'mot')}.`,
        `Il commence par « ${c.jetons[item.attendu[0]].texte} ».`,
        { texte: `Réponse : ${M.encadreSujet(c.jetons, item.attendu, prop.verbe.jetons)}`, montre: item.attendu },
      ];
    }
    case 'fonctions': {
      const restant = item.cibles.find((g) => !trouves.includes(g));
      if (!restant) return [];
      const debut = c.jetons[restant.jetons[0]].texte;
      return [
        'Pour chaque groupe qui reste, essaie de le supprimer puis de le déplacer en tête de phrase.',
        `Il reste ${pluriel(item.cibles.length - trouves.length, 'complément')} à trouver. Regarde le groupe qui commence par « ${debut} ».`,
        `Supprime-le : ${phrase(M.supprime(M.champ(c.jetons, item.prop.jetons, restant.jetons), restant.jetons))}. Déplace-le : ${phrase(M.deplace(M.champ(c.jetons, item.prop.jetons, restant.jetons), restant.jetons).texte)}. Ces phrases sont-elles correctes ?`,
        { texte: `${cite(c, restant.jetons)} est ${article(restant.fonction)}.`, montre: restant.jetons },
      ];
    }
    case 'expansions': {
      const restant = item.cibles.find((g) => !trouves.includes(g));
      if (!restant) return [];
      return [
        'Repère les noms de la phrase, puis cherche ce qui les complète.',
        `Regarde autour du nom ${cite(c, noyauDe(c, restant))}.`,
        `L’expansion commence par « ${c.jetons[restant.jetons[0]].texte} ».`,
        { texte: `${cite(c, restant.jetons)} est ${article(restant.fonction)}.`, montre: restant.jetons },
      ];
    }
    case 'propositions': {
      const p = item.prop;
      return [
        'Regarde le premier mot de la proposition : est-ce un mot subordonnant (qui, que, dont, où, quand, parce que…) ?',
        'Une autre proposition dépend-elle de celle-ci ? Peut-elle être employée seule ?',
        { texte: `C’est une ${PROPOSITIONS[p.type].nom.toLowerCase()}.` },
      ];
    }
    case 'identite': {
      const id = item.identite;
      return [
        'Pour trouver l’infinitif, mets le verbe après « il faut » ; pour un temps composé, prends le participe passé.',
        id.compose ? 'Le verbe est en deux mots : c’est un temps composé. Le temps de l’auxiliaire te donne le temps composé (présent → passé composé, imparfait → plus-que-parfait…).' : 'Le verbe est en un seul mot : c’est un temps simple.',
        'Pour la personne, remplace le sujet par un pronom personnel (je, tu, il, nous, vous, ils).',
        { texte: `Réponse : ${reponseIdentite(id)}.` },
      ];
    }
    case 'predicat':
      return [
        'Le prédicat, c’est ce que l’on dit du sujet : le verbe et ses compléments.',
        'Enlève le sujet et les compléments de phrase (ceux qu’on peut supprimer et déplacer) : le reste est le prédicat.',
        { texte: `Réponse : ${cite(c, item.attendu)}.`, montre: item.attendu },
      ];
    case 'groupes':
      return [
        'Regarde le premier mot du groupe, puis cherche le mot autour duquel il est construit. Attention : « au, aux, du, des » contiennent une préposition (au = à + le).',
        `${GROUPES[item.nature.code].aide}${item.nature.code === 'GP' ? ' Son noyau est le mot introduit par la préposition, pas la préposition elle-même.' : ''}`,
        { texte: `Réponse : ${GROUPES[item.nature.code].nom.toLowerCase()}${item.nature.noyau !== null && item.nature.noyau !== undefined ? `, de noyau « ${c.jetons[item.nature.noyau].texte} »` : ''}.`, montre: item.nature.noyau !== null && item.nature.noyau !== undefined ? [item.nature.noyau] : [] },
      ];
    case 'phrase':
      return [
        'Le type dépend de ce que fait la phrase : affirmer, questionner ou ordonner.',
        'Les formes s’ajoutent au type : y a-t-il une négation ? une voix passive ? un point d’exclamation ?',
        { texte: `Réponse : type ${TYPES_PHRASE[item.attendu.type].nom.toLowerCase()}${Object.keys(item.attendu.formes).filter((f) => item.attendu.formes[f]).map((f) => `, forme ${FORMES_PHRASE[f].nom.toLowerCase()}`).join('')}.` },
      ];
    case 'natures':
      return [
        'Le mot est-il précédé d’un déterminant ? Peut-on le conjuguer ? Remplace-t-il un nom ?',
        { texte: `« ${item.unite.texte} » est ${libelleNature(item.attendu)}.` },
      ];
    default:
      return [];
  }
}

// Fonctions proposées à l'élève à chaque étape, selon le niveau.
export function fonctionsProposees(etape, niveau) {
  // Au cycle 3, on demande seulement « expansion du nom » (et le complément
  // de l'adjectif reste hors programme).
  if (etape === 'expansions' && niveau === 'c3') return [{ code: 'EXP', nom: FONCTIONS.EXP.court, definition: FONCTIONS.EXP.definition }];
  const place = etape === 'expansions' ? 'groupe' : 'phrase';
  return Object.entries(FONCTIONS)
    .filter(([code, f]) => f.place === place && auNiveau(f.niveau, niveau) && code !== 'V' && code !== 'S')
    .map(([code, f]) => ({ code, nom: f.court, definition: f.definition }));
}

// --- Identité du verbe ------------------------------------------------------------------

export function identiteDe(c, p) {
  let sujet = null;
  if (p.sujet) {
    sujet = traitsSujet(c.jetons, p.sujet.jetons);
    // Pronom relatif sujet : la personne est celle de l'antécédent
    // (« le chien qui aboie » → 3e personne du singulier).
    if (!sujet) sujet = traitsSujet(c.jetons, antecedent(c, p.sujet.jetons[0])) ?? { personne: 3, nombre: null };
  }
  const passif = p.complements.some((g) => g.fonction === 'CAG') || formePassive(c.jetons, p.verbe.jetons);
  return identiteVerbe(c.jetons, p.verbe.jetons, { sujet, passif });
}

// Le groupe nominal placé juste avant un pronom relatif : « [les touristes] qui… ».
function antecedent(c, i) {
  const avant = [];
  for (let k = i - 1; k >= 0 && avant.length < 5; k--) {
    if (c.jetons[k].ponct) break;
    avant.unshift(k);
    if (categorie(natureDuJeton(c, k) ?? '') === 'det') break;
  }
  return avant;
}

// Réponse type pour les messages : la première possibilité.
export function reponseIdentite(id) {
  const p = id.possibilites[0];
  return `${id.infinitifs[0]}, ${libelleTemps(p.mode, p.temps).toLowerCase()}, ${libellePersonne(p.personne, p.nombre)}${id.voix === 'passive' ? ', voix passive' : ''}`;
}

export function verifieInfinitif(id, saisie) {
  if (!saisie.trim()) return faux('Écris l’infinitif du verbe.');
  if (verifieIdentite(id, { infinitif: saisie }).infinitif) return juste(`Oui, c’est le verbe « ${id.infinitifs[0]} ».`);
  return faux(id.compose
    ? 'Pour un temps composé, l’infinitif est celui du participe passé, pas celui de l’auxiliaire (« a mangé » → manger).'
    : 'Ce n’est pas cet infinitif. Mets le verbe après « il faut » : « il faut… ».');
}

export function verifieTemps(id, mode, temps) {
  const r = verifieIdentite(id, { mode, temps });
  if (r.temps) return juste(`Oui : ${libelleTemps(mode, temps).toLowerCase()}.`);
  if (!r.mode) return faux(`Ce n’est pas le mode ${TEMPS_VERBAUX[mode].nom.toLowerCase()}.${mode === 'imp' ? ' Le verbe a un sujet exprimé.' : ''}`);
  const compose = ['pc', 'pqp', 'pa', 'fa', 'cp', 'sp', 'spqp', 'ip'].includes(temps);
  if (compose !== id.compose && id.voix === 'active') {
    return faux(id.compose ? 'Le verbe est en deux mots (auxiliaire + participe passé) : c’est un temps composé.' : 'Le verbe est en un seul mot : c’est un temps simple.');
  }
  if (id.voix === 'passive') return faux('À la voix passive, le temps est celui de l’auxiliaire « être » : « est attrapée » est au présent, « a été attrapée » au passé composé.');
  return faux('Bon mode, mais pas le bon temps. Compare avec le même verbe à la 1re personne.');
}

export function verifiePersonne(id, mode, temps, personne, nombre) {
  if (verifieIdentite(id, { mode, temps, personne, nombre }).personne) return juste(`Oui : ${libellePersonne(personne, nombre)}.`);
  return faux('Regarde le sujet : quel pronom personnel pourrait le remplacer (je, tu, il, nous, vous, ils) ?');
}

export function tempsProposes(niveau) {
  return Object.entries(TEMPS_VERBAUX).filter(([, m]) => auNiveau(m.niveau, niveau))
    .map(([code, m]) => ({ code, nom: m.nom, temps: Object.entries(m.temps).map(([t, nom]) => ({ code: t, nom })) }));
}

// --- Prédicat ---------------------------------------------------------------------------------

// Le prédicat : ce que l'on dit du sujet, c'est-à-dire le verbe et ses
// compléments (COD, COI, attribut, complément d'agent), négation comprise,
// mais sans le sujet ni les compléments circonstanciels (compléments de phrase).
export function predicatDe(c, p) {
  const hors = new Set([
    ...(p.sujet?.jetons ?? []),
    ...p.complements.filter((g) => ['CC', 'MOD', 'CONN'].includes(g.fonction)).flatMap((g) => g.jetons),
  ]);
  return p.jetons.filter((i) => !hors.has(i) && !c.jetons[i].ponct && !c.jetons[i].euphonique
    && !(i < p.verbe.jetons[0] && ['conj.coord'].includes(natureDuJeton(c, i))));
}

export function verifiePredicat(c, item, selection) {
  const sel = sansPonct(c, selection).filter((i) => !c.jetons[i].euphonique);
  const attendu = item.attendu;
  if (memes(sel, attendu)) return juste(`Oui : le prédicat est ${cite(c, attendu)}. C’est ce que l’on dit du sujet.`);
  const sujet = item.prop.sujet?.jetons ?? [];
  if (sel.some((i) => sujet.includes(i))) return faux('Le sujet ne fait pas partie du prédicat : le prédicat, c’est ce que l’on dit du sujet.');
  const cc = item.prop.complements.filter((g) => g.fonction === 'CC').find((g) => g.jetons.some((i) => sel.includes(i)));
  if (cc) return faux(`${cite(c, cc.jetons)} est un complément de phrase (on peut le supprimer et le déplacer) : il ne fait pas partie du prédicat.`);
  const manque = attendu.filter((i) => !sel.includes(i));
  if (manque.some((i) => ['ne', "n'", 'pas', 'plus', 'jamais'].includes(normalise(c.jetons[i].texte)))) {
    return faux('La négation (ne… pas) fait partie du prédicat.');
  }
  if (manque.length) return faux('Il manque des mots : le prédicat comprend le verbe et ses compléments (COD, COI, attribut…).');
  return faux('Ta sélection contient des mots qui ne font pas partie du prédicat.');
}

// Articles contractés : ils contiennent une préposition.
const CONTRACTIONS = { au: 'à + le', aux: 'à + les', du: 'de + le', des: 'de + les' };

// --- Nature des groupes ------------------------------------------------------------------------

const natureMot = (c) => (i) => natureDuJeton(c, i);
const estProposition = (c, g) => c.propositions.some((p) => p.type.startsWith('SUB') && memes(sansPonct(c, p.jetons), sansPonct(c, g.jetons)));

function groupesAClasser(c, niveau) {
  const groupes = [
    ...c.propositions.filter((p) => p.conjuguee || p.sujet).flatMap((p) => [p.sujet, ...p.complements].filter(Boolean)),
    ...c.expansions.filter((e) => auNiveau(FONCTIONS[e.fonction].niveau, niveau)),
  ].filter((g) => !['MOD', 'CONN'].includes(g.fonction));
  return groupes.sort((a, b) => a.jetons[0] - b.jetons[0]).map((g) => {
    let nature = natureGroupe(c.jetons, g.jetons, natureMot(c), { proposition: estProposition(c, g), fonction: g.fonction });
    // Nature imposée dans la notation : [CC:temps/GN Hier soir].
    if (g.natureGroupe && nature) nature = { ...nature, code: g.natureGroupe, raison: GROUPES[g.natureGroupe].aide };
    return { groupe: g, nature, demandeNoyau: noyauADemander(nature, g.jetons, c.jetons) };
  }).filter((it) => it.nature);
}

export function groupesProposes() {
  return Object.entries(GROUPES).map(([code, g]) => ({ code, nom: g.nom, definition: g.aide }));
}

export function verifieGroupe(c, item, code) {
  const attendu = item.nature.code;
  if (code === attendu) return juste(`Oui : ${item.nature.raison}`);
  const premier = c.jetons[sansPonct(c, item.groupe.jetons)[0]].texte;
  const contraction = CONTRACTIONS[normalise(premier)];
  const indices = {
    GP: contraction
      ? `Le premier mot, « ${premier} », est la contraction de « ${contraction} » : il contient la préposition « ${contraction.split(' ')[0]} ». Un groupe qui commence par une préposition est un groupe prépositionnel.`
      : `Regarde le premier mot du groupe, « ${premier} » : quelle est sa nature ?`,
    GN: 'Cherche autour de quel mot le groupe est construit : est-ce un nom ?',
    GAdj: 'Le groupe est construit autour d’un mot qui donne une qualité : de quelle nature est-il ?',
    GAdv: 'Le groupe est formé d’un mot invariable qui précise un verbe ou la phrase.',
    GInf: 'Le groupe est construit autour d’un verbe : est-il conjugué ?',
    PRO: `« ${premier} » remplace un nom : de quelle nature est-il ?`,
    SUB: 'Le groupe contient un verbe conjugué : c’est une proposition.',
  };
  return faux(`Ce n’est pas ${code === 'PRO' ? 'un pronom' : code === 'SUB' ? 'une proposition subordonnée' : `un ${GROUPES[code].nom.toLowerCase()}`}. ${indices[attendu]}`);
}

export function verifieNoyau(c, item, i) {
  const n = item.nature.noyau;
  if (i === n) return juste(`Oui : le noyau est « ${c.jetons[n].texte} ».`);
  const choisi = c.jetons[i].texte;
  // Dans un groupe prépositionnel, le mot qui introduit le groupe (« dans »,
  // ou « au » = à + le) n'est pas le noyau.
  const introducteur = sansPonct(c, item.groupe.jetons).slice(0, 3).filter((k) => k < n)
    .some((k) => k === i && (categorie(natureDuJeton(c, k) ?? '') === 'prep' || CONTRACTIONS[normalise(c.jetons[k].texte)]));
  if (item.nature.code === 'GP' && introducteur) {
    const contraction = CONTRACTIONS[normalise(choisi)];
    return faux(`${contraction ? `« ${choisi} » (= ${contraction})` : `« ${choisi} »`} introduit le groupe : ce n’est pas le noyau. Dans un groupe prépositionnel, le noyau est le mot introduit par la préposition (un nom, un pronom ou un infinitif) : lequel est-ce ?`);
  }
  return faux(`Essaie de supprimer « ${choisi} » : le groupe garde-t-il sa construction ? Le noyau est le mot qu’on ne peut pas supprimer, celui qui donne sa nature au groupe.`);
}

// --- Type et formes ------------------------------------------------------------------------------

export function typeFormesDe(c, niveau) {
  const props = c.propositions.filter((p) => p.verbe).map((p) => ({
    jetons: p.jetons,
    verbe: p.verbe.jetons,
    sujet: p.sujet ? p.sujet.jetons : null,
    subordonnee: p.type.startsWith('SUB'),
    passif: p.complements.some((g) => g.fonction === 'CAG') || formePassive(c.jetons, p.verbe.jetons),
  }));
  const calcul = typeEtFormes(c.jetons, props, niveau);
  if (c.type) calcul.type = c.type;
  for (const f of Object.keys(calcul.formes)) calcul.formes[f] = c.formes ? c.formes.includes(f) : Boolean(calcul.formes[f]);
  return calcul;
}

export function verifieType(item, code) {
  const a = item.attendu;
  if (code === a.type) return juste(`Oui : type ${TYPES_PHRASE[code].nom.toLowerCase()}. ${a.raisons.type}`);
  return faux(`Ce n’est pas le type ${TYPES_PHRASE[code].nom.toLowerCase()}. ${TYPES_PHRASE[a.type].aide}`);
}

export function verifieFormes(item, choisies) {
  const a = item.attendu;
  const attendues = Object.keys(a.formes).filter((f) => a.formes[f]);
  const enTrop = choisies.filter((f) => !attendues.includes(f));
  const manquantes = attendues.filter((f) => !choisies.includes(f));
  if (!enTrop.length && !manquantes.length) {
    return juste(attendues.length
      ? `Oui : forme${attendues.length > 1 ? 's' : ''} ${attendues.map((f) => FORMES_PHRASE[f].nom.toLowerCase()).join(' et ')}.`
      : 'Oui : aucune forme particulière, c’est la phrase de base (ni négative, ni passive, ni exclamative).');
  }
  if (enTrop.length) return faux(`La phrase n’est pas de forme ${FORMES_PHRASE[enTrop[0]].nom.toLowerCase()}. ${a.raisons[enTrop[0]] ?? ''}`);
  return faux(`Il manque une forme. ${FORMES_PHRASE[manquantes[0]].aide}`);
}
