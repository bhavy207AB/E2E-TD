import { test } from '@e2e-dev/web';

// A non-quarantined failure with a distinctive, stable error message, so a
// Test Control "known error" rule can match it. When such a rule exists,
// `testdino-e2e run` should treat this failure as known and exit 0 (item 7).
test('known-error candidate (matches a known-error rule)', { tags: ['known-error'], retries: 0 }, async () => {
  throw new Error('TDQA_KNOWN_ERROR: upstream service unavailable (503)');
});
