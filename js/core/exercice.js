// Moteur du mode « S'entraîner » : à partir d'un corrigé, il prépare les
// étapes de l'exercice, vérifie les réponses de l'élève et fabrique des
// aides graduées. Aucune dépendance au DOM (testable avec Node).

import { FONCTIONS, CIRCONSTANCES, PROPOSITIONS, NATURES, natureAuNiveau, categorie, auNiveau } from '../data/terminologie.js';
import { CONFUSIONS_NATURES } from '../data/methodes.js';
import { INTRODUCTEURS_PREPOSITIONNELS } from '../data/mots-outils.js';
import * as M from './manipulations.js';
import { texteDe, normalise } from './notation.js';
import { formesNonConjuguees } from './lexique.js';

// Thèmes d'entraînement. Une étape suivie de « * » est donnée (affichée
// d'emblée) pour que l'élève se concentre sur la suite.
export const THEMES = {
  verbe: { titre: 'Le verbe conjugué', resume: 'Repérer les verbes conjugués, y compris aux temps composés.', etapes: ['verbes'] },
  sujet: { titre: 'Le sujet', resume: 'Sujets inversés, éloignés, pronoms, groupes longs…', etapes: ['verbes*', 'sujets'] },
  complements: { titre: 'Les compléments', resume: 'COD, COI, attribut du sujet, compléments circonstanciels.', etapes: ['verbes*', 'sujets*', 'fonctions'] },
  expansions: { titre: 'Le groupe nominal', resume: 'Épithète, complément du nom, relative, apposition.', etapes: ['expansions'] },
  natures: { titre: 'La nature des mots', resume: 'Nom, déterminant, pronom, adjectif, préposition…', etapes: ['natures'] },
  propositions: { titre: 'Les propositions', resume: 'Indépendantes, principales, subordonnées.', etapes: ['verbes*', 'propositions'] },
  complete: { titre: 'Analyse complète', resume: 'Toutes les étapes, comme en classe.', etapes: ['verbes', 'sujets', 'fonctions', 'expansions', 'propositions', 'natures'] },
};

export const TITRES_ETAPES = {
  verbes: 'Les verbes conjugués',
  sujets: 'Les sujets',
  fonctions: 'Les compléments',
  expansions: 'Le groupe nominal',
  propositions: 'Les propositions',
  natures: 'La nature des mots',
};

export function phrasesDuTheme(banque, theme, niveau) {
  return banque.filter((p) => auNiveau(p.niveau, niveau)
    && (theme === 'complete' || theme === 'verbe' || p.themes.includes(theme))
    && (theme !== 'natures' || p.natures));
}

// --- Construction de l'exercice --------------------------------------------

export function creeExercice(corrige, theme, niveau) {
  const etapes = [];
  for (const code of THEMES[theme].etapes) {
    const donne = code.endsWith('*');
    const type = code.replace('*', '');
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
  const sansLui = M.supprime(c.jetons, groupe.jetons);
  const enTete = M.deplaceEnTete(c.jetons, groupe.jetons);
  const verbe = cite(c, prop.verbe.jetons);

  if (choisi === 'CC' && attendu !== 'CC') {
    return `Fais les tests. Supprime le groupe : ${phrase(sansLui)}. Déplace-le en tête : ${phrase(enTete)}. Ces phrases sont-elles correctes et gardent-elles le même sens ? Si non, le groupe est lié au verbe : ce n’est pas un complément circonstanciel.`;
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
        `Supprime-le : ${phrase(M.supprime(c.jetons, restant.jetons))}. Déplace-le : ${phrase(M.deplaceEnTete(c.jetons, restant.jetons))}. Ces phrases sont-elles correctes ?`,
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
  const place = etape === 'expansions' ? 'groupe' : 'phrase';
  return Object.entries(FONCTIONS)
    .filter(([code, f]) => f.place === place && auNiveau(f.niveau, niveau) && code !== 'V' && code !== 'S')
    .map(([code, f]) => ({ code, nom: f.court, definition: f.definition }));
}
