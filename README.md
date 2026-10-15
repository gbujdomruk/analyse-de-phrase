# Analyse de phrase

Application web pour apprendre à analyser une phrase en français, étape par
étape : verbes conjugués, sujets, compléments, groupe nominal, propositions,
nature des mots. Elle fonctionne sur téléphone, tablette et ordinateur, sans
installation ni compte.

Le vocabulaire suit **« La grammaire du français. Terminologie grammaticale »**
(Éduscol, 2020) : groupe sujet, groupe verbal, complément circonstanciel,
COD / COI (« Elle va à Paris » : COI), attribut du sujet et du COD,
complément d'agent, épithète (y compris la relative), complément du nom,
apposition, complément de l'adjectif.

## Deux modes

**S'entraîner** : des phrases corrigées, classées par thème (le verbe et son
identité, le sujet, les compléments, le groupe nominal, la nature des groupes
et leur noyau, la nature des mots, les propositions, les types et formes de
phrase, l'analyse complète). La correction est exacte puisque chaque phrase a un
corrigé. En cas d'erreur, l'élève reçoit une explication qui ne donne pas la
réponse mais lui fait faire le bon test (« Supprime le groupe : *Le chat
dort.* La phrase reste-t-elle correcte ? »). Le bouton « Je suis bloqué·e »
donne des indices de plus en plus précis, jusqu'à la réponse.

**Analyser ma phrase** : l'élève tape n'importe quelle phrase. Sans corrigé,
l'application ne devine pas la réponse : elle applique la méthode avec
l'élève et en tire les conclusions.
- Elle fabrique les phrases transformées (suppression, déplacement en tête,
  « C'est… qui ») et demande à l'élève si elles sont correctes.
- De ses réponses, elle déduit la fonction par un raisonnement fixe
  (supprimable et déplaçable → complément circonstanciel ; verbe attributif →
  attribut ; préposition → COI ; etc.) et affiche la justification.
- Le dictionnaire Lexique (142 000 formes) signale ce qui est vérifiable :
  un mot qui ne peut pas être un verbe conjugué, un participe sans auxiliaire,
  un accord sujet-verbe impossible, les natures possibles d'un mot.

Le **niveau** (cycle 3, cycle 4, lycée) se règle en haut de l'écran : il
détermine les fonctions, les natures, les temps, les formes de phrase et les
sens de compléments proposés. Au cycle 3, on demande « expansion du nom » sans
distinguer épithète et complément du nom.

L'écran **Réglages** (roue dentée) permet de choisir le vocabulaire de la
phrase : « groupe sujet, groupe verbal, complément circonstanciel »
(terminologie 2020, par défaut) ou « sujet, prédicat, complément de phrase »,
qui ajoute une étape où l'élève délimite le prédicat.

Ce que l'application calcule elle-même, sans corrigé :
- la **nature d'un groupe** (GN, groupe prépositionnel, groupe adjectival…)
  et son **noyau**, d'après la nature de ses mots ;
- l'**identité du verbe** (infinitif, mode, temps, personne, voix), d'après le
  dictionnaire ; une forme ambiguë accepte toutes ses lectures ;
- le **type de phrase** et les formes négative, passive et exclamative. Les
  formes emphatique et impersonnelle reposent sur un test que l'élève fait
  (en mode libre) ou sont indiquées dans le corrigé (en entraînement).

## Ajouter des phrases à la banque

Les phrases sont dans [`js/data/phrases.js`](js/data/phrases.js). Pour en
ajouter une, copier un bloc existant :

```js
{
  id: 'chat-voisine',              // identifiant unique, sans espace
  niveau: 'c3',                    // c3, c4 ou lycee : niveau minimal
  themes: ['sujet', 'complements', 'expansions', 'natures'],
  analyse: '[S Le chat [CN de la voisine]] [V dort] [CC:lieu sur le canapé].',
  natures: 'det.def nom.c prep det.def nom.c verbe prep det.def nom.c',
  note: 'Remarque facultative affichée après la correction.',
},
```

### La ligne `analyse`

- `[FONCTION mots]` entoure un groupe. Fonctions : `S` sujet, `V` verbe
  conjugué, `COD`, `COI`, `ATS` attribut du sujet, `ATO` attribut du COD,
  `CC` complément circonstanciel, `CAG` complément d'agent, `CVI` complément
  du verbe impersonnel, `EPI` épithète, `CN` complément du nom, `APP`
  apposition, `CADJ` complément de l'adjectif.
- Le sens d'un complément circonstanciel s'ajoute après deux-points :
  `CC:temps`, `CC:lieu`, `CC:cause`, `CC:maniere`, `CC:moyen`, `CC:but`,
  `CC:consequence`, `CC:condition`, `CC:opposition`, `CC:comparaison`,
  `CC:accompagnement`.
- Les groupes s'emboîtent : `[S Le chat [CN de la voisine]]`.
- Les mots hors crochets n'ont pas de fonction (ne… pas, et, ponctuation) :
  `[S Il] ne [V mange] pas.`
- Un groupe coupé en deux porte le même numéro : `[V#1 As]-[S tu] [V#1 fini] ?`
- La nature d'un groupe est calculée ; pour l'imposer, l'ajouter après une
  barre oblique : `[CC:temps/GN Hier soir]` (`GN`, `GP`, `GAdj`, `GAdv`,
  `GInf`, `PRO`, `SUB`).
- `{TYPE …}` délimite une proposition, seulement pour les phrases
  complexes : `IND` indépendante, `PRINC` principale, `SUB-REL` relative,
  `SUB-CONJ` complétive, `SUB-CIRC` circonstancielle, `SUB-INT`
  interrogative indirecte, `SUB-INF` infinitive, `SUB-PART` participiale.
  Une subordonnée qui a une fonction s'écrit dans son groupe :
  `{PRINC [S Je] [V crois] [COD {SUB-CONJ que [S Léa] [V viendra]}]}.`

### Type et formes, phrases réservées à un thème

Le type et les formes de phrase sont calculés. Pour les imposer :
`type: 'declaratif'` (ou `interrogatif`, `imperatif`) et
`formes: ['negative', 'emphatique']` (`negative`, `passive`, `exclamative`,
`emphatique`, `impersonnelle`). Une phrase qui ne sert qu'à un thème porte
`seulement: ['phrase']` : son analyse peut alors se réduire au texte
(exemple : « C'est mon frère qui a gagné la course. », forme emphatique).

### La ligne `natures`

Un code par mot, ponctuation exclue, dans l'ordre de la phrase. Le signe `=`
rattache un mot au précédent pour former une seule unité (verbe composé,
locution) : `verbe =` pour « a mangé », `prep = =` pour « à cause de ».

Codes : `nom.c`, `nom.p`, `det.def`, `det.ind`, `det.part`, `det.poss`,
`det.dem`, `det.int`, `det.exc`, `det.indef`, `det.num`, `adj`, `pro.pers`,
`pro.adv`, `pro.poss`, `pro.dem`, `pro.indef`, `pro.int`, `pro.rel`, `verbe`,
`adv`, `prep`, `conj.coord`, `conj.sub`, `interj`.

Au cycle 3, l'application ne demande que la catégorie (« déterminant ») quand
la sous-catégorie (« déterminant indéfini ») n'est pas au programme : il suffit
d'écrire le code précis, elle simplifie d'elle-même.

### Vérifier ses phrases

```sh
npm test
```

Les tests relisent toute la banque : une erreur de crochet, un nombre de
natures qui ne correspond pas au nombre de mots ou un code inconnu sont
signalés avec le nom de la phrase.

## Essayer en local

L'application est un site statique (HTML, CSS, JavaScript sans compilation).
Les modules JavaScript exigent un serveur web local :

```sh
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

## Publier sur GitHub Pages

1. Créer un dépôt sur GitHub et y envoyer ce dossier.
2. Dans le dépôt : **Settings → Pages → Build and deployment**, choisir
   *Deploy from a branch*, branche `main`, dossier `/ (root)`.
3. Le site est en ligne quelques minutes plus tard à l'adresse
   `https://<compte>.github.io/<dépôt>/`.

## Installer sur un téléphone

L'application est installable (manifeste et cache hors connexion) :
- **iPhone / iPad** : ouvrir le lien dans **Safari**, bouton Partager, puis
  « Sur l'écran d'accueil ».
- **Android** : ouvrir le lien dans **Chrome**, menu ⋮, puis « Installer
  l'application » (ou « Ajouter à l'écran d'accueil »).

Une fois ouverte une première fois, elle fonctionne sans connexion. Quand
une nouvelle version est publiée, elle est prise en compte à l'ouverture
suivante avec du réseau. Si un fichier JavaScript est ajouté, il faut aussi
l'ajouter à la liste de `sw.js` (un test le vérifie).

## Organisation du code

| Dossier | Contenu |
| --- | --- |
| `js/data/` | Terminologie, mots grammaticaux, fiches méthode, banque de phrases |
| `js/core/` | Logique sans interface : découpage, lecture des corrigés, dictionnaire, manipulations, correction (`exercice.js`), guide du mode libre (`guide.js`), nature des groupes (`groupes.js`), identité du verbe (`verbe.js`), type et formes (`phrase.js`) |
| `js/ui/` | Écrans : entraînement, analyse libre, aide-mémoire |
| `data/lexique.json` | Dictionnaire compact, produit par `outils/construire_lexique.py` |
| `tests/` | Tests (`npm test`, Node 20 ou plus) |

## Limites connues

- En mode libre, la qualité de l'analyse dépend des réponses de l'élève aux
  tests ; l'application le rappelle dans le bilan.
- Les natures proposées en mode libre viennent du dictionnaire ; l'indice de
  contexte (« sans doute un déterminant ») reste un indice.
- Les cas que la terminologie elle-même signale comme discutables (verbes de
  mouvement, « être » + lieu) sont tranchés selon la terminologie et
  expliqués dans une note.

## Crédits

- Dictionnaire : **Lexique 3.83**, B. New, C. Pallier et al.,
  [www.lexique.org](http://www.lexique.org), licence
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  Le fichier `data/lexique.json` en est une version réduite, diffusée sous la
  même licence.
- Terminologie : ministère de l'Éducation nationale, *La grammaire du
  français. Terminologie grammaticale*, 2020.
