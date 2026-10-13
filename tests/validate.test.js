// The content validator's hard checks (the capacity rule runs in CI's full
// validation step: node tools/validate-content.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../tools/validate-content.mjs';

test('content passes every hard check (quick run)', () => {
  const res = validate({ quick: true });
  assert.deepEqual(res.fail, []);
  assert.ok(res.notes.checked > 1000);
});
