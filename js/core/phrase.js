// Type et formes de la phrase (terminologie I.2.4, I.2.5, II.1.8).
// La forme se juge sur les propositions principales ou indépendantes :
// un verbe passif dans une subordonnée ne rend pas la phrase passive.

import { VERBES_EN_ETRE } from '../data/mots-outils.js';
import { FORMES_PHRASE, auNiveau } from '../data/terminologie.js';
import { lemmesVerbaux, formesNonConjuguees } from './lexique.js';
import { normalise } from './decoupage.js';

const NEGATION = new Set(['ne', "n'"]);
// Verbes qui n'existent qu'avec un « il » impersonnel (il faut, il pleut).
const VERBES_IMPERSONNELS = new Set(['falloir', 'pleuvoir', 'neiger', 'grêler', 'venter', 'bruiner', 'brumer']);
const REFLECHIS = new Set(['me', "m'", 'te', "t'", 'se', "s'", 'nous', 'vous']);

// « être » + participe passé d'un verbe qui ne se conjugue pas avec « être ».
export function formePassive(jetons, verbe) {
  const v = verbe.map((i) => jetons[i]).filter((j) => !j.euphonique);
  if (v.length < 2) return false;
  const avant = jetons.slice(0, Math.min(...verbe)).reverse().find((j) => !j.ponct && !NEGATION.has(normalise(j.texte)));
  if (avant && REFLECHIS.has(normalise(avant.texte))) return false;
  const etre = v.slice(0, -1).some((j) => lemmesVerbaux(j.texte).includes('être'));
  const dernier = v.at(-1);
  const participe = formesNonConjuguees(dernier.texte).some((f) => f.mode === 'par' && f.temps === 'pas');
  const lemmes = lemmesVerbaux(dernier.texte);
  return etre && participe && !lemmes.includes('être') && !lemmes.some((l) => VERBES_EN_ETRE.has(l));
}

// propositions : [{ jetons, verbe, sujet (indices ou null), subordonnee, passif? }]
// Renvoie { type, formes } ; chaque forme vaut true, false ou null (inconnu :
// c'est à l'élève de faire le test).
export function typeEtFormes(jetons, propositions, niveau = 'lycee') {
  const principales = propositions.filter((p) => !p.subordonnee);
  const fin = [...jetons].reverse().find((j) => j.ponct && /[.?!…]/.test(j.texte));
  const raisons = {};

  let type;
  if (fin?.texte === '?') { type = 'interrogatif'; raisons.type = 'La phrase se termine par un point d’interrogation : elle pose une question.'; }
  else if (principales.some((p) => p.sujet === null)) { type = 'imperatif'; raisons.type = 'Le verbe principal est à l’impératif, sans sujet exprimé : la phrase donne un ordre ou un conseil.'; }
  else { type = 'declaratif'; raisons.type = 'La phrase affirme quelque chose (elle ne pose pas de question et ne donne pas d’ordre).'; }

  const formes = {};
  const motsPrincipaux = new Set(principales.flatMap((p) => p.jetons));
  const negation = jetons.find((j) => motsPrincipaux.has(j.i) && NEGATION.has(normalise(j.texte)));
  formes.negative = Boolean(negation);
  raisons.negative = negation ? `La proposition principale contient la négation « ${negation.texte} ».` : 'Il n’y a pas de négation (ne… pas, ne… jamais…) dans la proposition principale.';

  const passive = principales.find((p) => p.passif ?? formePassive(jetons, p.verbe));
  formes.passive = Boolean(passive);
  raisons.passive = passive ? 'Le verbe principal est à la voix passive (être + participe passé) : le sujet subit l’action.' : 'Le verbe principal est à la voix active.';

  formes.exclamative = fin?.texte === '!';
  raisons.exclamative = formes.exclamative ? 'La phrase se termine par un point d’exclamation.' : 'Pas de point d’exclamation.';

  const debut = jetons.filter((j) => !j.ponct).slice(0, 3).map((j) => normalise(j.texte)).join(' ');
  const extraction = /^(c' est|ce sont|c' était)/.test(debut) && jetons.some((j) => ['qui', 'que', "qu'"].includes(normalise(j.texte)));
  formes.emphatique = extraction ? true : null;
  raisons.emphatique = extraction ? 'Un constituant est encadré par « c’est… qui / que » : il est mis en relief.' : 'Cherche un constituant encadré par « c’est… qui / que » ou détaché en tête puis repris par un pronom.';

  formes.impersonnelle = null;
  raisons.impersonnelle = 'Le sujet est-il un « il » qui ne désigne rien, et peut-on retourner la phrase avec un autre sujet (« Il est arrivé un accident » → « Un accident est arrivé ») ?';
  // « Il faut », « il pleut » : verbe à la voix impersonnelle, mais pas de
  // phrase personnelle correspondante, donc pas de forme impersonnelle.
  const impersonnel = principales.find((p) => p.sujet?.length === 1 && normalise(jetons[p.sujet[0]].texte) === 'il'
    && lemmesVerbaux(jetons[p.verbe.at(-1)].texte).some((l) => VERBES_IMPERSONNELS.has(l)));
  if (impersonnel) {
    const v = jetons[impersonnel.verbe.at(-1)].texte;
    formes.impersonnelle = false;
    raisons.impersonnelle = `Le verbe « ${v} » est impersonnel (« il » ne désigne rien), mais la phrase n’est pas de forme impersonnelle : aucune phrase personnelle ne lui correspond. La terminologie parle alors d’une phrase « comportant un verbe à la voix impersonnelle ».`;
    raisons.verbeImpersonnel = raisons.impersonnelle;
  }

  // On ne garde que les formes au programme du niveau.
  for (const f of Object.keys(formes)) if (!auNiveau(FORMES_PHRASE[f].niveau, niveau)) delete formes[f];
  return { type, formes, raisons };
}
