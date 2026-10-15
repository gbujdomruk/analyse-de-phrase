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
  verifieInfinitif, verifieTemps, verifiePersonne, verifiePredicat,
  verifieGroupe, verifieNoyau, verifieType, verifieFormes,
} from '../js/core/exercice.js';

const ids = new Set();

for (const entree of PHRASES) {
  test(`banque : ${entree.id}`, () => {
    assert.ok(!ids.has(entree.id), 'identifiant en double');
    ids.add(entree.id);
    const c = construitCorrige(entree, estMotCompose);
    // Une phrase réservée à un thème (« seulement ») n'a pas forcément d'analyse complète.
    if (!entree.seulement) for (const p of c.propositions) assert.ok(p.verbe, `proposition sans verbe : ${p.type}`);
    for (const u of c.natures ?? []) assert.ok(NATURES[u.nature], `nature inconnue : ${u.nature}`);

    // Les bonnes réponses doivent être acceptées à chaque niveau possible.
    for (const niveau of ['c3', 'c4', 'lycee'].slice(['c3', 'c4', 'lycee'].indexOf(entree.niveau))) {
      const ex = creeExercice(c, entree.seulement?.[0] ?? 'complete', niveau, { vocabulaire: 'predicat' });
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
          if (etape.type === 'identite') {
            const id = item.identite;
            const p = id.possibilites[0];
            for (const v of [verifieInfinitif(id, id.infinitifs[0]), verifieTemps(id, p.mode, p.temps)]) assert.equal(v.statut, 'juste', v.message);
            r = verifiePersonne(id, p.mode, p.temps, p.personne, p.nombre);
          }
          if (etape.type === 'predicat') r = verifiePredicat(c, item, item.attendu);
          if (etape.type === 'groupes') {
            r = verifieGroupe(c, item, item.nature.code);
            if (item.demandeNoyau) assert.equal(verifieNoyau(c, item, item.nature.noyau).statut, 'juste');
          }
          if (etape.type === 'phrase') {
            assert.equal(verifieType(item, item.attendu.type).statut, 'juste');
            r = verifieFormes(item, Object.keys(item.attendu.formes).filter((f) => item.attendu.formes[f]));
          }
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
