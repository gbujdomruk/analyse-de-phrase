// Terminologie de référence : « La grammaire du français. Terminologie
// grammaticale » (Éduscol, 2020). Les codes courts servent dans la notation
// des corrigés (voir README) ; les libellés sont ceux affichés à l'élève.

export const NIVEAUX = [
  { id: 'c3', nom: 'Cycle 3', detail: 'CM1, CM2, 6e' },
  { id: 'c4', nom: 'Cycle 4', detail: '5e, 4e, 3e' },
  { id: 'lycee', nom: 'Lycée', detail: '2de, 1re' },
];

const RANG = { c3: 0, c4: 1, lycee: 2 };
export const auNiveau = (niveauMin, niveau) => RANG[niveauMin] <= RANG[niveau];

// Fonctions des groupes dans la phrase. `abrege` s'affiche sous les mots,
// `court` sur les boutons, `nom` dans les bilans. `place` indique où se trouve
// la fonction : 'phrase' (relation avec le verbe ou l'ensemble GS + GV)
// ou 'groupe' (expansion à l'intérieur d'un groupe).
export const FONCTIONS = {
  S: {
    nom: 'Sujet', court: 'Sujet', abrege: 'Sujet', niveau: 'c3', place: 'phrase', couleur: 'sujet',
    definition: "Le sujet commande l'accord du verbe. On le trouve avec « C'est… qui » : « C'est le chat qui dort. »",
  },
  V: {
    nom: 'Verbe conjugué', court: 'Verbe', abrege: 'Verbe', niveau: 'c3', place: 'phrase', couleur: 'verbe',
    definition: 'Le verbe conjugué change quand on change le temps de la phrase ; on peut l’encadrer par « ne… pas ».',
  },
  COD: {
    nom: "Complément d'objet direct", court: 'COD', abrege: 'COD', niveau: 'c3', place: 'phrase', couleur: 'objet',
    definition: "Le COD complète le verbe sans préposition. On ne peut ni le supprimer ni le déplacer en tête de phrase. Il se remplace par le, la, l', les, en.",
  },
  COI: {
    nom: "Complément d'objet indirect", court: 'COI', abrege: 'COI', niveau: 'c3', place: 'phrase', couleur: 'objet',
    definition: "Le COI complète le verbe et il est introduit par une préposition (à, de…). On ne peut pas le déplacer en tête de phrase. Il se remplace par lui, leur, en, y.",
  },
  ATS: {
    nom: 'Attribut du sujet', court: 'Attribut du sujet', abrege: 'Attribut', niveau: 'c3', place: 'phrase', couleur: 'attribut',
    definition: "L'attribut du sujet suit un verbe attributif (être, sembler, paraître, devenir, rester, demeurer, avoir l'air…) et donne une caractéristique du sujet.",
  },
  ATO: {
    nom: "Attribut du COD", court: 'Attribut du COD', abrege: 'Attr. COD', niveau: 'c4', place: 'phrase', couleur: 'attribut',
    definition: "L'attribut du COD donne une caractéristique du COD : « On a élu Alice présidente » (→ Alice est présidente).",
  },
  CC: {
    nom: 'Complément circonstanciel', court: 'Compl. circonstanciel', abrege: 'CC', niveau: 'c3', place: 'phrase', couleur: 'circonstanciel',
    definition: "Le complément circonstanciel donne une information sur les circonstances (lieu, temps, cause…). On peut le supprimer et le déplacer.",
  },
  CAG: {
    nom: "Complément d'agent", court: "Compl. d'agent", abrege: 'Agent', niveau: 'c4', place: 'phrase', couleur: 'objet',
    definition: "Dans une phrase passive, le complément d'agent (introduit par « par » ou « de ») désigne celui qui fait l'action. Il devient sujet si on met la phrase à la voix active.",
  },
  CVI: {
    nom: 'Complément du verbe impersonnel', court: 'Compl. du verbe impers.', abrege: 'Compl. impers.', niveau: 'lycee', place: 'phrase', couleur: 'objet',
    definition: "Avec un verbe impersonnel (il faut, il y a, il pleut…), le groupe qui suit le verbe est complément du verbe impersonnel.",
  },
  EPI: {
    nom: 'Épithète', court: 'Épithète', abrege: 'Épithète', niveau: 'c3', place: 'groupe', couleur: 'expansion',
    definition: "L'épithète est un adjectif (ou une proposition relative) placé à côté du nom qu'il complète, sans virgule ni verbe entre eux.",
  },
  CN: {
    nom: 'Complément du nom', court: 'Compl. du nom', abrege: 'Compl. nom', niveau: 'c3', place: 'groupe', couleur: 'expansion',
    definition: 'Le complément du nom complète un nom ; il est le plus souvent introduit par une préposition : « le chat de la voisine ».',
  },
  APP: {
    nom: 'Apposition', court: 'Apposition', abrege: 'Apposition', niveau: 'c4', place: 'groupe', couleur: 'expansion',
    definition: "L'apposition est détachée du nom par une virgule (ou deux points) ; on peut la supprimer sans changer ce que désigne le nom.",
  },
  CADJ: {
    nom: "Complément de l'adjectif", court: "Compl. de l'adjectif", abrege: 'Compl. adj.', niveau: 'c4', place: 'groupe', couleur: 'expansion',
    definition: "Le complément de l'adjectif complète un adjectif : un adverbe qui en précise le degré (« très grand », « totalement égarée ») ou un groupe introduit par une préposition (« fier de son travail »).",
  },
  // Fonctions énonciatives et textuelles (terminologie II.2.7) : pas de
  // fonction syntaxique dans la phrase. Utilisées par le guide du mode libre.
  MOD: {
    nom: 'Modalisateur', court: 'Modalisateur', abrege: 'Modalis.', niveau: 'c4', place: 'enonciation', couleur: 'enonciation',
    definition: 'Un modalisateur exprime l’avis ou le degré de certitude de celui qui parle (heureusement, peut-être, sans doute, franchement). Il commente la phrase et n’y a pas de fonction.',
  },
  CONN: {
    nom: 'Connecteur', court: 'Connecteur', abrege: 'Connect.', niveau: 'c4', place: 'enonciation', couleur: 'enonciation',
    definition: 'Un connecteur relie la phrase à ce qui a été dit avant (pourtant, justement, d’ailleurs, en effet). Il n’a pas de fonction dans la phrase.',
  },
};

// Sens des compléments circonstanciels (« CC:temps » dans la notation).
export const CIRCONSTANCES = {
  temps: { nom: 'temps', question: 'Quand ?', niveau: 'c3' },
  lieu: { nom: 'lieu', question: 'Où ?', niveau: 'c3' },
  cause: { nom: 'cause', question: 'Pourquoi ? (pour quelle raison)', niveau: 'c3' },
  maniere: { nom: 'manière', question: 'Comment ?', niveau: 'c4' },
  moyen: { nom: 'moyen', question: 'Avec quoi ? Grâce à quoi ?', niveau: 'c4' },
  but: { nom: 'but', question: 'Dans quel but ?', niveau: 'c4' },
  consequence: { nom: 'conséquence', question: 'Avec quel résultat ?', niveau: 'c4' },
  condition: { nom: 'condition', question: 'À quelle condition ?', niveau: 'c4' },
  opposition: { nom: 'opposition / concession', question: 'Malgré quoi ?', niveau: 'c4' },
  comparaison: { nom: 'comparaison', question: 'Comme quoi ?', niveau: 'c4' },
  accompagnement: { nom: 'accompagnement', question: 'Avec qui ?', niveau: 'c4' },
};

// Types de propositions (« {SUB-REL …} » dans la notation).
export const PROPOSITIONS = {
  IND: { nom: 'Proposition indépendante', niveau: 'c3' },
  PRINC: { nom: 'Proposition principale', niveau: 'c3' },
  'SUB-REL': { nom: 'Proposition subordonnée relative', niveau: 'c3' },
  'SUB-CONJ': { nom: 'Proposition subordonnée conjonctive complétive', niveau: 'c4' },
  'SUB-CIRC': { nom: 'Proposition subordonnée circonstancielle', niveau: 'c4' },
  'SUB-INT': { nom: 'Proposition subordonnée interrogative indirecte', niveau: 'lycee' },
  'SUB-INF': { nom: 'Proposition subordonnée infinitive', niveau: 'lycee' },
  'SUB-PART': { nom: 'Proposition subordonnée participiale', niveau: 'lycee' },
};

// Natures des mots. Les sous-catégories (après le point) ne sont demandées
// qu'à partir du niveau indiqué ; avant, seule la catégorie principale compte.
export const NATURES = {
  nom: { nom: 'Nom', niveau: 'c3' },
  'nom.c': { nom: 'Nom commun', parent: 'nom', niveau: 'c4' },
  'nom.p': { nom: 'Nom propre', parent: 'nom', niveau: 'c3' },
  det: { nom: 'Déterminant', niveau: 'c3' },
  'det.def': { nom: 'Article défini', parent: 'det', niveau: 'c3' },
  'det.ind': { nom: 'Article indéfini', parent: 'det', niveau: 'c3' },
  'det.part': { nom: 'Article partitif', parent: 'det', niveau: 'c4' },
  'det.poss': { nom: 'Déterminant possessif', parent: 'det', niveau: 'c3' },
  'det.dem': { nom: 'Déterminant démonstratif', parent: 'det', niveau: 'c3' },
  'det.int': { nom: 'Déterminant interrogatif', parent: 'det', niveau: 'c4' },
  'det.exc': { nom: 'Déterminant exclamatif', parent: 'det', niveau: 'c4' },
  'det.indef': { nom: 'Déterminant indéfini', parent: 'det', niveau: 'c4' },
  'det.num': { nom: 'Déterminant numéral', parent: 'det', niveau: 'c4' },
  'det.rel': { nom: 'Déterminant relatif', parent: 'det', niveau: 'lycee' },
  adj: { nom: 'Adjectif', niveau: 'c3' },
  pro: { nom: 'Pronom', niveau: 'c3' },
  'pro.pers': { nom: 'Pronom personnel', parent: 'pro', niveau: 'c3' },
  'pro.adv': { nom: 'Pronom adverbial (en, y)', parent: 'pro', niveau: 'c4' },
  'pro.poss': { nom: 'Pronom possessif', parent: 'pro', niveau: 'c4' },
  'pro.dem': { nom: 'Pronom démonstratif', parent: 'pro', niveau: 'c4' },
  'pro.indef': { nom: 'Pronom indéfini', parent: 'pro', niveau: 'c4' },
  'pro.int': { nom: 'Pronom interrogatif', parent: 'pro', niveau: 'c4' },
  'pro.rel': { nom: 'Pronom relatif', parent: 'pro', niveau: 'c3' },
  verbe: { nom: 'Verbe', niveau: 'c3' },
  adv: { nom: 'Adverbe', niveau: 'c3' },
  prep: { nom: 'Préposition', niveau: 'c3' },
  'conj.coord': { nom: 'Conjonction de coordination', niveau: 'c3' },
  'conj.sub': { nom: 'Conjonction de subordination', niveau: 'c3' },
  interj: { nom: 'Interjection', niveau: 'c3' },
};

// Nature principale (catégorie) d'un code : « det.def » → « det ».
export const categorie = (code) => NATURES[code]?.parent ?? code;

// Code de nature attendu au niveau donné : on remonte à la catégorie
// tant que la sous-catégorie n'est pas au programme.
export function natureAuNiveau(code, niveau) {
  const n = NATURES[code];
  if (!n) return code;
  if (n.parent && !auNiveau(n.niveau, niveau)) return n.parent;
  return code;
}

// Liste des natures proposées à l'élève, groupées par catégorie.
export function naturesProposees(niveau) {
  const groupes = [];
  for (const [code, n] of Object.entries(NATURES)) {
    if (n.parent) continue;
    const sous = Object.entries(NATURES)
      .filter(([, s]) => s.parent === code && auNiveau(s.niveau, niveau))
      .map(([c, s]) => ({ code: c, nom: s.nom }));
    groupes.push({ code, nom: n.nom, sous });
  }
  return groupes;
}

// Lemmes des verbes attributifs. « Avoir l'air », « passer pour »,
// « se montrer »… sont aussi attributifs mais se repèrent en contexte.
export const VERBES_ATTRIBUTIFS = [
  'être', 'sembler', 'paraître', 'devenir', 'rester', 'demeurer', 'redevenir',
];
