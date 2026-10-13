// Builds the deployable site into _site/: copies the app files, then writes a
// versioned service worker and version.json. Run by CI before deploying and by
// the end-to-end tests. Usage: node tools/build.mjs [outDir]
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, '_site');

const include = ['index.html', 'styles.css', 'manifest.webmanifest', 'icons', 'fonts', 'vendor', 'src'];
const skip = (p) => /(^|\/)\.|LICENSE$|\.md$/.test(p);

function walk(p) {
  const abs = join(root, p);
  if (statSync(abs).isDirectory()) return readdirSync(abs).flatMap((f) => walk(join(p, f)));
  return skip(p) ? [] : [p];
}

const files = include.flatMap(walk).sort();
rmSync(out, { recursive: true, force: true });
const hash = createHash('sha256');
for (const f of files) {
  const data = readFileSync(join(root, f));
  hash.update(f).update(createHash('sha256').update(data).digest('hex'));
  mkdirSync(dirname(join(out, f)), { recursive: true });
  copyFileSync(join(root, f), join(out, f));
}
// licences travel with the code but aren't precached
for (const lic of ['vendor/THREE-LICENSE', 'fonts/LEXEND-LICENSE']) copyFileSync(join(root, lic), join(out, lic));

const version = hash.digest('hex').slice(0, 12);
const app = /APP_VERSION = '([^']+)'/.exec(readFileSync(join(root, 'src/version.js'), 'utf8'))[1];
const schema = Number(/DATA_SCHEMA = (\d+)/.exec(readFileSync(join(root, 'src/version.js'), 'utf8'))[1]);
const precache = ['./', ...files];
const sw = readFileSync(join(root, 'tools/sw-template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(precache));
writeFileSync(join(out, 'sw.js'), sw);
writeFileSync(join(out, 'version.json'), JSON.stringify({ version, app, schema, files: files.length, built: new Date().toISOString() }, null, 2));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`Built ${files.length} files into ${relative(process.cwd(), out) || '.'} (version ${version}, app ${app})`);
