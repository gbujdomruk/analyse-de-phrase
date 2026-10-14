// Découpage d'une phrase française en mots (« jetons »).
// Chaque jeton garde sa position dans le texte, pour pouvoir réafficher
// la phrase telle qu'elle a été écrite.

const LETTRE = "[\\p{L}\\p{N}]";
const APOS = "['’]";
// Un mot : lettres/chiffres, avec apostrophes et traits d'union internes.
const MOT = new RegExp(`${LETTRE}+(?:(?:${APOS}|-)${LETTRE}+)*${APOS}?`, 'gu');
const PONCTUATION = /\.\.\.|…|[.,;:!?«»"“”()\[\]—–]|-(?!\p{L})/gu;

// Mots qui gardent leur apostrophe interne.
const ELISIONS_FIGEES = new Set([
  "aujourd'hui", "presqu'île", "presqu'îles", "prud'homme", "prud'hommes",
  "quelqu'un", "quelqu'une", "quelques-uns", "entr'ouvrir", "c'est-à-dire",
]);

// Mots élidés qui se détachent du mot suivant : l'arbre → l' + arbre.
const ELIDES = new Set([
  "l'", "d'", "j'", "m'", "t'", "s'", "n'", "c'", "qu'", "jusqu'", "lorsqu'",
  "puisqu'", "quoiqu'",
]);

// Pronoms qui se détachent après un trait d'union : dis-moi, a-t-il, va-t'en.
const CLITIQUES = new Set([
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'moi', 'toi',
  'lui', 'leur', 'le', 'la', 'les', 'en', 'y', 'ce', 'eux',
]);

export const normalise = (s) => s.replace(/’/g, "'").toLowerCase();

// `estMotCompose(forme)` permet de garder entiers les mots composés connus
// du dictionnaire (rendez-vous, peut-être…).
export function decoupe(texte, estMotCompose = () => false) {
  const jetons = [];
  const morceaux = [];
  const re = new RegExp(`${MOT.source}|${PONCTUATION.source}`, 'gu');
  for (const m of texte.matchAll(re)) morceaux.push({ texte: m[0], debut: m.index });

  for (const { texte: brut, debut } of morceaux) {
    if (!/\p{L}|\p{N}/u.test(brut)) {
      jetons.push({ texte: brut, debut, fin: debut + brut.length, ponct: true });
      continue;
    }
    for (const p of separe(brut, estMotCompose)) {
      jetons.push({ texte: p.texte, debut: debut + p.decalage, fin: debut + p.decalage + p.texte.length, ponct: false });
    }
  }
  jetons.forEach((j, i) => {
    j.i = i;
    // Ce qui sépare le jeton du précédent : espace, trait d'union ou rien.
    const avant = i > 0 ? texte.slice(jetons[i - 1].fin, j.debut) : '';
    j.avant = /\s/.test(avant) ? ' ' : avant;
    j.euphonique = j.texte === '-t-';
  });
  return jetons;
}

// Sépare un mot brut en élisions, mot principal et pronoms postposés.
function separe(brut, estMotCompose) {
  const n = normalise(brut);
  if (ELISIONS_FIGEES.has(n) || estMotCompose(n)) return [{ texte: brut, decalage: 0 }];

  // Élisions en tête : l'homme, qu'il, jusqu'à…
  const apos = n.search(/'/);
  if (apos > 0 && apos < n.length - 1) {
    const tete = n.slice(0, apos + 1);
    if (ELIDES.has(tete)) {
      const reste = separe(brut.slice(apos + 1), estMotCompose);
      return [{ texte: brut.slice(0, apos + 1), decalage: 0 },
        ...reste.map((r) => ({ ...r, decalage: r.decalage + apos + 1 }))];
    }
  }

  // Inversion : a-t-il, va-t'en, dis-moi, donne-le-lui.
  const parties = brut.split('-');
  if (parties.length > 1) {
    const resultat = [];
    let tete = parties[0];
    let i = 1;
    // On rattache au mot principal les parties qui ne sont pas des pronoms
    // (porte-monnaie reste entier s'il n'est pas dans le dictionnaire).
    while (i < parties.length && !CLITIQUES.has(normalise(parties[i]).replace(/'$/, '')) && normalise(parties[i]) !== 't' && !normalise(parties[i]).startsWith("t'")) {
      tete += '-' + parties[i];
      i++;
    }
    if (i === parties.length) return [{ texte: brut, decalage: 0 }];
    resultat.push({ texte: tete, decalage: 0 });
    let pos = tete.length;
    for (; i < parties.length; i++) {
      const p = parties[i];
      if (normalise(p) === 't') {
        resultat.push({ texte: '-t-', decalage: pos });
        pos += 2; // « -t » ; le trait d'union suivant est inclus dans « -t- »
        continue;
      }
      if (normalise(p).startsWith("t'")) {
        // va-t'en : « t' » est un pronom élidé (te)
        resultat.push({ texte: p.slice(0, 2), decalage: pos + 1 });
        resultat.push({ texte: p.slice(2), decalage: pos + 3 });
        pos += 1 + p.length;
        continue;
      }
      resultat.push({ texte: p, decalage: pos + 1 });
      pos += 1 + p.length;
    }
    return resultat;
  }
  return [{ texte: brut, decalage: 0 }];
}

// Réaffiche une suite de jetons avec les espaces d'origine.
export function recompose(jetons) {
  return jetons.map((j, k) => (k > 0 ? j.avant : '') + j.texte).join('');
}
