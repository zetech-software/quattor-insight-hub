/** A failed eligibility lookup must never grant access to privileged operations. */
export async function hasOperationalAccess(
  check: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<boolean> {
  try {
    const { data, error } = await check();
    return !error && data === true;
  } catch {
    return false;
  }
}
