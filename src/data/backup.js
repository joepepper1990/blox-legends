// Backup files (.bloxbak). One file restores the whole game on its own, with
// no server needed (plan §19.2).
//
// File = gzip(JSON envelope). Envelope:
//   format, fv (format version), app, created, profile, device, mode,
//   frontier (highest op number per device), ledger (economy authority info),
//   summary (safe counts for the preview), sha256 (of the canonical sections),
//   crypto (when passphrase-protected) and either `sections` or encrypted `payload`.
//
// Sections: learning (every op), derived (mastery), economy, records,
// settings, prefs, meta (applied migrations), other (any newer fields).

import { defaults, mergeDeep, levelInfo } from '../save.js';
import { sha256Hex, toBase64, fromBase64, deriveKey } from './crypto.js';
import { APP_VERSION, DATA_SCHEMA } from '../version.js';
import { upgradeData, needsUpgrade } from './upgrade.js';

export const BACKUP_FORMAT = 'bloxbak';
// 2: learning state in the new learner model (DATA_SCHEMA 3). Version 1
// files still restore (they're upgraded); older apps refuse version 2.
export const BACKUP_FV = 2;

// JSON with sorted keys, so the same data always hashes the same.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

const COVERED = ['learn', 'coins', 'xp', 'owned', 'best', 'totals', 'history', 'day', 'created', 'settings', 'name', 'look', 'v'];

export function splitSections(data, ops, meta = {}) {
  const settings = { ...(data.settings || {}) };
  delete settings.pin; // PINs never leave the iPad
  const other = {};
  for (const k of Object.keys(data)) if (!COVERED.includes(k)) other[k] = data[k];
  return {
    learning: ops,
    derived: { learn: data.learn },
    economy: { coins: data.coins, xp: data.xp, owned: data.owned },
    records: { best: data.best, totals: data.totals, history: data.history, day: data.day, created: data.created },
    settings,
    prefs: { name: data.name, look: data.look },
    meta: { migrations: meta.migrations || [] },
    other,
  };
}

export function joinSections(s) {
  const learn = upgradeData({ learn: s.derived.learn }).learn;
  return mergeDeep(defaults(), {
    ...s.other,
    learn,
    ...s.economy,
    ...s.records,
    settings: s.settings,
    name: s.prefs.name,
    look: s.prefs.look,
  });
}

export function summarize(sections, created = Date.now()) {
  const e = sections.economy;
  const r = sections.records;
  return {
    created,
    name: sections.prefs.name || '',
    coins: e.coins || 0,
    level: levelInfo(e.xp || 0).level,
    owned: (e.owned || []).length,
    answered: r.totals?.answered || 0,
    skills: Object.keys(sections.derived.learn?.sk || sections.derived.learn?.skills || {}).length,
    ops: sections.learning.length,
  };
}

// ---- compression ----
async function streamBytes(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
const canGzip = () => typeof CompressionStream !== 'undefined';
const gzip = (b) => streamBytes(b, new CompressionStream('gzip'));
const gunzip = (b) => streamBytes(b, new DecompressionStream('gzip'));
const isGzip = (b) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

// ---- encode / decode ----
export async function encodeBackup(header, sections, { passphrase } = {}) {
  const body = canonical(sections);
  const env = { ...header, format: BACKUP_FORMAT, fv: BACKUP_FV, sha256: await sha256Hex(body) };
  if (passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(body)));
    env.crypto = { alg: 'AES-GCM', kdf: 'PBKDF2-SHA256', iter: 200000, salt: toBase64(salt), iv: toBase64(iv) };
    env.payload = toBase64(ct);
  } else {
    env.sections = sections;
  }
  const json = new TextEncoder().encode(JSON.stringify(env));
  return canGzip() ? gzip(json) : json;
}

export class BackupError extends Error {}

// Read just the envelope (for the preview, before asking for a passphrase).
export async function readEnvelope(bytes) {
  let raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (isGzip(raw)) {
    if (typeof DecompressionStream === 'undefined') throw new BackupError('This iPad is too old to open compressed backups.');
    raw = await gunzip(raw);
  }
  let env;
  try {
    env = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new BackupError('That file is not a Blox Legends backup.');
  }
  if (env?.format !== BACKUP_FORMAT) throw new BackupError('That file is not a Blox Legends backup.');
  if (env.fv > BACKUP_FV) throw new BackupError('This backup was made by a newer version of the game. Update the game first.');
  return env;
}

export async function decodeBackup(bytes, { passphrase } = {}) {
  const env = await readEnvelope(bytes);
  let body;
  let sections;
  if (env.crypto) {
    if (!passphrase) throw new BackupError('This backup is protected with a passphrase.');
    try {
      const key = await deriveKey(passphrase, fromBase64(env.crypto.salt), env.crypto.iter);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(env.crypto.iv) }, key, fromBase64(env.payload));
      body = new TextDecoder().decode(pt);
    } catch {
      throw new BackupError('Wrong passphrase.');
    }
    sections = JSON.parse(body);
  } else {
    sections = env.sections;
    body = canonical(sections);
  }
  if ((await sha256Hex(body)) !== env.sha256) throw new BackupError('This backup file is damaged (checksum does not match).');
  for (const k of ['learning', 'derived', 'economy', 'records', 'settings', 'prefs', 'meta'])
    if (!sections?.[k]) throw new BackupError(`This backup is incomplete (missing ${k}).`);
  if (!Array.isArray(sections.learning)) throw new BackupError('This backup is damaged (learning log).');
  const { crypto: _c, payload: _p, sections: _s, ...header } = env;
  return { header, sections };
}

// ---- store-level helpers ----
export async function createBackup(store, { passphrase } = {}) {
  const ops = await store.getOps();
  const sections = splitSections(store.snapshotData(), ops, { migrations: store.meta.migrations?.keys || [] });
  const frontier = {};
  for (const o of ops) frontier[o.d] = Math.max(frontier[o.d] || 0, o.n);
  const created = Date.now();
  const header = {
    app: APP_VERSION,
    schema: DATA_SCHEMA,
    created,
    profile: { id: store.profileId, created: store.meta.profile?.created },
    device: store.deviceId,
    mode: 'standalone',
    frontier,
    ledger: { mode: 'standalone', authority: store.deviceId },
    summary: summarize(sections, created),
  };
  const bytes = await encodeBackup(header, sections, { passphrase });
  const d = new Date(created);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { bytes, filename: `blox-legends-backup-${stamp}.bloxbak`, header };
}

// Standalone restore = replace everything (never add), after saving a safety
// copy of the current progress. Economy can't be duplicated this way.
export async function restoreBackup(store, decoded) {
  const safety = await createBackup(store);
  await store.saveSafetySnapshot(safety.bytes);
  await store.replaceAll({
    data: joinSections(decoded.sections),
    ops: decoded.sections.learning,
    migrations: decoded.sections.meta.migrations,
    profile: decoded.header.profile,
    upgraded: needsUpgrade({ learn: decoded.sections.derived.learn }),
  });
}

// Share sheet on iPad (Files, iCloud, AirDrop); download elsewhere.
export async function deliverFile(bytes, filename) {
  const file = new File([bytes], filename, { type: 'application/octet-stream' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Blox Legends backup' });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}
