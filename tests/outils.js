// Charge le dictionnaire pour les tests (Node ne sait pas faire fetch sur un fichier).
import { readFileSync } from 'node:fs';
import { installeLexique } from '../js/core/lexique.js';

installeLexique(JSON.parse(readFileSync(new URL('../data/lexique.json', import.meta.url), 'utf8')));
