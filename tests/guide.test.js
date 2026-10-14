import './outils.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decoupe, recompose } from '../js/core/decoupage.js';
import { estMotCompose } from '../js/core/lexique.js';
import * as M from '../js/core/manipulations.js';
import * as G from '../js/core/guide.js';

const D = (s) => decoupe(s, estMotCompose);
const textes = (s) => D(s).map((j) => j.texte);

test('découpage : élisions, inversions, mots composés', () => {
  assert.deepEqual(textes("L'homme qu'il a vu"), ["L'", 'homme', "qu'", 'il', 'a', 'vu']);
  assert.deepEqual(textes('A-t-il mangé ?'), ['A', '-t-', 'il', 'mangé', '?']);
  assert.deepEqual(textes("Va-t'en !"), ['Va', "t'", 'en', '!']);
  assert.deepEqual(textes("Un rendez-vous aujourd'hui."), ['Un', 'rendez-vous', "aujourd'hui", '.']);
  for (const s of ["Dis-moi pourquoi, s'il te plaît…", 'Il a dit : « Viens ! »']) assert.equal(recompose(D(s)), s);
});

test('manipulations : suppression, déplacement, encadrement', () => {
  const j = D('Le chat de la voisine dort sur le canapé.');
  assert.equal(M.supprime(j, [6, 7, 8]), 'Le chat de la voisine dort.');
  assert.equal(M.deplaceEnTete(j, [6, 7, 8]), 'Sur le canapé, le chat de la voisine dort.');
  assert.equal(M.encadreSujet(j, [0, 1, 2, 3, 4], [5]), "C'est le chat de la voisine qui dort sur le canapé.");
  const k = D('Marie a donné un livre à son frère.');
  assert.equal(M.encadreSujet(k, [0], [1, 2]), "C'est Marie qui a donné un livre à son frère.");
  assert.equal(M.encadreSujet(D('Ils dorment.'), [0], [1]), 'Ce sont eux qui dorment.');
});

test('verbes : temps composés et remarques', () => {
  const j = D("Les enfants n'ont pas mangé la soupe.");
  assert.deepEqual(G.regroupeVerbes(j, [3, 5]), [[3, 5]]);
  assert.match(G.remarquesVerbes(j, [3])[0].texte, /temps composé/);
  assert.match(G.remarquesVerbes(j, [4])[0].texte, /négation/);
});

test('accord sujet-verbe', () => {
  assert.equal(G.verifieAccord(D('Le chat dort.'), [0, 1], [2]), null);
  assert.match(G.verifieAccord(D('Le chat dorment.'), [0, 1], [2]), /accord/);
  assert.equal(G.verifieAccord(D('Paul et Marie dansent.'), [0, 1, 2], [3]), null);
});

// Déroule l'arbre de décision avec les réponses données.
function conclut(phrase, groupe, verbe, sujet, reponses, autres = []) {
  const ctx = { jetons: D(phrase), groupe, verbe, sujet, niveau: 'c4', autres };
  const chemin = [];
  let q = G.premiereQuestion(ctx);
  for (const r of reponses) { chemin.push({ question: q.id, reponse: r }); q = G.questionSuivante(ctx, chemin); }
  assert.ok(q.conclusion, `pas de conclusion : ${q.id}`);
  return q.fonction;
}

test('arbre des fonctions', () => {
  assert.equal(conclut('Le chat dort sur le canapé.', [3, 4, 5], [2], [0, 1], ['oui', 'oui', 'lieu']), 'CC');
  assert.equal(conclut('Le chat mange une souris.', [3, 4], [2], [0, 1], ['non', 'non']), 'COD');
  assert.equal(conclut('Le facteur parle à sa collègue.', [3, 4, 5], [2], [0, 1], ['oui', 'non', 'oui']), 'COI');
  assert.equal(conclut('Ma sœur est très gentille.', [3, 4], [2], [0, 1], ['non', 'non', 'oui']), 'ATS');
  assert.equal(conclut('La souris a été attrapée par le chat.', [5, 6, 7], [2, 3, 4], [0, 1], ['non', 'non', 'oui']), 'CAG');
  assert.equal(conclut('Il mange du pain.', [2, 3], [1], [0], ['non', 'non', 'article']), 'COD');
  assert.equal(conclut('Il parle du film.', [2, 3], [1], [0], ['non', 'non', 'prep']), 'COI');
  assert.equal(conclut('Paul lui a offert un cadeau.', [1], [2, 3], [0], []), 'COI');
  assert.equal(conclut('Il me parle.', [1], [2], [0], ['oui']), 'COI');
  assert.equal(conclut('On a élu Alice présidente.', [4], [1, 2], [0], ['non', 'non', 'oui'], [{ fonction: 'COD', jetons: [3] }]), 'ATO');
});

test('natures : locutions et indices de contexte', () => {
  const j = D("Je pense que tu as raison parce qu'il fait beau.");
  const unites = G.unitesNatures(j, [[1], [4]]);
  assert.ok(unites.some((u) => u.texte === "parce qu'" && u.locution === 'conj.sub'));
  const k = D('La porte que les enfants ont fermée les protège.');
  const nat = Object.fromEntries(G.unitesNatures(k, [[5, 6], [8]]).map((u) => [`${u.texte}@${u.jetons[0]}`, G.candidatsNature(k, u).probable]));
  assert.equal(nat['porte@1'], 'nom.c');
  assert.equal(nat['les@3'], 'det.def');
  assert.equal(nat['les@7'], 'pro.pers');
  assert.equal(nat['que@2'], 'pro.rel');
});

test('être + participe : adverbe intercalé et ambiguïté signalée', () => {
  const j = D("J'en fais, précisément, pour m'entraîner, mais là, je suis totalement égarée");
  assert.deepEqual(G.regroupeVerbes(j, [2, 14, 16]), [[2], [14, 16]]);
  assert.deepEqual(G.regroupeVerbes(j, [2, 14, 16], new Set([16])), [[2], [14]]);
  assert.equal(G.ambiguitesEtre(j, [2, 14, 16]).length, 1);
  assert.match(G.remarquesVerbes(j, [2, 14])[0].texte, /attribut du sujet/);
  // Pas d'ambiguïté avec un verbe qui se conjugue avec être ni avec avoir.
  assert.equal(G.ambiguitesEtre(D('Elle est vite partie.'), [1, 3]).length, 0);
  assert.equal(G.ambiguitesEtre(D('Il a totalement oublié.'), [1, 3]).length, 0);
  assert.equal(G.ambiguitesEtre(D('Je me suis égarée.'), [2, 3]).length, 0);
});

test('pronom « en » : quantité ou préposition « de »', () => {
  assert.equal(conclut("J'en fais.", [1], [2], [0], ['quantite']), 'COD');
  assert.equal(conclut("J'en parle.", [1], [2], [0], ['de']), 'COI');
});

test('adverbe détaché : circonstance, modalisateur ou connecteur', () => {
  const p = "J'en fais, précisément, pour m'entraîner.";
  assert.equal(conclut(p, [4], [2], [0], ['oui', 'oui', 'lien']), 'CONN');
  assert.equal(conclut('Heureusement, il est venu.', [0], [3, 4], [2], ['oui', 'oui', 'avis']), 'MOD');
  assert.equal(conclut('Hier, il est venu.', [0], [3, 4], [2], ['oui', 'oui', 'circonstance', 'temps']), 'CC');
  // Un groupe qui ne répond à aucune question de circonstance
  assert.equal(conclut('Selon les journalistes, la réunion est annulée.', [0, 1, 2], [6, 7], [4, 5], ['oui', 'oui', 'aucune', 'avis']), 'MOD');
});

test('sélection : mot-outil seul ou groupe incomplet', () => {
  const j = D("J'en fais, précisément, pour m'entraîner, mais là, je suis totalement égarée");
  const pour = G.verifieSelection(j, [6]);
  assert.match(pour.message, /préposition/);
  assert.deepEqual(pour.suggestion, [6, 7, 8]);
  assert.match(G.verifieSelection(j, [10]).message, /coordination/);
  assert.deepEqual(G.verifieSelection(j, [7, 8]).suggestion, [6, 7, 8]);
  assert.equal(G.verifieSelection(j, [6, 7, 8]), null);
  const k = D('Le chat de la voisine dort sur le canapé.');
  assert.deepEqual(G.verifieSelection(k, [7], new Set([5])).suggestion, [7, 8]);
  assert.deepEqual(G.verifieSelection(k, [6, 7], new Set([5])).suggestion, [6, 7, 8]);
  assert.match(G.verifieSelection(k, [6, 8]).message, /seul tenant/);
  assert.equal(G.verifieSelection(k, [6, 7, 8]), null);
});

test('« en » : pronom devant un verbe, préposition devant un nom', () => {
  const j = D("J'en fais en hiver.");
  assert.equal(G.candidatsNature(j, { jetons: [1], locution: null }).probable, 'pro.adv');
  assert.equal(G.candidatsNature(j, { jetons: [3], locution: null }).probable, 'prep');
  assert.equal(G.verifieSelection(j, [1]), null);
});

test('les tests se font dans la proposition du verbe', () => {
  const j = D("J'en fais, précisément, pour m'entraîner, mais là, je suis totalement égarée");
  const props = G.delimitePropositions(j, [[2], [14]]);
  const champ = M.champ(j, props[1], [11]);
  assert.equal(M.supprime(champ, [11]), 'Je suis totalement égarée');
  // « là » est déjà en tête de sa proposition : on le déplace à la fin.
  assert.deepEqual(M.deplace(champ, [11]), { texte: 'Je suis totalement égarée là', ou: 'fin' });
  const k = D('Il pleut et les enfants jouent dans le salon.');
  const pk = G.delimitePropositions(k, [[1], [5]]);
  assert.equal(M.deplace(M.champ(k, pk[1], [6, 7, 8]), [6, 7, 8]).texte, 'Dans le salon, les enfants jouent.');
  const l = D('Quand la cloche sonne le soir, les élèves rangent leurs affaires.');
  const pl = G.delimitePropositions(l, [[3], [10]]);
  assert.equal(M.deplace(M.champ(l, pl[0], [4, 5]), [4, 5]).texte, 'Quand, le soir, la cloche sonne');
});

test('délimitation des propositions : emboîtement, inversion, coordination', () => {
  const props = (s, verbes) => {
    const j = D(s);
    return G.delimitePropositions(j, verbes).map((p) => p.map((i) => j[i].texte).join(' '));
  };
  assert.deepEqual(props('Je regarde le chat qui dort sur le canapé.', [[1], [5]]), ['Je regarde le chat', 'qui dort sur le canapé']);
  assert.deepEqual(props('Le chat qui dort sur le canapé appartient à ma voisine.', [[3], [7]]), ['qui dort sur le canapé', 'Le chat appartient à ma voisine']);
  assert.deepEqual(props('Dans la forêt où vivent les loups, les lapins se cachent.', [[4], [10]]), ['où vivent les loups', 'Dans la forêt les lapins se cachent']);
  assert.deepEqual(props("Quand arrive l'hiver, partent les oiseaux.", [[1], [5]]), ["Quand arrive l' hiver", 'partent les oiseaux']);
  assert.deepEqual(props("J'aime le chat qui dort et qui ronronne.", [[1], [5], [8]]), ["J' aime le chat", 'qui dort', 'qui ronronne']);
  assert.deepEqual(props('Il pleut et les enfants jouent dans le salon.', [[1], [5]]), ['Il pleut', 'les enfants jouent dans le salon']);
});

test('groupe d\'une autre proposition et connecteur retiré du test', () => {
  const j = D("J'en fais, précisément, pour m'entraîner, mais là, je suis totalement égarée");
  const props = G.delimitePropositions(j, [[2], [14]]);
  assert.equal(G.autreProposition([11], props, [[2], [14]], 0), 1);
  assert.equal(G.autreProposition([6, 7, 8], props, [[2], [14]], 0), -1);
  const k = D('Je crois que Léa viendra demain.');
  const pk = G.delimitePropositions(k, [[1], [4]]);
  assert.equal(G.autreProposition([2, 3, 4, 5], pk, [[1], [4]], 0), -1); // subordonnée COD entière
  const ctx = { jetons: j, verbe: [2], sujet: [0], groupe: [6, 7, 8], proposition: props[0], niveau: 'c3', autres: [{ fonction: 'CONN', jetons: [4] }] };
  assert.equal(G.questionSuivante(ctx, [{ question: 'supprime', reponse: 'oui' }]).exemple, "Pour m'entraîner, j'en fais");
  assert.equal(G.premiereQuestion(ctx).exemple, "J'en fais");
});
