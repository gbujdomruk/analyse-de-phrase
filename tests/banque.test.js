import './outils.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHRASES } from '../js/data/phrases.js';
import { construitCorrige } from '../js/core/notation.js';
import { estMotCompose } from '../js/core/lexique.js';
import { NATURES } from '../js/data/terminologie.js';
import {
  THEMES, creeExercice, verifieVerbes, verifieSujet, verifieComplement,
  verifieExpansion, verifieProposition, verifieNature, aides,
} from '../js/core/exercice.js';

const ids = new Set();

for (const entree of PHRASES) {
  test(`banque : ${entree.id}`, () => {
    assert.ok(!ids.has(entree.id), 'identifiant en double');
    ids.add(entree.id);
    const c = construitCorrige(entree, estMotCompose);
    for (const p of c.propositions) assert.ok(p.verbe, `proposition sans verbe : ${p.type}`);
    for (const u of c.natures ?? []) assert.ok(NATURES[u.nature], `nature inconnue : ${u.nature}`);

    // Les bonnes réponses doivent être acceptées à chaque niveau possible.
    for (const niveau of ['c3', 'c4', 'lycee'].slice(['c3', 'c4', 'lycee'].indexOf(entree.niveau))) {
      const ex = creeExercice(c, 'complete', niveau);
      for (const etape of ex.etapes) {
        for (const item of etape.items) {
          let r;
          if (etape.type === 'verbes') r = verifieVerbes(c, item, item.attendu);
          if (etape.type === 'sujets') r = verifieSujet(c, item, item.attendu, !item.attendu.length);
          if (etape.type === 'fonctions' || etape.type === 'expansions') {
            const trouves = [];
            for (const g of item.cibles) {
              const v = etape.type === 'fonctions' ? verifieComplement : verifieExpansion;
              r = v(c, item, g.jetons, g.fonction, trouves);
              assert.equal(r.statut, 'juste', `${etape.type} ${g.fonction} : ${r.message}`);
              trouves.push(g);
            }
          }
          if (etape.type === 'propositions') r = verifieProposition(c, item, item.prop.type);
          if (etape.type === 'natures') r = verifieNature(item, item.attendu, niveau);
          assert.equal(r.statut, 'juste', `${etape.type} (${niveau}) : ${r.message}`);
          for (const a of aides(c, etape, item, niveau)) assert.ok(typeof a === 'string' || a.texte);
        }
      }
    }
  });
}

test('chaque thème a des phrases à chaque niveau', async () => {
  const { phrasesDuTheme } = await import('../js/core/exercice.js');
  for (const theme of Object.keys(THEMES)) {
    for (const niveau of ['c3', 'c4', 'lycee']) {
      assert.ok(phrasesDuTheme(PHRASES, theme, niveau).length >= 2, `${theme} / ${niveau}`);
    }
  }
});
