// Questions partagées par les deux modes : identité du verbe.
// `vue` : { consigne, actions, retour } ; `affiche(r)` affiche un retour ;
// `fin(r, reponse)` est appelé quand tout est juste, avec la réponse donnée.

import { verifieInfinitif, verifieTemps, verifiePersonne, tempsProposes } from '../core/exercice.js';
import { libellePersonne } from '../core/verbe.js';
import { el, remplit, bulle, choix } from './composants.js';

export function demandeIdentite(vue, id, v, niveau, affiche, fin) {
  // 1. Infinitif (saisi au clavier).
  vue.consigne.textContent = `Quel est l’infinitif du verbe « ${v} » ?`;
  const champ = el('input', { type: 'text', class: 'champ-texte', autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Infinitif' });
  const valider = () => {
    const r = verifieInfinitif(id, champ.value);
    if (r.statut !== 'juste') return affiche(r);
    remplit(vue.retour, bulle('juste', r.message));
    const infinitif = champ.value.trim();
    demandeTemps(vue, id, v, niveau, affiche, (r2, rep) => fin(r2, { ...rep, infinitif }));
  };
  champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
  remplit(vue.actions, el('div', { class: 'rangee' }, champ, el('button', { type: 'button', class: 'bouton bouton-principal', onclick: valider }, 'Valider')));
  champ.focus();
}

// 2. Mode puis temps.
function demandeTemps(vue, id, v, niveau, affiche, fin) {
  vue.consigne.textContent = `À quel mode et à quel temps est « ${v} » ?`;
  const modes = tempsProposes(niveau);
  remplit(vue.actions, choix('Mode :', modes.map((m) => ({ code: m.code, nom: m.nom })), (m) => {
    const mode = modes.find((x) => x.code === m.code);
    remplit(vue.actions,
      choix(`Temps (${mode.nom.toLowerCase()}) :`, mode.temps, (t) => {
        const r = verifieTemps(id, mode.code, t.code);
        if (r.statut !== 'juste') return affiche(r);
        remplit(vue.retour, bulle('juste', r.message));
        demandePersonne(vue, id, v, mode.code, t.code, affiche, fin);
      }, { colonnes: true }),
      el('button', { type: 'button', class: 'bouton bouton-lien', onclick: () => demandeTemps(vue, id, v, niveau, affiche, fin) }, '← Autre mode'));
  }, { colonnes: true }));
}

// 3. Personne (à l'impératif : 2e du singulier, 1re et 2e du pluriel).
function demandePersonne(vue, id, v, mode, temps, affiche, fin) {
  vue.consigne.textContent = `À quelle personne est « ${v} » ?`;
  const personnes = ['s', 'p'].flatMap((n) => [1, 2, 3].map((p) => ({ code: `${p}${n}`, p, n, nom: libellePersonne(p, n) })))
    .filter((x) => mode !== 'imp' || ['2s', '1p', '2p'].includes(x.code));
  remplit(vue.actions, choix(null, personnes, (x) => {
    const r = verifiePersonne(id, mode, temps, x.p, x.n);
    if (r.statut !== 'juste') return affiche(r);
    fin(r, { mode, temps, personne: x.p, nombre: x.n });
  }, { colonnes: true }));
}
