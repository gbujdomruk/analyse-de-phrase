import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const racine = new URL('../', import.meta.url);

test('le cache hors connexion (sw.js) contient tous les fichiers JavaScript', () => {
  const sw = readFileSync(new URL('sw.js', racine), 'utf8');
  const fichiers = readdirSync(new URL('js/', racine), { recursive: true }).filter((f) => f.endsWith('.js'));
  for (const f of fichiers) assert.ok(sw.includes(`'./js/${f}'`), `sw.js ne met pas en cache js/${f}`);
});

test('le manifeste désigne des icônes qui existent', () => {
  const manifeste = JSON.parse(readFileSync(new URL('manifest.webmanifest', racine), 'utf8'));
  for (const icone of manifeste.icons) assert.ok(readFileSync(new URL(icone.src, racine)).length > 0);
});
