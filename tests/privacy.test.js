// The repository is public. Nothing personal beyond the player's first name
// may appear in it: no health or diagnosis details, no school names, no dates
// of birth, no family or home arrangements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url);
const SKIP = /(^|\/)(node_modules|vendor|_site|\.git|test-results|fonts|icons)(\/|$)|package-lock\.json$|\.(png|woff2|bloxbak)$/;

// Patterns are assembled from pieces so this file doesn't match itself.
const BANNED = [
  ['AD', 'HD'],
  ['dys', 'lex'],
  ['Harvey', ' Grammar'],
  ['date of', ' birth'],
  ['\\bD', 'OB\\b'],
  ['born ', 'on'],
  ['Dad', "'s"],
  ['Mum', "'s"],
  ['one ', 'home'],
  ['each parent', "'s home"],
  ['diagnos', ''],
].map((p) => new RegExp(p.join(''), 'i'));

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(root, p);
    if (SKIP.test(rel)) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (p !== self) yield [rel, p];
  }
}

test('no personal details in the repository', () => {
  const hits = [];
  for (const [rel, p] of files(root)) {
    const text = readFileSync(p, 'utf8');
    for (const re of BANNED) {
      const m = re.exec(text);
      if (m) hits.push(`${rel}: "${m[0]}"`);
    }
  }
  assert.deepEqual(hits, []);
});
