import { describe, expect, it } from 'vitest';
import { hasOperationalAccess } from '../../../supabase/functions/_shared/account-access';

describe('server account eligibility', () => {
  it('allows only an explicit positive result', async () => {
    await expect(hasOperationalAccess(() => Promise.resolve({ data: true, error: null }))).resolves.toBe(true);
  });
  it.each([false, null, undefined, 'true', 1])('denies %j', async data => {
    await expect(hasOperationalAccess(() => Promise.resolve({ data, error: null }))).resolves.toBe(false);
  });
  it('denies a failed lookup even if data is present', async () => {
    await expect(hasOperationalAccess(() => Promise.resolve({ data: true, error: new Error('offline') }))).resolves.toBe(false);
  });
  it('denies rejected requests', async () => {
    await expect(hasOperationalAccess(() => Promise.reject(new Error('offline')))).resolves.toBe(false);
  });
});
