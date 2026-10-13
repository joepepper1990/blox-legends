// Upgrading stored game data to the current shape (DATA_SCHEMA 3). Called on
// every way data comes in: opening the store, adopting the fallback copy,
// the fallback store itself, old-game imports, backup restores and the
// grown-ups' reload. Total and idempotent: it never throws and running it
// twice changes nothing.
import { upgradeLearn, isV2Learn } from '../learning/migrate-learn.js';

export const needsUpgrade = (data) => !!data && !isV2Learn(data.learn);

export function upgradeData(data, now = Date.now()) {
  if (!data || typeof data !== 'object') return data;
  if (!needsUpgrade(data)) return data;
  return { ...data, learn: upgradeLearn(data.learn, now) };
}

// Merge two v2 learn states (old-game import into a profile with progress):
// each skill keeps the record with more answers.
export function mergeLearn(mine, theirs) {
  const out = { ...mine, sk: { ...mine.sk }, it: { ...mine.it }, mis: { ...mine.mis } };
  for (const [id, sk] of Object.entries(theirs.sk || {})) {
    if (!out.sk[id] || (sk.n || 0) > (out.sk[id].n || 0)) {
      out.sk[id] = sk;
      if (theirs.it?.[id]) out.it[id] = theirs.it[id];
      if (theirs.mis?.[id]) out.mis[id] = theirs.mis[id];
    }
  }
  if (theirs.mig) out.mig = { ...(mine.mig || {}), imports: [...(mine.mig?.imports || []), theirs.mig] };
  return out;
}
