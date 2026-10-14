// Mots grammaticaux (classes fermées), décrits à la main selon la
// terminologie scolaire. Ils ont priorité sur le dictionnaire Lexique.
// Chaque entrée : nature (code de terminologie.js), genre g (m/f),
// nombre nb (s/p), personne p (1/2/3) quand c'est utile.

const E = (n, g = '', nb = '', p = 0) => ({ n, g, nb, p });

const entrees = {};
function ajoute(formes, ...valeurs) {
  for (const f of formes.split(' ')) (entrees[f] ??= []).push(...valeurs);
}

// --- Déterminants ---
ajoute('le', E('det.def', 'm', 's'), E('pro.pers', 'm', 's', 3));
ajoute('la', E('det.def', 'f', 's'), E('pro.pers', 'f', 's', 3));
ajoute("l'", E('det.def', '', 's'), E('pro.pers', '', 's', 3));
ajoute('les', E('det.def', '', 'p'), E('pro.pers', '', 'p', 3));
ajoute('au', E('det.def', 'm', 's'));
ajoute('aux', E('det.def', '', 'p'));
ajoute('du', E('det.def', 'm', 's'), E('det.part', 'm', 's'));
ajoute('des', E('det.ind', '', 'p'), E('det.def', '', 'p'));
ajoute('un', E('det.ind', 'm', 's'), E('det.num', 'm', 's'), E('pro.indef', 'm', 's', 3));
ajoute('une', E('det.ind', 'f', 's'), E('det.num', 'f', 's'), E('pro.indef', 'f', 's', 3));
ajoute('mon ton son', E('det.poss', 'm', 's'));
ajoute('ma ta sa', E('det.poss', 'f', 's'));
ajoute('mes tes ses nos vos', E('det.poss', '', 'p'));
ajoute('notre votre', E('det.poss', '', 's'));
ajoute('leur', E('det.poss', '', 's'), E('pro.pers', '', 'p', 3));
ajoute('leurs', E('det.poss', '', 'p'));
ajoute('ce', E('det.dem', 'm', 's'), E('pro.dem', 'm', 's', 3));
ajoute('cet', E('det.dem', 'm', 's'));
ajoute('cette', E('det.dem', 'f', 's'));
ajoute('ces', E('det.dem', '', 'p'));
ajoute('quel', E('det.int', 'm', 's'), E('det.exc', 'm', 's'));
ajoute('quelle', E('det.int', 'f', 's'), E('det.exc', 'f', 's'));
ajoute('quels', E('det.int', 'm', 'p'), E('det.exc', 'm', 'p'));
ajoute('quelles', E('det.int', 'f', 'p'), E('det.exc', 'f', 'p'));
ajoute('chaque', E('det.indef', '', 's'));
ajoute('plusieurs', E('det.indef', '', 'p'), E('pro.indef', '', 'p', 3));
ajoute('quelques', E('det.indef', '', 'p'));
ajoute('quelque', E('det.indef', '', 's'), E('adv'));
ajoute('aucun nul', E('det.indef', 'm', 's'), E('pro.indef', 'm', 's', 3));
ajoute('aucune nulle', E('det.indef', 'f', 's'), E('pro.indef', 'f', 's', 3));
ajoute('certains', E('det.indef', 'm', 'p'), E('pro.indef', 'm', 'p', 3), E('adj', 'm', 'p'));
ajoute('certaines', E('det.indef', 'f', 'p'), E('pro.indef', 'f', 'p', 3), E('adj', 'f', 'p'));
ajoute('tout', E('det.indef', 'm', 's'), E('pro.indef', 'm', 's', 3), E('adv'));
ajoute('toute', E('det.indef', 'f', 's'), E('adv'));
ajoute('tous', E('det.indef', 'm', 'p'), E('pro.indef', 'm', 'p', 3));
ajoute('toutes', E('det.indef', 'f', 'p'), E('pro.indef', 'f', 'p', 3));
ajoute('divers diverses différents différentes', E('det.indef', '', 'p'), E('adj', '', 'p'));
ajoute('deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize vingt trente quarante cinquante soixante cent cents mille',
  E('det.num', '', 'p'));
ajoute('lequel duquel auquel', E('pro.rel', 'm', 's', 3), E('pro.int', 'm', 's', 3));
ajoute('laquelle', E('pro.rel', 'f', 's', 3), E('pro.int', 'f', 's', 3));
ajoute('lesquels desquels auxquels', E('pro.rel', 'm', 'p', 3), E('pro.int', 'm', 'p', 3));
ajoute('lesquelles desquelles auxquelles', E('pro.rel', 'f', 'p', 3), E('pro.int', 'f', 'p', 3));

// --- Pronoms ---
ajoute("je j'", E('pro.pers', '', 's', 1));
ajoute("me m' moi", E('pro.pers', '', 's', 1));
ajoute('tu', E('pro.pers', '', 's', 2));
ajoute("te t' toi", E('pro.pers', '', 's', 2));
ajoute('il', E('pro.pers', 'm', 's', 3));
ajoute('elle', E('pro.pers', 'f', 's', 3));
ajoute('on', E('pro.pers', '', 's', 3));
ajoute('lui', E('pro.pers', '', 's', 3));
ajoute("se s' soi", E('pro.pers', '', '', 3));
ajoute('nous', E('pro.pers', '', 'p', 1));
ajoute('vous', E('pro.pers', '', 'p', 2));
ajoute('ils eux', E('pro.pers', 'm', 'p', 3));
ajoute('elles', E('pro.pers', 'f', 'p', 3));
ajoute('en y', E('pro.adv'));
ajoute("c' ça cela ceci", E('pro.dem', 'm', 's', 3));
ajoute('celui celui-ci celui-là', E('pro.dem', 'm', 's', 3));
ajoute('celle celle-ci celle-là', E('pro.dem', 'f', 's', 3));
ajoute('ceux ceux-ci ceux-là', E('pro.dem', 'm', 'p', 3));
ajoute('celles celles-ci celles-là', E('pro.dem', 'f', 'p', 3));
ajoute('mien tien sien', E('pro.poss', 'm', 's', 3));
ajoute('mienne tienne sienne', E('pro.poss', 'f', 's', 3));
ajoute('miens tiens siens', E('pro.poss', 'm', 'p', 3));
ajoute('miennes tiennes siennes', E('pro.poss', 'f', 'p', 3));
ajoute('nôtre vôtre', E('pro.poss', '', 's', 3));
ajoute('nôtres vôtres', E('pro.poss', '', 'p', 3));
ajoute('qui', E('pro.rel', '', '', 3), E('pro.int', '', 's', 3));
ajoute("que qu'", E('pro.rel'), E('pro.int'), E('conj.sub'), E('adv'));
ajoute('quoi', E('pro.rel'), E('pro.int', '', 's', 3));
ajoute('dont', E('pro.rel'));
ajoute('où', E('pro.rel'), E('pro.int'), E('adv'));
ajoute("personne rien quelqu'un chacun", E('pro.indef', 'm', 's', 3));
ajoute('chacune', E('pro.indef', 'f', 's', 3));
ajoute('autrui', E('pro.indef', 'm', 's', 3));

// --- Prépositions ---
ajoute("à de d' en dans par pour sur sous avec sans chez vers contre entre parmi depuis pendant avant après devant derrière malgré selon dès jusque jusqu' envers hors outre via durant sauf excepté hormis concernant moyennant",
  E('prep'));

// --- Conjonctions ---
ajoute('mais ou et donc or ni car', E('conj.coord'));
ajoute("quand lorsque lorsqu' puisque puisqu' quoique quoiqu' comme si s'", E('conj.sub'));

// --- Adverbes fréquents dans l'analyse (négation, degré) ---
ajoute("ne n' pas point jamais plus guère", E('adv'));
ajoute('très trop peu assez si aussi tant tellement presque', E('adv'));

// --- Interjections ---
ajoute('ah oh hélas eh bravo ouf chut aïe zut hé ô allô bah hum', E('interj'));

// Corrections : homographes dont le contexte tranche (si : conj. ou adverbe…).
entrees.si.push(E('adv'));
entrees.comme.push(E('adv'));
entrees.en.unshift(E('prep'));
entrees.y.push(E('adv'));
entrees.de.push(E('det.ind', '', 'p'), E('det.part'));
entrees["d'"].push(E('det.ind', '', 'p'), E('det.part'));
entrees.personne.push(E('nom.c', 'f', 's'));

export const MOTS_OUTILS = entrees;

// Pour un mot grammatical, seules ces natures du dictionnaire Lexique sont
// gardées (un pas, le son, il entre…) ; les autres homographes (« tu »,
// participe de taire ; « la », note de musique) troubleraient l'élève.
export const HOMOGRAPHES_GARDES = {
  pas: ['nom.c'], point: ['nom.c'], son: ['nom.c'], entre: ['verbe'], vers: ['nom.c'],
  or: ['nom.c'], car: ['nom.c'], devant: ['nom.c'], avant: ['nom.c'], derrière: ['nom.c'],
  rien: ['nom.c'], tout: ['nom.c'], contre: ['nom.c'], personne: [], sous: ['nom.c'],
  plus: [], bien: ['nom.c', 'adv', 'adj'], fin: ['nom.c', 'adj'], mille: ['nom.c'],
  si: ['nom.c'], aussi: [], peu: ['nom.c'], trop: [], assez: [], très: [],
};

// Locutions : plusieurs mots qui forment une seule unité de nature.
export const LOCUTIONS = [
  ['parce que', 'conj.sub'], ["parce qu'", 'conj.sub'], ['afin que', 'conj.sub'],
  ['bien que', 'conj.sub'], ['pour que', 'conj.sub'], ['alors que', 'conj.sub'],
  ['tandis que', 'conj.sub'], ['dès que', 'conj.sub'], ['avant que', 'conj.sub'],
  ['après que', 'conj.sub'], ['sans que', 'conj.sub'], ['pendant que', 'conj.sub'],
  ['depuis que', 'conj.sub'], ['si bien que', 'conj.sub'], ['de sorte que', 'conj.sub'],
  ['à condition que', 'conj.sub'], ['même si', 'conj.sub'], ['étant donné que', 'conj.sub'],
  ['à cause de', 'prep'], ["à cause d'", 'prep'], ['grâce à', 'prep'], ['au lieu de', 'prep'],
  ['près de', 'prep'], ["près d'", 'prep'], ['loin de', 'prep'], ['à côté de', 'prep'],
  ['en face de', 'prep'], ['autour de', 'prep'], ['afin de', 'prep'], ["afin d'", 'prep'],
  ['avant de', 'prep'], ["avant d'", 'prep'], ['jusqu\'à', 'prep'], ['à travers', 'prep'],
  ['au-dessus de', 'prep'], ['au-dessous de', 'prep'], ['le long de', 'prep'],
  ['tout à coup', 'adv'], ['tout de suite', 'adv'], ['tout à fait', 'adv'],
  ['quelque chose', 'pro.indef'], ["n'importe quoi", 'pro.indef'],
].map(([texte, nature]) => ({ mots: texte.replace(/'/g, "' ").split(/\s+/).filter(Boolean), nature }));

// Formes toniques des pronoms sujets, pour « C'est … qui ».
export const FORME_TONIQUE = {
  je: 'moi', "j'": 'moi', tu: 'toi', il: 'lui', elle: 'elle', on: 'nous',
  nous: 'nous', vous: 'vous', ils: 'eux', elles: 'elles',
};

// Prépositions simples et articles contractés (à + le = au…) qui
// introduisent un groupe prépositionnel.
export const INTRODUCTEURS_PREPOSITIONNELS = new Set([
  ...Object.keys(entrees).filter((m) => entrees[m].some((e) => e.n === 'prep')),
  'au', 'aux',
]);
