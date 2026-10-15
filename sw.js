// Mise en cache pour l'application installée : elle fonctionne hors connexion.
// Stratégie : le réseau d'abord (pour avoir toujours la dernière version),
// le cache si le réseau ne répond pas. Le dictionnaire, lourd et stable,
// est servi depuis le cache dès qu'il y est.
// Changer VERSION quand le dictionnaire change, pour vider l'ancien cache.

const VERSION = 'analyse-v1';
const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './data/lexique.json',
  './icones/icone-192.png',
  './icones/apple-touch-icon.png',
  './js/core/decoupage.js',
  './js/core/exercice.js',
  './js/core/groupes.js',
  './js/core/guide.js',
  './js/core/lexique.js',
  './js/core/manipulations.js',
  './js/core/notation.js',
  './js/core/phrase.js',
  './js/core/verbe.js',
  './js/data/methodes.js',
  './js/data/mots-outils.js',
  './js/data/phrases.js',
  './js/data/terminologie.js',
  './js/main.js',
  './js/ui/composants.js',
  './js/ui/entrainement.js',
  './js/ui/fiches.js',
  './js/ui/libre.js',
  './js/ui/questions.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== location.origin) return;
  if (requete.url.endsWith('/data/lexique.json')) {
    e.respondWith(caches.match(requete).then((r) => r ?? fetch(requete)));
    return;
  }
  e.respondWith(fetch(requete)
    .then((reponse) => {
      if (reponse.ok) {
        const copie = reponse.clone();
        caches.open(VERSION).then((cache) => cache.put(requete, copie));
      }
      return reponse;
    })
    .catch(() => caches.match(requete, { ignoreSearch: true }).then((r) => r ?? caches.match('./index.html'))));
});
