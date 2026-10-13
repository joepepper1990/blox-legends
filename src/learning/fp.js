// Item fingerprints (plan §6.2). An item's identity is its skill plus a
// canonical, format-free item key, so the same item asked a different way, or
// with different wrong options, or shuffled, keeps its fingerprint. That is
// what "unseen" (plan §6.3) and the protected boss partition (§6.4) are
// measured on.
//
// FPV is part of every logged attempt. Changing how item keys are built would
// reshuffle the partition (items he has practised could become boss items),
// so it must come with a new FPV and golden vectors (tests/fp.test.js).
export const FPV = 2;

export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// MurmurHash3 finaliser: spreads the bits so "fp mod N" is evenly mixed.
export function fmix32(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export const fpOf = (skill, itemKey) => fmix32(fnv1a32(`${skill}|${itemKey}`)).toString(16).padStart(8, '0');

// The assessment partition: 15% of every procedural skill's items, chosen by
// fingerprint, are only ever used by bosses (plan §6.3–6.4).
export const PARTITION_SHARE = 1500; // per 10,000
export const partitionBucket = (fp) => parseInt(fp, 16) % 10000;
export const inPartition = (fp) => partitionBucket(fp) < PARTITION_SHARE;

// The authored reserve: 20% of each bank, chosen by item id, so adding items
// never moves an item he has practised into the reserve.
export const inReserve = (skill, itemId) => fmix32(fnv1a32(`reserve|${skill}|${itemId}`)) % 100 < 20;
