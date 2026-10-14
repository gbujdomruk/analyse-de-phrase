// Mode « Analyser ma phrase » : l'élève tape n'importe quelle phrase et
// l'application le guide, test après test, sans connaître la réponse.

import { FONCTIONS, NATURES, CIRCONSTANCES, natureAuNiveau, naturesProposees } from '../data/terminologie.js';
import { METHODES } from '../data/methodes.js';
import { decoupe, normalise, recompose } from '../core/decoupage.js';
import { chargeLexique, estMotCompose, formesConjuguees, naturesPossibles } from '../core/lexique.js';
import * as G from '../core/guide.js';
import * as M from '../core/manipulations.js';
import { el, vide, remplit, PhraseInteractive, PanneauAide, bulle, choix, etapes, memoire } from './composants.js';

const EXEMPLES = [
  'Le chat de la voisine dort sur le canapé.',
  'Hier, mon frère a offert un livre à sa meilleure amie.',
  'Les élèves qui ont fini leur travail sortent dans la cour.',
  'Ma grand-mère semble très fatiguée ce matin.',
];

export function ecranSaisie(racine, niveau) {
  const zone = el('textarea', {
    id: 'saisie', rows: '3', placeholder: 'Écris ou colle ta phrase ici…', autocapitalize: 'sentences', spellcheck: 'true',
  });
  zone.value = memoire.lit('derniere-phrase', '');
  const etat = el('div', { class: 'retour', 'aria-live': 'polite' });
  const lancer = async () => {
    const texte = zone.value.trim().replace(/\s+/g, ' ');
    if (!/\p{L}/u.test(texte)) { remplit(etat, bulle('faux', 'Écris d’abord une phrase.')); return; }
    memoire.ecrit('derniere-phrase', texte);
    remplit(etat, bulle('info', 'Chargement du dictionnaire…'));
    try {
      await chargeLexique();
    } catch (e) {
      remplit(etat, bulle('faux', `Le dictionnaire n’a pas pu être chargé (${e.message}). Vérifie ta connexion et réessaie.`));
      return;
    }
    new Analyse(racine, niveau, texte).demarre();
  };
  remplit(racine, 
    el('h1', {}, 'Analyser ma phrase'),
    el('p', { class: 'intro' }, 'Écris une phrase trouvée dans un exercice. L’application ne connaît pas la réponse : elle te fait faire les tests de la méthode, étape par étape, et vérifie ce qui peut l’être (dictionnaire, accords).'),
    el('label', { for: 'saisie', class: 'etiquette-champ' }, 'Ta phrase'),
    zone,
    el('div', { class: 'rangee' }, el('button', { type: 'button', class: 'bouton bouton-principal', onclick: lancer }, 'Commencer l’analyse')),
    etat,
    el('p', { class: 'petit' }, 'Ou essaie avec un exemple :'),
    el('div', { class: 'exemples' }, EXEMPLES.map((x) => el('button', { type: 'button', class: 'bouton bouton-lien', onclick: () => { zone.value = x; } }, x))),
  );
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); lancer(); } });
}

class Analyse {
  constructor(racine, niveau, texte) {
    this.racine = racine;
    this.niveau = niveau;
    this.texte = texte;
    this.jetons = decoupe(texte, estMotCompose);
    this.verbes = [];
    this.sujets = [];
    this.groupes = [];
    this.expansions = [];
    this.natures = [];
  }

  get nomsEtapes() {
    return ['Verbes', ...(this.verbes.length > 1 ? ['Propositions'] : []), 'Sujets', 'Compléments', 'Groupe nominal', 'Natures'];
  }

  demarre() {
    this.phrase = new PhraseInteractive({ jetons: this.jetons, surSelection: () => this.majBoutons?.() });
    this.aide = new PanneauAide({ surIndice: (ind) => this.phrase.montre(ind), avecReponse: false });
    this.zoneEtapes = el('div');
    this.consigne = el('h2', { class: 'consigne', 'aria-live': 'polite' });
    this.actions = el('div', { class: 'actions' });
    this.retour = el('div', { class: 'retour', 'aria-live': 'polite' });
    remplit(this.racine, 
      el('div', { class: 'barre-exercice' },
        el('a', { href: '#/libre', class: 'retour-lien' }, '← Autre phrase'),
        el('span', { class: 'compteur' }, 'Analyse guidée')),
      this.zoneEtapes, this.consigne, this.phrase.racine, this.retour, this.actions, this.aide.racine,
    );
    this.etapeVerbes();
  }

  // Prépare l'écran d'une étape.
  ouvre(nomEtape, consigne, aides = []) {
    remplit(this.zoneEtapes, etapes(this.nomsEtapes, this.nomsEtapes.indexOf(nomEtape)));
    this.consigne.textContent = consigne;
    this.phrase.efface();
    this.phrase.montre([]);
    this.phrase.surligner([]);
    this.phrase.active(true);
    vide(this.retour);
    vide(this.actions);
    this.aide.racine.hidden = false;
    this.aide.charge(aides);
    this.majBoutons = null;
  }

  boutons(...liste) {
    this.rangeeEtape = el('div', { class: 'rangee' }, ...liste);
    remplit(this.actions, this.rangeeEtape);
  }

  bouton(texte, action, style = 'principal', { selection = false } = {}) {
    const b = el('button', { type: 'button', class: `bouton bouton-${style}`, onclick: action }, texte);
    if (selection) {
      const avant = this.majBoutons;
      this.majBoutons = () => { avant?.(); b.disabled = this.phrase.valeur().length === 0; };
      b.disabled = this.phrase.valeur().length === 0;
    }
    return b;
  }

  // --- 1. Verbes ---------------------------------------------------------------

  etapeVerbes() {
    const candidats = G.candidatsVerbes(this.jetons).map((c) => c.i);
    this.ouvre('Verbes', 'Touche le ou les verbes conjugués de ta phrase.', [
      ...METHODES.verbe.etapes.slice(0, 3),
      candidats.length
        ? { texte: `D’après le dictionnaire, ces mots peuvent être des verbes conjugués : ${candidats.map((i) => `« ${this.jetons[i].texte} »`).join(', ')}. Attention, certains peuvent aussi être des noms (« la porte ») : fais les tests !`, montre: candidats }
        : 'Le dictionnaire ne trouve aucune forme de verbe conjugué : ta phrase est peut-être une phrase sans verbe (« Quelle belle journée ! »).',
    ]);
    const valider = () => {
      const sel = this.phrase.valeur();
      const remarques = G.remarquesVerbes(this.jetons, sel);
      const suite = () => this.leveAmbiguites(sel, G.ambiguitesEtre(this.jetons, sel), new Set());
      if (!remarques.length) return suite();
      remplit(this.retour, ...remarques.map((r) => bulle(r.type === 'erreur' ? 'faux' : 'attention', r.texte)));
      this.phrase.active(false);
      this.boutons(
        this.bouton('Corriger ma sélection', () => { this.etapeVerbes(); this.phrase.choisit(sel); }, 'principal'),
        this.bouton('Je garde mon choix', suite, 'secondaire'),
      );
    };
    this.boutons(
      this.bouton('Valider', valider, 'principal', { selection: true }),
      this.bouton('Effacer', () => this.phrase.efface(), 'secondaire'),
      this.bouton('Il n’y a pas de verbe', () => this.phraseSansVerbe(), 'lien'),
    );
  }

  // « je suis égarée » : temps composé / passif, ou participe attribut ?
  // On pose la question pour chaque cas, puis on enregistre les verbes.
  leveAmbiguites(sel, ambiguites, etats) {
    const [a, ...reste] = ambiguites;
    if (!a) {
      this.verbes = G.regroupeVerbes(this.jetons, sel, etats);
      this.etatsAttributs = etats;
      this.marqueVerbes();
      if (this.verbes.length > 1) this.etapePropositions(); else this.etapeSujets(0);
      return;
    }
    const aux = this.jetons[a.auxiliaire].texte;
    const part = this.jetons[a.participe].texte;
    this.phrase.active(false);
    this.phrase.surligner(a.verbe);
    remplit(this.retour, el('div', { class: 'carte-question' },
      el('p', { class: 'question-titre' }, `« ${aux} … ${part} » : un seul verbe ?`),
      el('p', {}, `« ${part} » est le participe passé d’un verbe, placé après « ${aux} ». Deux analyses sont possibles :`),
      el('ul', {},
        el('li', {}, el('strong', {}, 'Voix passive : '), `quelqu’un fait l’action sur le sujet ; on peut ajouter « par… » (« la souris est attrapée par le chat »). Alors « ${aux} ${part} » est un seul verbe.`),
        el('li', {}, el('strong', {}, 'État du sujet : '), `« ${part} » décrit comment est le sujet, comme un adjectif ; on peut le remplacer par un adjectif (« je suis perdue, fatiguée »). Alors seul « ${aux} » est le verbe, et « ${part} » est attribut du sujet.`))));
    this.boutons(
      this.bouton('Voix passive : un seul verbe', () => this.leveAmbiguites(sel, reste, etats), 'secondaire'),
      this.bouton('État du sujet : attribut', () => this.leveAmbiguites(sel, reste, new Set([...etats, a.participe])), 'secondaire'),
    );
  }

  phraseSansVerbe() {
    this.verbes = [];
    remplit(this.retour, bulle('info', 'Une phrase sans verbe conjugué est une phrase non verbale (« Quel beau temps ! »). On passe directement à la nature des mots.'));
    this.boutons(this.bouton('Continuer →', () => this.etapeNatures(0)));
  }

  marqueVerbes() {
    this.phrase.retireMarques((m) => m.fonction === 'V');
    for (const v of this.verbes) this.phrase.marque({ jetons: v, fonction: 'V', libelle: 'Verbe' });
  }

  // --- 2. Propositions -------------------------------------------------------------

  etapePropositions() {
    const n = this.verbes.length;
    this.ouvre('Propositions', `Ta phrase contient ${n} verbes conjugués : elle contient donc ${n} propositions.`, METHODES.propositions.etapes);
    this.phrase.active(false);
    const liens = motsDeLiaison(this.jetons);
    this.phrase.surligner(liens.map((l) => l.i));
    remplit(this.retour, 
      liens.length
        ? bulle('info', el('p', {}, 'Voici les mots qui relient les propositions :'), el('ul', {}, liens.map((l) => el('li', {}, el('strong', {}, `« ${l.texte} » `), l.role))))
        : bulle('info', 'Aucun mot de liaison : les propositions sont sans doute juxtaposées (séparées par une virgule, un point-virgule ou deux points).'),
    );
    this.boutons(this.bouton('Continuer →', () => this.etapeSujets(0)));
  }

  // --- 3. Sujets ---------------------------------------------------------------------

  etapeSujets(k) {
    if (k >= this.verbes.length) return this.etapeComplements(0);
    const verbe = this.verbes[k];
    const v = M.texteVerbe(this.jetons, verbe);
    const [q1, q2] = M.questionSujet(this.jetons, verbe);
    this.ouvre('Sujets', `Quel est le sujet du verbe « ${v} » ?`, [`Pose la question : « ${q1} » ou « ${q2} »`, ...METHODES.sujet.etapes.slice(1)]);
    this.phrase.surligner(verbe);

    const valider = () => {
      const sel = this.phrase.valeur();
      if (sel.some((i) => verbe.includes(i))) { remplit(this.retour, bulle('faux', 'Le verbe ne fait pas partie du sujet.')); return; }
      const test = M.encadreSujet(this.jetons, sel, verbe);
      const accord = G.verifieAccord(this.jetons, sel, verbe);
      this.phrase.active(false);
      remplit(this.retour, 
        bulle('info', el('p', {}, 'Fais le test « C’est… qui » :'), el('p', { class: 'exemple' }, test), el('p', {}, 'Cette phrase est-elle correcte et dit-elle la même chose que ta phrase ?')),
        accord ? bulle('attention', accord) : null,
      );
      this.boutons(
        this.bouton('Oui', () => {
          this.sujets[k] = sel;
          this.phrase.marque({ jetons: sel, fonction: 'S', libelle: 'Sujet' });
          this.etapeSujets(k + 1);
        }),
        this.bouton('Non', () => {
          this.etapeSujets(k);
          remplit(this.retour, bulle('info', `Cherche un autre groupe : « ${q1} »`));
        }, 'secondaire'),
      );
    };
    const sansSujet = () => {
      const imperatif = verbe.some((i) => formesConjuguees(this.jetons[i].texte).some((f) => f.mode === 'imp'));
      if (!imperatif) {
        remplit(this.retour, bulle('attention', `D’après le dictionnaire, « ${v} » ne peut pas être à l’impératif : il a sûrement un sujet. Pose la question « ${q1} »`));
        return;
      }
      this.sujets[k] = null;
      remplit(this.retour, bulle('juste', `D’accord : « ${v} » est à l’impératif, le sujet n’est pas exprimé.`));
      this.boutons(this.bouton('Continuer →', () => this.etapeSujets(k + 1)));
    };
    this.boutons(
      this.bouton('Valider', valider, 'principal', { selection: true }),
      this.bouton('Effacer', () => this.phrase.efface(), 'secondaire'),
      this.bouton('Pas de sujet (impératif)', sansSujet, 'lien'),
    );
  }

  // --- 4. Compléments ------------------------------------------------------------------

  etapeComplements(k) {
    if (k >= this.verbes.length) return this.etapeExpansions();
    const verbe = this.verbes[k];
    const v = M.texteVerbe(this.jetons, verbe);
    this.ouvre('Compléments', `Compléments du verbe « ${v} » : sélectionne un groupe, puis lance les tests.`, METHODES.complements.etapes);
    this.phrase.surligner(verbe);
    this.afficheRestants();

    const analyser = () => {
      const groupe = this.phrase.valeur();
      const sujet = this.sujets[k] ?? [];
      if (groupe.some((i) => verbe.includes(i))) return remplit(this.retour, bulle('faux', 'Ta sélection contient le verbe : sélectionne seulement le complément.'));
      if (groupe.length && groupe.every((i) => sujet.includes(i))) return remplit(this.retour, bulle('faux', 'C’est le sujet : tu l’as déjà analysé.'));
      if (groupe.some((i) => this.groupes.some((g) => g.jetons.includes(i)))) return remplit(this.retour, bulle('faux', 'Une partie de ta sélection a déjà été analysée.'));
      const interdits = new Set([...this.verbes.flat(), ...sujet, ...this.groupes.flatMap((g) => g.jetons)]);
      if (this.selectionIncomplete(groupe, interdits)) return;
      const proposition = G.delimitePropositions(this.jetons, this.verbes)[k];
      const ctx = { jetons: this.jetons, verbe, sujet, groupe, proposition, niveau: this.niveau, autres: this.groupes.filter((g) => g.verbe === k) };
      this.phrase.active(false);
      this.arbre(ctx, G.questionSuivante, (c) => {
        this.groupes.push({ verbe: k, jetons: groupe, ...c });
        const circ = c.fonction === 'CC' && c.precision ? ` ${CIRCONSTANCES[c.precision].nom.split(' ')[0]}` : '';
        this.phrase.marque({ jetons: groupe, fonction: c.fonction, libelle: FONCTIONS[c.fonction].abrege + circ });
        this.etapeComplements(k);
      }, () => this.etapeComplements(k));
    };
    this.boutons(
      this.bouton('Tester ce groupe', analyser, 'principal', { selection: true }),
      this.bouton('Effacer', () => this.phrase.efface(), 'secondaire'),
      this.bouton(k + 1 < this.verbes.length ? 'Verbe suivant →' : 'J’ai fini les compléments →', () => this.etapeComplements(k + 1), 'lien'),
    );
  }

  // Avant les tests : la sélection est-elle un groupe entier ? Sinon on
  // explique pourquoi et on propose le groupe probable.
  selectionIncomplete(groupe, interdits) {
    const pb = G.verifieSelection(this.jetons, groupe, interdits);
    if (!pb) return false;
    const t = (ind) => recompose(ind.map((i) => this.jetons[i]));
    remplit(this.retour, bulle('attention', pb.message,
      pb.suggestion ? el('p', { class: 'exemple' }, `Groupe proposé : « ${t(pb.suggestion)} »`) : null));
    if (pb.suggestion) {
      // On remet ensuite les boutons de l'étape (« Tester ce groupe »…).
      const rangee = this.rangeeEtape;
      const retour = () => { remplit(this.actions, rangee); this.majBoutons?.(); };
      remplit(this.actions, el('div', { class: 'rangee' },
        this.bouton('Sélectionner ce groupe', () => { this.phrase.choisit(pb.suggestion); retour(); }),
        this.bouton('Corriger moi-même', () => { remplit(this.retour); retour(); }, 'secondaire')));
    }
    return true;
  }

  // Déroule un arbre de questions jusqu'à une conclusion.
  arbre(ctx, questionSuivante, surConclusion, surAnnulation, chemin = []) {
    const q = questionSuivante(ctx, chemin);
    if (q.conclusion) {
      remplit(this.retour, bulle('juste',
        el('p', {}, 'Conclusion : ', el('strong', {}, q.nom)),
        el('ul', {}, q.raisons.filter(Boolean).map((r) => el('li', {}, r))),
        el('p', { class: 'petit' }, FONCTIONS[q.fonction]?.definition ?? '')));
      this.boutons(
        this.bouton('Enregistrer', () => surConclusion(q)),
        this.bouton('Refaire les tests', () => this.arbre(ctx, questionSuivante, surConclusion, surAnnulation, []), 'secondaire'),
      );
      return;
    }
    remplit(this.retour, el('div', { class: 'carte-question' },
      el('p', { class: 'question-titre' }, q.titre),
      q.contexte ? el('p', { class: 'petit' }, q.contexte) : null,
      el('p', {}, q.texte),
      q.exemple ? el('p', { class: 'exemple' }, q.exemple) : null));
    remplit(this.actions, 
      choix(null, q.reponses.map((r) => ({ nom: r.texte, id: r.id })), (r) => this.arbre(ctx, questionSuivante, surConclusion, surAnnulation, [...chemin, { question: q.id, reponse: r.id }]), { colonnes: q.reponses.length > 3 }),
      el('button', { type: 'button', class: 'bouton bouton-lien', onclick: surAnnulation }, 'Annuler'),
    );
  }

  afficheRestants() {
    const faits = new Set([...this.verbes.flat(), ...this.sujets.flat().filter((i) => i != null), ...this.groupes.flatMap((g) => g.jetons)]);
    const restants = this.jetons.filter((j) => !j.ponct && !j.euphonique && !faits.has(j.i));
    if (restants.length) {
      remplit(this.retour, bulle('info', `Mots pas encore analysés : ${restants.map((j) => j.texte).join(' · ')}. Certains n’ont pas de fonction (ne… pas, et, mais, que…).`));
    }
  }

  // --- 5. Groupe nominal ---------------------------------------------------------------------

  etapeExpansions() {
    this.ouvre('Groupe nominal', 'Sélectionne un mot ou un groupe qui complète un nom (ou un adjectif), puis lance les tests.', METHODES.expansions.etapes);
    const analyser = () => {
      const groupe = this.phrase.valeur();
      if (groupe.some((i) => this.verbes.flat().includes(i))) return remplit(this.retour, bulle('faux', 'Ta sélection contient un verbe conjugué : une expansion du nom est un adjectif, un groupe prépositionnel ou une relative entière.'));
      if (this.selectionIncomplete(groupe, new Set([...this.verbes.flat(), ...this.expansions.flatMap((e) => e.jetons)]))) return;
      this.phrase.active(false);
      this.arbre({ jetons: this.jetons, groupe, niveau: this.niveau }, G.questionExpansion, (c) => {
        this.expansions.push({ jetons: groupe, ...c });
        this.phrase.marque({ jetons: groupe, fonction: c.fonction, libelle: FONCTIONS[c.fonction].abrege, niveau: 'groupe' });
        this.etapeExpansions();
      }, () => this.etapeExpansions());
    };
    this.boutons(
      this.bouton('Tester ce groupe', analyser, 'principal', { selection: true }),
      this.bouton('Effacer', () => this.phrase.efface(), 'secondaire'),
      this.bouton('J’ai fini →', () => this.etapeNatures(0), 'lien'),
    );
  }

  // --- 6. Natures ------------------------------------------------------------------------------

  etapeNatures(k) {
    this.unites ??= G.unitesNatures(this.jetons, this.verbes);
    if (k >= this.unites.length) return this.bilan();
    const u = this.unites[k];
    const cand = G.candidatsNature(this.jetons, u);
    const auNiv = (code) => natureAuNiveau(code, this.niveau);
    // Ordre fixe (celui de la terminologie) pour ne pas souffler la réponse.
    const ordre = Object.keys(NATURES);
    const possibles = [...new Set(cand.possibles.map(auNiv))].sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));
    const probable = cand.probable ? auNiv(cand.probable) : null;
    this.ouvre('Natures', `Nature de « ${u.texte} » (${k + 1} / ${this.unites.length})`, [
      ...METHODES.natures.etapes.slice(1, 3),
      possibles.length > 1 ? `D’après le dictionnaire, « ${u.texte} » peut être : ${possibles.map((p) => NATURES[p]?.nom.toLowerCase() ?? p).join(', ')}.` : cand.raison,
      ...(probable && possibles.length > 1 ? [`${cand.raison} Proposition : ${NATURES[probable]?.nom.toLowerCase()}.`] : []),
    ]);
    this.phrase.active(false);
    this.phrase.surligner(u.jetons);
    const enregistre = (code) => { this.natures[k] = { ...u, nature: code }; this.etapeNatures(k + 1); };
    const choisit = (code) => {
      if (!possibles.length || possibles.includes(code) || possibles.some((p) => NATURES[p]?.parent === code)) return enregistre(code);
      remplit(this.retour, bulle('attention', `Le dictionnaire ne connaît pas « ${u.texte} » comme ${NATURES[code].nom.toLowerCase()}. Es-tu sûr·e ?`));
      this.boutons(this.bouton('Je garde mon choix', () => enregistre(code), 'secondaire'), this.bouton('Changer', () => this.etapeNatures(k)));
    };
    const toutes = naturesProposees(this.niveau).flatMap((g) => (g.sous.length ? g.sous : [{ code: g.code, nom: g.nom }]));
    const montreToutes = () => remplit(this.actions, choix('Toutes les natures :', toutes, (o) => choisit(o.code), { colonnes: true }), passer);
    const passer = el('button', { type: 'button', class: 'bouton bouton-lien', onclick: () => this.bilan() }, 'Passer au bilan');
    if (possibles.length) {
      remplit(this.actions, 
        choix('Natures possibles d’après le dictionnaire :', possibles.map((p) => ({ code: p, nom: NATURES[p]?.nom ?? p })), (o) => choisit(o.code), { colonnes: true }),
        el('button', { type: 'button', class: 'bouton bouton-lien', onclick: montreToutes }, 'Autre nature…'),
        passer,
      );
    } else montreToutes();
  }

  // --- Bilan -----------------------------------------------------------------------------------

  bilan() {
    vide(this.zoneEtapes);
    this.consigne.textContent = 'Ton analyse';
    this.aide.racine.hidden = true;
    this.phrase.active(false);
    this.phrase.surligner([]);
    const t = (ind) => recompose(ind.map((i) => this.jetons[i]));
    const lignes = [];
    this.verbes.forEach((v, k) => {
      if (this.verbes.length > 1) lignes.push(el('tr', { class: 'ligne-prop' }, el('td', { colspan: '3' }, `Proposition du verbe « ${t(v)} »`)));
      const sujet = this.sujets[k];
      const groupes = [
        ...(sujet ? [{ jetons: sujet, nom: 'Sujet', raisons: ['Test « C’est… qui » réussi.'] }] : []),
        { jetons: v, nom: 'Verbe conjugué', raisons: [] },
        ...this.groupes.filter((g) => g.verbe === k),
      ].sort((a, b) => a.jetons[0] - b.jetons[0]);
      for (const g of groupes) lignes.push(el('tr', {}, el('td', {}, t(g.jetons)), el('td', {}, majuscule(g.nom)), el('td', { class: 'petit' }, g.raisons.filter(Boolean).join(' '))));
    });
    for (const e of this.expansions) lignes.push(el('tr', {}, el('td', {}, t(e.jetons)), el('td', {}, majuscule(e.nom)), el('td', { class: 'petit' }, e.raisons.filter(Boolean).join(' '))));
    const natures = this.natures.filter(Boolean);
    remplit(this.retour, 
      lignes.length ? el('table', { class: 'tableau-bilan' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Groupe'), el('th', {}, 'Fonction'), el('th', {}, 'Pourquoi'))),
        el('tbody', {}, lignes)) : null,
      natures.length ? el('p', { class: 'natures-bilan' }, natures.map((u) => el('span', {}, el('strong', {}, u.texte), ` ${NATURES[u.nature]?.nom.toLowerCase() ?? u.nature}`))) : null,
      bulle('info', 'Cette analyse repose sur tes réponses aux tests. Relis-la : si un test te semble douteux, recommence l’étape ou demande à ton professeur.'),
    );
    const texte = this.texteBilan(t, natures);
    this.boutons(
      this.bouton('Copier l’analyse', async () => {
        try {
          await navigator.clipboard.writeText(texte);
          this.retour.append(bulle('juste', 'Analyse copiée : tu peux la coller dans ton cahier numérique ou un message.'));
        } catch {
          this.retour.append(bulle('attention', 'La copie n’est pas possible sur cet appareil.'));
        }
      }, 'secondaire'),
      el('a', { class: 'bouton bouton-principal', href: '#/libre' }, 'Nouvelle phrase'),
    );
  }

  texteBilan(t, natures) {
    const l = [`Phrase : ${this.texte}`, ''];
    this.verbes.forEach((v, k) => {
      l.push(`Verbe conjugué : ${t(v)}`);
      if (this.sujets[k]) l.push(`  Sujet : ${t(this.sujets[k])}`);
      for (const g of this.groupes.filter((x) => x.verbe === k)) l.push(`  ${majuscule(g.nom)} : ${t(g.jetons)}`);
    });
    for (const e of this.expansions) l.push(`${majuscule(e.nom)} : ${t(e.jetons)}`);
    if (natures.length) l.push('', 'Natures :', ...natures.map((u) => `  ${u.texte} : ${NATURES[u.nature]?.nom.toLowerCase() ?? u.nature}`));
    return l.join('\n');
  }
}

const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Repère les mots qui relient les propositions et explique leur rôle.
function motsDeLiaison(jetons) {
  const liens = [];
  for (const j of jetons) {
    if (j.ponct) {
      if ([',', ';', ':'].includes(j.texte) && j.i > 0 && j.i < jetons.length - 1) liens.push({ i: j.i, texte: j.texte, role: 'peut séparer deux propositions juxtaposées.' });
      continue;
    }
    const natures = naturesPossibles(j.texte, { debutDePhrase: j.i === 0 });
    const m = normalise(j.texte);
    if (['que', "qu'"].includes(m)) {
      liens.push({ i: j.i, texte: j.texte, role: 'pronom relatif (s’il reprend un nom placé avant lui) ou conjonction de subordination (s’il ne reprend rien) : il introduit une proposition subordonnée.' });
    } else if (natures.includes('pro.rel') && !natures.includes('pro.pers') && j.i > 0) {
      liens.push({ i: j.i, texte: j.texte, role: 'pronom relatif : il introduit une proposition subordonnée relative (s’il reprend un nom placé avant lui).' });
    } else if (natures[0] === 'conj.sub') {
      liens.push({ i: j.i, texte: j.texte, role: 'conjonction de subordination : elle introduit une proposition subordonnée.' });
    } else if (natures.includes('conj.coord')) {
      liens.push({ i: j.i, texte: j.texte, role: 'conjonction de coordination : elle peut relier deux propositions coordonnées.' });
    }
  }
  return liens;
}
