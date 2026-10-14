// Mode « S'entraîner » : phrases de la banque, corrigées pas à pas.

import { PHRASES } from '../data/phrases.js';
import { FONCTIONS, CIRCONSTANCES, PROPOSITIONS, NATURES, naturesProposees, natureAuNiveau, categorie, auNiveau } from '../data/terminologie.js';
import { construitCorrige, texteDe } from '../core/notation.js';
import { estMotCompose } from '../core/lexique.js';
import {
  THEMES, TITRES_ETAPES, phrasesDuTheme, creeExercice, verifieVerbes, verifieSujet,
  verifieComplement, verifieCirconstance, circonstancesProposees, verifieExpansion,
  verifieProposition, typesPropositions, verifieNature, aides, fonctionsProposees, libelleNature,
} from '../core/exercice.js';
import { el, vide, remplit, PhraseInteractive, PanneauAide, bulle, choix, etapes, melange } from './composants.js';

export function ecranThemes(racine, niveau) {
  remplit(racine, 
    el('h1', {}, 'S’entraîner'),
    el('p', { class: 'intro' }, 'Choisis ce que tu veux travailler. Chaque phrase est corrigée étape par étape.'),
    el('div', { class: 'cartes' }, Object.entries(THEMES).map(([id, t]) => {
      const n = phrasesDuTheme(PHRASES, id, niveau).length;
      return el('a', { class: 'carte', href: `#/entrainement/${id}` },
        el('strong', {}, t.titre), el('span', {}, t.resume), el('small', {}, `${n} phrase${n > 1 ? 's' : ''}`));
    })),
  );
}

export function ecranExercice(racine, niveau, theme) {
  if (!THEMES[theme]) { location.hash = '#/entrainement'; return; }
  const phrases = melange(phrasesDuTheme(PHRASES, theme, niveau));
  new Seance(racine, niveau, theme, phrases).phraseSuivante();
}

class Seance {
  constructor(racine, niveau, theme, phrases) {
    Object.assign(this, { racine, niveau, theme, phrases, rang: -1, reussites: 0 });
  }

  phraseSuivante() {
    this.rang++;
    if (this.rang >= this.phrases.length) return this.fin();
    const entree = this.phrases[this.rang];
    this.corrige = construitCorrige(entree, estMotCompose);
    this.ex = creeExercice(this.corrige, this.theme, this.niveau);
    this.etape = 0;
    this.item = 0;
    this.erreurs = 0;
    this.construitEcran();
    // Les étapes données sont affichées d'emblée.
    while (this.ex.etapes[this.etape]?.donne) {
      for (const it of this.ex.etapes[this.etape].items) this.marqueReponse(this.ex.etapes[this.etape], it);
      this.etape++;
    }
    this.lanceItem();
  }

  construitEcran() {
    const t = THEMES[this.theme];
    this.phrase = new PhraseInteractive({ jetons: this.corrige.jetons, surSelection: () => this.majBoutons?.() });
    this.aide = new PanneauAide({ surIndice: (ind) => this.phrase.montre(ind) });
    this.zoneEtapes = el('div');
    this.consigne = el('h2', { class: 'consigne', 'aria-live': 'polite' });
    this.actions = el('div', { class: 'actions' });
    this.retour = el('div', { class: 'retour', 'aria-live': 'polite' });
    remplit(this.racine, 
      el('div', { class: 'barre-exercice' },
        el('a', { href: '#/entrainement', class: 'retour-lien' }, '← Thèmes'),
        el('span', { class: 'compteur' }, `${t.titre} · phrase ${this.rang + 1} / ${this.phrases.length}`)),
      this.zoneEtapes, this.consigne, this.phrase.racine, this.retour, this.actions, this.aide.racine,
    );
  }

  get etapeCourante() { return this.ex.etapes[this.etape]; }
  get itemCourant() { return this.etapeCourante?.items[this.item]; }

  lanceItem() {
    const etape = this.etapeCourante;
    if (!etape) return this.bilan();
    const aDemander = this.ex.etapes.filter((e) => !e.donne);
    remplit(this.zoneEtapes, etapes(aDemander.map((e) => TITRES_ETAPES[e.type]), aDemander.indexOf(etape)));
    this.trouves = [];
    this.phrase.efface();
    this.phrase.montre([]);
    this.phrase.surligner([]);
    this.phrase.active(true);
    vide(this.retour);
    this.aide.charge(aides(this.corrige, etape, this.itemCourant, this.niveau, this.trouves));
    this[`etape_${etape.type}`](this.itemCourant);
  }

  // --- Étapes ----------------------------------------------------------------

  etape_verbes(item) {
    this.consigne.textContent = 'Touche le ou les verbes conjugués.';
    this.boutonsSelection(() => this.affiche(verifieVerbes(this.corrige, item, this.phrase.valeur()), () => this.marqueReponse(this.etapeCourante, item)));
  }

  etape_sujets(item) {
    const v = texteDe(this.corrige.jetons, item.prop.verbe.jetons);
    this.consigne.textContent = `Quel est le sujet du verbe « ${v} » ?`;
    this.phrase.montre([]);
    this.phrase.surligner(item.prop.verbe.jetons);
    this.boutonsSelection(
      () => this.affiche(verifieSujet(this.corrige, item, this.phrase.valeur()), () => this.marqueReponse(this.etapeCourante, item)),
      [el('button', { type: 'button', class: 'bouton bouton-secondaire', onclick: () => this.affiche(verifieSujet(this.corrige, item, [], true), () => {}) }, 'Pas de sujet')],
    );
  }

  etape_fonctions(item) {
    const v = texteDe(this.corrige.jetons, item.prop.verbe.jetons);
    this.phrase.surligner(item.prop.verbe.jetons);
    const majConsigne = () => {
      const reste = item.cibles.length - this.trouves.length;
      this.consigne.textContent = `Compléments du verbe « ${v} » : sélectionne un groupe, puis choisis sa fonction. (${reste} à trouver)`;
    };
    majConsigne();
    const options = fonctionsProposees('fonctions', this.niveau).map((f) => ({ ...f, couleur: FONCTIONS[f.code].couleur }));
    this.choixGroupe(options, (f) => {
      const r = verifieComplement(this.corrige, item, this.phrase.valeur(), f.code, this.trouves);
      if (r.statut !== 'juste') return this.affiche(r);
      const g = r.groupe;
      const suite = () => {
        this.trouves.push(g);
        this.phrase.marque({ jetons: g.jetons, fonction: g.fonction, libelle: libelleGroupe(g, this.niveau) });
        this.phrase.efface();
        this.aide.charge(aides(this.corrige, this.etapeCourante, item, this.niveau, this.trouves));
        majConsigne();
        if (this.trouves.length === item.cibles.length) this.termineItem(r.message);
        else {
          remplit(this.retour, bulle('juste', r.message));
          this.phrase.active(true);
          this.choixGroupe(options, this.dernierChoix);
        }
      };
      // Pour un complément circonstanciel, on demande aussi son sens.
      if (g.fonction === 'CC' && g.precision && auNiveau(CIRCONSTANCES[g.precision].niveau, this.niveau)) {
        remplit(this.retour, bulle('juste', r.message, ' Quel est son sens ?'));
        this.phrase.active(false);
        remplit(this.actions, choix('Ce complément indique…', circonstancesProposees(this.niveau).map((c) => ({ ...c, detail: c.question })), (c) => {
          const rc = verifieCirconstance(g, c.code);
          if (rc.statut === 'juste') { suite(); remplit(this.retour, bulle('juste', rc.message)); } else this.affiche(rc);
        }, { colonnes: true }));
      } else suite();
    });
  }

  etape_expansions(item) {
    const majConsigne = () => {
      const reste = item.cibles.length - this.trouves.length;
      this.consigne.textContent = `Trouve ce qui complète les noms (ou les adjectifs) : sélectionne l’expansion, puis choisis sa fonction. (${reste} à trouver)`;
    };
    majConsigne();
    const options = fonctionsProposees('expansions', this.niveau).map((f) => ({ ...f, couleur: 'expansion' }));
    this.choixGroupe(options, (f) => {
      const r = verifieExpansion(this.corrige, item, this.phrase.valeur(), f.code, this.trouves);
      if (r.statut !== 'juste') return this.affiche(r);
      this.trouves.push(r.groupe);
      this.phrase.marque({ jetons: r.groupe.jetons, fonction: r.groupe.fonction, libelle: FONCTIONS[r.groupe.fonction].abrege, niveau: 'groupe' });
      this.phrase.efface();
      this.aide.charge(aides(this.corrige, this.etapeCourante, item, this.niveau, this.trouves));
      majConsigne();
      if (this.trouves.length === item.cibles.length) this.termineItem(r.message);
      else remplit(this.retour, bulle('juste', r.message));
    });
  }

  etape_propositions(item) {
    this.phrase.active(false);
    this.phrase.surligner(item.prop.jetonsPropres);
    this.consigne.textContent = `Proposition ${item.prop.numero} sur ${this.corrige.propositions.length} : de quel type est la proposition surlignée ?`;
    remplit(this.actions, choix(null, typesPropositions(this.niveau), (t) => {
      this.affiche(verifieProposition(this.corrige, item, t.code), () => {});
    }));
  }

  etape_natures(item) {
    this.phrase.active(false);
    this.phrase.surligner(item.unite.jetons);
    this.consigne.textContent = `Quelle est la nature de « ${item.unite.texte} » ? (${this.item + 1} / ${this.etapeCourante.items.length})`;
    const groupes = naturesProposees(this.niveau);
    const montreCategories = () => remplit(this.actions, choix(null, groupes.map((g) => ({ ...g })), (g) => {
      // On demande la sous-catégorie seulement si elle est au programme.
      if (g.sous.length && categorie(item.attendu) === g.code && item.attendu !== g.code) {
        remplit(this.retour, bulle('partiel', `Oui, c’est ${libelleNature(g.code)}. Précise lequel ou laquelle :`));
        remplit(this.actions, choix(null, g.sous, (s) => this.affiche(verifieNature(item, s.code, this.niveau), () => {})),
          el('button', { type: 'button', class: 'bouton bouton-lien', onclick: montreCategories }, '← Autre catégorie'));
        return;
      }
      this.affiche(verifieNature(item, g.code, this.niveau), () => {});
    }, { colonnes: true }));
    montreCategories();
  }

  // --- Outils d'interaction --------------------------------------------------------

  // Boutons « Valider » et « Effacer » pour les étapes de sélection.
  boutonsSelection(valider, autres = []) {
    const ok = el('button', { type: 'button', class: 'bouton bouton-principal', onclick: valider }, 'Valider');
    const effacer = el('button', { type: 'button', class: 'bouton bouton-secondaire', onclick: () => this.phrase.efface() }, 'Effacer');
    this.majBoutons = () => { ok.disabled = this.phrase.valeur().length === 0; };
    this.majBoutons();
    remplit(this.actions, el('div', { class: 'rangee' }, ok, effacer, ...autres));
  }

  // Sélection d'un groupe puis choix de sa fonction.
  choixGroupe(options, surChoix) {
    this.dernierChoix = surChoix;
    const liste = choix('Fonction du groupe sélectionné :', options, (o) => {
      if (!this.phrase.valeur().length) return this.affiche({ statut: 'faux', message: 'Sélectionne d’abord les mots du groupe dans la phrase.' });
      surChoix(o);
    }, { colonnes: true });
    const effacer = el('button', { type: 'button', class: 'bouton bouton-lien', onclick: () => this.phrase.efface() }, 'Effacer la sélection');
    this.majBoutons = () => liste.classList.toggle('en-attente', this.phrase.valeur().length === 0);
    this.majBoutons();
    remplit(this.actions, liste, effacer);
  }

  affiche(r, siJuste) {
    remplit(this.retour, bulle(r.statut, r.message));
    if (r.statut === 'faux') this.erreurs++;
    if (r.statut === 'juste' && siJuste) {
      siJuste();
      this.termineItem(r.message);
    }
  }

  termineItem(message) {
    this.phrase.active(false);
    this.phrase.montre([]);
    const dernier = this.etape === this.ex.etapes.length - 1 && this.item === this.etapeCourante.items.length - 1;
    const suivant = el('button', { type: 'button', class: 'bouton bouton-principal', onclick: () => this.avance() }, dernier ? 'Voir le bilan' : 'Continuer →');
    remplit(this.retour, bulle('juste', message));
    remplit(this.actions, suivant);
    suivant.focus();
  }

  avance() {
    this.item++;
    if (this.item >= this.etapeCourante.items.length) { this.etape++; this.item = 0; }
    this.lanceItem();
  }

  marqueReponse(etape, item) {
    const c = this.corrige;
    if (etape.type === 'verbes') {
      for (const p of c.propositions) if (p.verbe && p.conjuguee) this.phrase.marque({ jetons: p.verbe.jetons, fonction: 'V', libelle: 'Verbe' });
    }
    if (etape.type === 'sujets' && item.prop.sujet) this.phrase.marque({ jetons: item.prop.sujet.jetons, fonction: 'S', libelle: 'Sujet' });
  }

  // --- Fin de phrase ------------------------------------------------------------------

  bilan() {
    if (this.erreurs === 0) this.reussites++;
    const c = this.corrige;
    const ligne = (groupe, fonction) => el('tr', {}, el('td', {}, texteDe(c.jetons, groupe.jetons)), el('td', {}, fonction));
    const lignes = c.propositions.flatMap((p) => [
      c.propositions.length > 1
        ? el('tr', { class: 'ligne-prop' }, el('td', { colspan: '2' }, `${PROPOSITIONS[p.type].nom} : « ${texteDe(c.jetons, p.jetonsPropres)} »`))
        : null,
      ...[p.sujet, p.verbe, ...p.complements].filter(Boolean).sort((a, b) => a.jetons[0] - b.jetons[0])
        .map((g) => ligne(g, libelleGroupe(g, this.niveau, true))),
    ]);
    const expansions = c.expansions.filter((e) => auNiveau(FONCTIONS[e.fonction].niveau, this.niveau))
      .map((e) => ligne(e, FONCTIONS[e.fonction].nom));
    const tableau = el('table', { class: 'tableau-bilan' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Groupe'), el('th', {}, 'Fonction'))),
      el('tbody', {}, ...lignes, ...expansions));
    const natures = c.natures && this.ex.etapes.some((e) => e.type === 'natures')
      ? el('p', { class: 'natures-bilan' }, c.natures.map((u) => el('span', {}, el('strong', {}, u.texte), ` ${NATURES[natureAuNiveau(u.nature, this.niveau)]?.nom.toLowerCase() ?? u.nature}`)))
      : null;
    remplit(this.consigne, this.erreurs === 0 ? 'Parfait, sans erreur !' : `Phrase terminée (${this.erreurs} erreur${this.erreurs > 1 ? 's' : ''} corrigée${this.erreurs > 1 ? 's' : ''}).`);
    vide(this.zoneEtapes);
    this.aide.racine.hidden = true;
    remplit(this.retour, tableau, natures, c.note ? bulle('info', c.note) : null);
    remplit(this.actions, el('button', { type: 'button', class: 'bouton bouton-principal', onclick: () => this.phraseSuivante() },
      this.rang + 1 < this.phrases.length ? 'Phrase suivante →' : 'Terminer'));
  }

  fin() {
    remplit(this.racine, 
      el('h1', {}, 'Bravo !'),
      el('p', { class: 'intro' }, `Tu as analysé ${this.phrases.length} phrase${this.phrases.length > 1 ? 's' : ''}, dont ${this.reussites} sans aucune erreur.`),
      el('div', { class: 'rangee' },
        el('a', { class: 'bouton bouton-principal', href: '#/entrainement' }, 'Autre thème'),
        el('button', { type: 'button', class: 'bouton bouton-secondaire', onclick: () => ecranExercice(this.racine, this.niveau, this.theme) }, 'Recommencer')),
    );
  }
}

// Libellé abrégé sous les mots (« CC temps »), complet dans le bilan.
function libelleGroupe(g, niveau, long = false) {
  const f = FONCTIONS[g.fonction];
  const circ = g.fonction === 'CC' && g.precision && auNiveau(CIRCONSTANCES[g.precision].niveau, niveau)
    ? CIRCONSTANCES[g.precision].nom : null;
  if (long) return circ ? `${f.nom} de ${circ}` : f.nom;
  return circ ? `${f.abrege} ${circ.split(' ')[0]}` : f.abrege;
}
