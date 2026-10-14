// Petits composants d'interface partagés par les deux modes.

import { FONCTIONS } from '../data/terminologie.js';

// Crée un élément : el('button', { class: 'x', onclick }, 'texte', enfant…)
export function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of enfants.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}

export const vide = (noeud) => { noeud.replaceChildren(); return noeud; };

// Remplace le contenu d'un nœud ; les enfants absents (null, false) sont
// ignorés au lieu d'afficher le texte « null ».
export function remplit(noeud, ...enfants) {
  noeud.replaceChildren(...enfants.flat().filter((c) => c != null && c !== false));
  return noeud;
}

// --- Phrase interactive -----------------------------------------------------------

// Affiche la phrase mot par mot. Chaque mot est un bouton qu'on touche pour
// le sélectionner. `marques` : groupes déjà analysés, affichés en couleur.
export class PhraseInteractive {
  constructor({ jetons, surSelection = () => {} }) {
    this.jetons = jetons;
    this.selection = new Set();
    this.marques = [];
    this.indices = new Set();
    this.surligne = new Set();
    this.actif = true;
    this.surSelection = surSelection;
    this.racine = el('div', { class: 'phrase', role: 'group', 'aria-label': 'Phrase à analyser' });
    this.dessine();
  }

  // groupe : { jetons, fonction, libelle, niveau: 'phrase' | 'groupe' }
  marque(groupe) { this.marques.push(groupe); this.dessine(); }
  retireMarques(filtre = () => true) { this.marques = this.marques.filter((m) => !filtre(m)); this.dessine(); }
  montre(indices = []) { this.indices = new Set(indices); this.dessine(); }
  surligner(indices = []) { this.surligne = new Set(indices); this.dessine(); }
  efface() { this.selection.clear(); this.dessine(); this.surSelection([]); }
  active(oui) { this.actif = oui; this.dessine(); }
  valeur() { return [...this.selection].sort((a, b) => a - b); }
  choisit(indices) { this.selection = new Set(indices); this.dessine(); this.surSelection(this.valeur()); }

  bascule(i) {
    if (!this.actif) return;
    if (this.selection.has(i)) this.selection.delete(i);
    else this.selection.add(i);
    this.dessine();
    this.surSelection(this.valeur());
  }

  dessine() {
    vide(this.racine);
    const phrase = this.marques.filter((m) => m.niveau !== 'groupe');
    const groupe = this.marques.filter((m) => m.niveau === 'groupe');
    for (const j of this.jetons) {
      if (j.ponct) {
        this.racine.append(el('span', { class: `ponct${j.avant === '' ? ' colle' : ''}` }, j.texte));
        continue;
      }
      // Pour un mot inclus dans plusieurs groupes (subordonnée COD qui contient
      // un sujet), on affiche le groupe le plus petit.
      const plusPetit = (liste) => liste.filter((g) => g.jetons.includes(j.i))
        .sort((a, b) => a.jetons.length - b.jetons.length)[0];
      const m = plusPetit(phrase);
      const e = plusPetit(groupe);
      const classes = ['mot'];
      if (j.avant !== ' ' && j.i > 0) classes.push('colle');
      if (this.selection.has(j.i)) classes.push('choisi');
      if (m) classes.push(`f-${FONCTIONS[m.fonction]?.couleur ?? m.fonction}`);
      if (e) classes.push('expansion', `x-${FONCTIONS[e.fonction]?.couleur ?? 'expansion'}`);
      if (this.indices.has(j.i)) classes.push('indice');
      if (this.surligne.has(j.i)) classes.push('surligne');
      const premier = (g) => g && g.jetons.filter((k) => !this.jetons[k].ponct)[0] === j.i;
      const bouton = el('button', {
        type: 'button',
        class: classes.join(' '),
        'aria-pressed': this.selection.has(j.i) ? 'true' : 'false',
        disabled: !this.actif || null,
        onclick: () => this.bascule(j.i),
      }, el('span', { class: 'texte-mot' }, j.texte));
      if (premier(m)) bouton.append(el('span', { class: 'etiquette' }, m.libelle));
      else if (premier(e)) bouton.append(el('span', { class: 'etiquette etiquette-x' }, e.libelle));
      this.racine.append(bouton);
    }
  }
}

// --- Retours et aides -----------------------------------------------------------------

export function bulle(type, ...contenu) {
  const icones = { juste: '✓', faux: '✗', partiel: '…', info: 'i', attention: '!' };
  return el('div', { class: `bulle bulle-${type}`, role: type === 'faux' ? 'alert' : 'status' },
    el('span', { class: 'bulle-icone', 'aria-hidden': 'true' }, icones[type] ?? 'i'),
    el('div', { class: 'bulle-texte' }, ...contenu));
}

// Panneau d'aides graduées : chaque appui dévoile l'aide suivante.
// `avecReponse` : la dernière aide donne la réponse (mode entraînement).
export class PanneauAide {
  constructor({ surIndice = () => {}, avecReponse = true } = {}) {
    this.avecReponse = avecReponse;
    this.aides = [];
    this.niveau = 0;
    this.surIndice = surIndice;
    this.liste = el('ol', { class: 'aides' });
    this.bouton = el('button', { type: 'button', class: 'bouton bouton-aide', onclick: () => this.suivante() }, 'Je suis bloqué·e');
    this.racine = el('div', { class: 'panneau-aide' }, this.liste, this.bouton);
  }

  charge(aides) {
    this.aides = aides;
    this.niveau = 0;
    vide(this.liste);
    this.metAJourBouton();
  }

  suivante() {
    const a = this.aides[this.niveau];
    if (!a) return;
    const texte = typeof a === 'string' ? a : a.texte;
    const reponse = this.avecReponse && this.niveau === this.aides.length - 1;
    this.liste.append(el('li', { class: reponse ? 'aide-reponse' : '' }, texte));
    if (a.montre) this.surIndice(a.montre);
    this.niveau++;
    this.metAJourBouton();
  }

  metAJourBouton() {
    const reste = this.aides.length - this.niveau;
    this.bouton.hidden = reste <= 0;
    this.bouton.textContent = this.niveau === 0 ? 'Je suis bloqué·e'
      : reste === 1 && this.avecReponse ? 'Voir la réponse' : 'Encore un indice';
  }
}

// Liste de choix (fonctions, natures…) affichée sous la phrase.
export function choix(titre, options, surChoix, { colonnes = false } = {}) {
  return el('div', { class: 'choix' },
    titre ? el('p', { class: 'choix-titre' }, titre) : null,
    el('div', { class: `choix-liste${colonnes ? ' colonnes' : ''}` },
      options.map((o) => el('button', {
        type: 'button',
        class: `bouton bouton-choix${o.couleur ? ` c-${o.couleur}` : ''}`,
        title: o.definition ?? null,
        onclick: () => surChoix(o),
      }, o.nom, o.detail ? el('small', {}, o.detail) : null))));
}

export function etapes(noms, courant) {
  return el('ol', { class: 'etapes', 'aria-label': 'Étapes' },
    noms.map((n, k) => el('li', {
      class: k < courant ? 'fait' : k === courant ? 'courant' : '',
      'aria-current': k === courant ? 'step' : null,
    }, el('span', { class: 'pastille' }, k < courant ? '✓' : String(k + 1)), el('span', { class: 'nom-etape' }, n))));
}

export const melange = (t) => {
  const r = [...t];
  for (let i = r.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [r[i], r[k]] = [r[k], r[i]];
  }
  return r;
};

// Mémorise une préférence ; le stockage peut être indisponible.
export const memoire = {
  lit(cle, defaut) { try { return localStorage.getItem(cle) ?? defaut; } catch { return defaut; } },
  ecrit(cle, valeur) { try { localStorage.setItem(cle, valeur); } catch { /* sans stockage */ } },
};
