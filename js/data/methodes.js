// Fiches méthode : ce que l'élève peut faire quand il est bloqué.
// Elles servent dans les aides et dans l'aide-mémoire.

export const METHODES = {
  verbe: {
    titre: 'Trouver le verbe conjugué',
    etapes: [
      'Change le temps de la phrase en ajoutant « Hier, » ou « Demain, » au début : le mot qui change est le verbe conjugué.',
      'Encadre le mot par « ne… pas » : seul un verbe conjugué peut être encadré (« Le chat ne dort pas »).',
      'Un verbe à un temps composé a deux mots : l’auxiliaire (avoir ou être) et le participe passé (« a mangé »).',
      'Un infinitif (manger, finir, prendre) ou un participe seul n’est pas un verbe conjugué.',
      'Il y a autant de propositions que de verbes conjugués.',
    ],
  },
  sujet: {
    titre: 'Trouver le sujet',
    etapes: [
      'Pose la question « Qui est-ce qui… ? » ou « Qu’est-ce qui… ? » devant le verbe.',
      'Encadre le groupe par « C’est… qui » : « C’est le chat de la voisine qui dort. »',
      'Le sujet commande l’accord du verbe : mets le groupe au pluriel, le verbe change aussi.',
      'Le sujet est parfois placé après le verbe (« Où vont les oiseaux ? ») ou loin du verbe.',
      'Dans une proposition relative, le pronom relatif « qui » est souvent le sujet.',
    ],
  },
  complements: {
    titre: 'Distinguer les compléments',
    etapes: [
      'Supprime le groupe : si la phrase reste correcte et garde son sens principal, c’est sans doute un complément circonstanciel.',
      'Déplace le groupe en tête de phrase : si c’est possible, c’est un complément circonstanciel.',
      'Si on ne peut ni le supprimer ni le déplacer, il est lié au verbe : COD, COI ou attribut du sujet.',
      'Après un verbe attributif (être, sembler, paraître, devenir, rester, demeurer, avoir l’air), le groupe qui dit comment est le sujet est attribut du sujet.',
      'Lié au verbe et sans préposition → COD (pronom le, la, les, en). Avec une préposition (à, de…) → COI (pronom lui, leur, en, y).',
      'Dans une phrase passive (« Le gâteau est mangé par Léa »), le groupe introduit par « par » ou « de » qui fait l’action est complément d’agent.',
    ],
  },
  expansions: {
    titre: 'Analyser le groupe nominal',
    etapes: [
      'Trouve le nom noyau : c’est le mot qu’on ne peut pas supprimer.',
      'Un adjectif collé au nom est épithète (« un chat noir »).',
      'Un groupe introduit par une préposition qui précise le nom est complément du nom (« le chat de la voisine »).',
      'Une proposition qui commence par un pronom relatif (qui, que, dont, où) et complète le nom est épithète du nom (relative).',
      'Un élément détaché par une virgule est en apposition (« Léa, ma voisine, est partie »).',
      'Un adverbe placé devant un adjectif (très, peu, totalement) en précise le degré : il est complément de l’adjectif (« totalement égarée »).',
    ],
  },
  natures: {
    titre: 'Trouver la nature d’un mot',
    etapes: [
      'La nature d’un mot ne change pas : c’est son « identité » dans le dictionnaire. La fonction, elle, dépend de la phrase.',
      'Un nom peut être précédé d’un déterminant (le, un, mon, ce…).',
      'Un adjectif peut être précédé de « très » et s’accorde avec le nom.',
      'Un verbe se conjugue : on peut changer son temps.',
      'Un pronom remplace un nom ou un groupe nominal ; un déterminant est toujours suivi d’un nom.',
      'Une préposition (à, de, pour, sur…) introduit un groupe ; une conjonction de coordination (mais, ou, et, donc, or, ni, car) relie deux éléments de même fonction.',
    ],
  },
  propositions: {
    titre: 'Délimiter les propositions',
    etapes: [
      'Compte les verbes conjugués : il y a une proposition par verbe conjugué.',
      'Une proposition indépendante ne dépend d’aucune autre et aucune ne dépend d’elle.',
      'Une proposition subordonnée dépend d’une autre (la principale). Elle commence par un mot subordonnant : pronom relatif (qui, que, dont, où…) ou conjonction de subordination (que, quand, si, parce que…).',
      'Deux propositions reliées par une conjonction de coordination (mais, ou, et, donc, or, ni, car) sont coordonnées ; séparées par une virgule ou un point-virgule, elles sont juxtaposées.',
    ],
  },
};

// Explications quand l'élève confond deux natures (choisie → attendue).
export const CONFUSIONS_NATURES = {
  'pro→det': 'Ici le mot est suivi d’un nom (ou d’un adjectif et d’un nom) : il l’introduit. C’est un déterminant. Un pronom, lui, remplace un nom et se place souvent devant le verbe.',
  'det→pro': 'Ici le mot n’est pas suivi d’un nom : il remplace un nom et se place devant le verbe (« je la vois »). C’est un pronom.',
  'nom→adj': 'Ce mot donne une caractéristique d’un nom et peut être précédé de « très » : c’est un adjectif.',
  'adj→nom': 'Ce mot désigne un être ou une chose et peut être précédé d’un déterminant : c’est un nom.',
  'nom→verbe': 'Ce mot se conjugue : si tu changes le temps de la phrase, il change. C’est un verbe.',
  'verbe→nom': 'Ce mot est précédé d’un déterminant et ne se conjugue pas ici : c’est un nom.',
  'adj→verbe': 'Ce mot est une forme du verbe (participe ou forme conjuguée). Vérifie s’il est accompagné d’un auxiliaire (avoir, être).',
  'verbe→adj': 'Ici, ce mot n’est pas employé comme un verbe : il qualifie un nom, comme un adjectif.',
  'conj.sub→pro.rel': 'Ce mot reprend un nom placé juste avant lui (son antécédent) et il a une fonction dans la proposition : c’est un pronom relatif.',
  'pro.rel→conj.sub': 'Ce mot ne remplace aucun nom : il relie simplement la proposition à un verbe (« Je pense que… »). C’est une conjonction de subordination.',
  'prep→conj.coord': 'Ce mot relie deux éléments de même fonction : c’est une conjonction de coordination (mais, ou, et, donc, or, ni, car).',
  'conj.coord→prep': 'Ce mot introduit un groupe nominal ou un infinitif : c’est une préposition.',
  'adj→adv': 'Ce mot est invariable et précise un verbe, un adjectif ou un autre adverbe : c’est un adverbe.',
  'adv→adj': 'Ce mot s’accorde avec un nom : c’est un adjectif.',
  'prep→det': 'Ici, « du », « des » ou « de » introduit directement un nom, comme « un » ou « le » : c’est un déterminant (article).',
  'det→prep': 'Ici, ce mot introduit un groupe (on pourrait le remplacer par « à » ou « pour ») : c’est une préposition.',
};
