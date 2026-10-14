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
