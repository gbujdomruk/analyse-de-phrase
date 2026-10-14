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
// Entre l'auxiliaire et le participe, on tolère la négation et le sujet
// inversé (« n'a pas mangé », « a-t-il mangé »).
export function regroupeVerbes(jetons, selection) {
  const tri = [...new Set(selection)].sort((a, b) => a - b);
  const verbes = [];
  for (const i of tri) {
    const dernier = verbes.at(-1);
    if (dernier) {
      const entre = jetons.slice(dernier.at(-1) + 1, i);
      const lie = entre.every((j) => NEGATION.has(normalise(j.texte)) || j.euphonique || (j.avant === '-' && analyses(j.texte).some((a) => a.n === 'pro.pers')));
      const auxiliaire = estFormeAuxiliaire(jetons[dernier.at(-1)]) || estFormeAuxiliaire(jetons[dernier[0]]);
      const participe = formesNonConjuguees(jetons[i].texte).some((f) => f.mode === 'par');
      if (lie && auxiliaire && participe) { dernier.push(i); continue; }
    }
    verbes.push([i]);
  }
  return verbes;
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
      const auxAvant = participe && selection.some((k) => k < i && estFormeAuxiliaire(jetons[k]));
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
    const suite = jetons.slice(v[0] + 1, v[0] + 5).find((j) => !j.ponct && !NEGATION.has(normalise(j.texte)) && !j.euphonique && j.avant !== '-');
    if (suite && !selection.includes(suite.i) && formesNonConjuguees(suite.texte).some((f) => f.mode === 'par' && f.temps === 'pas')
      && !analyses(suite.texte).some((a) => a.n === 'adj' && !a.rare)) {
      remarques.push({ i: v[0], type: 'attention', texte: `« ${jetons[v[0]].texte} ${suite.texte} » est peut-être un verbe à un temps composé : sélectionne aussi le participe « ${suite.texte} ».` });
    }
  }
  return remarques;
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
      texte: 'Voici la phrase sans le groupe. Est-elle correcte et garde-t-elle son sens principal ?',
      exemple: M.supprime(jetons, groupe),
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (!('deplace' in r)) {
    return {
      id: 'deplace',
      titre: 'Test de déplacement',
      texte: 'Voici la phrase avec le groupe déplacé en tête. Est-elle correcte ?',
      exemple: M.deplaceEnTete(jetons, groupe),
      reponses: [{ id: 'oui', texte: 'Oui' }, { id: 'non', texte: 'Non' }],
    };
  }
  if (r.supprime === 'oui' && r.deplace === 'oui') {
    if (!('circonstance' in r)) {
      return {
        id: 'circonstance',
        titre: 'Le sens du complément',
        texte: 'Le groupe peut être supprimé et déplacé : c’est un complément circonstanciel. À quelle question répond-il ?',
        reponses: Object.entries(CIRCONSTANCES).filter(([, c]) => auNiveau(c.niveau, ctx.niveau))
          .map(([id, c]) => ({ id, texte: `${c.question} (${c.nom})` }))
          .concat([{ id: 'autre', texte: 'Je ne sais pas' }]),
      };
    }
    const circ = CIRCONSTANCES[r.circonstance];
    return conclusion('CC', circ ? `complément circonstanciel de ${circ.nom}` : 'complément circonstanciel', [
      'On peut le supprimer : il n’est pas indispensable.',
      'On peut le déplacer : il n’est pas lié au verbe.',
    ], r.circonstance !== 'autre' ? r.circonstance : null);
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
      texte: 'Ce groupe complète-t-il un nom ou un adjectif ?',
      reponses: [{ id: 'nom', texte: 'Un nom' }, { id: 'adj', texte: 'Un adjectif' }],
    };
  }
  if (r.complete === 'adj') {
    return conclusion('CADJ', 'complément de l’adjectif', ['Le groupe complète un adjectif.', prep ? `Il est introduit par la préposition « ${premier.texte} ».` : '']);
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
  if (mot === 'que' || mot === "qu'") {
    const precedentNom = precedent && naturesPossibles(precedent.texte).some((n) => n.startsWith('nom'));
    return precedentNom
      ? { code: 'pro.rel', raison: '« que » suit un nom qu’il peut reprendre (son antécédent) : c’est sans doute un pronom relatif.' }
      : { code: 'conj.sub', raison: '« que » ne suit pas un nom : il relie sans doute une proposition à un verbe (conjonction de subordination).' };
  }
  return { code: possibles[0], raison: 'Plusieurs natures sont possibles : la première est la plus fréquente. Vérifie avec la fiche méthode.' };
}

export { normalise };
