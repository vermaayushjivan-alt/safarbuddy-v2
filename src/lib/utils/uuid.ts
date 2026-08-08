// Shared UUID-format guard for dynamic route params (Development Bible
// Rule 9 — one consistent check, not scattered per-page regexes).
//
// Purpose: reject a malformed/non-UUID route param (a stale link, a
// bookmarked/hand-typed URL, a literal unresolved segment such as
// "[id]"/"%5Bid%5D", or any other non-UUID string) at the page/action
// boundary, before it ever reaches a repository call — instead of
// letting Postgres reject it deep in a query and surfacing as an
// unhandled 500 ("An error occurred in the Server Components render").
//
// This does not weaken or replace real UUID validation done anywhere
// else (e.g. by the database column type itself) — it only adds an
// earlier, cheaper rejection point with a clean not-found outcome.

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
