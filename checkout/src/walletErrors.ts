/** Only an explicit wallet user-rejection code proves the user declined signing. */
export function isUserRejection(error: unknown): boolean {
  let current = error;
  for (let n = 0; n < 10 && current && typeof current === 'object'; n++) {
    const value = current as { code?: unknown; name?: unknown; cause?: unknown };
    if (value.code === 4001 || value.name === 'UserRejectedRequestError') return true;
    current = value.cause;
  }
  return false;
}
