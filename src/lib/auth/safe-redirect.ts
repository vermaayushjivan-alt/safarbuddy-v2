// ROOT PATH: src/lib/auth/safe-redirect.ts
// SECURITY — open-redirect protection for post-login redirects.
//
// `redirectTo` / `next` come from the URL (anyone can craft a link), so they
// must never be trusted as-is. Only a same-site, absolute PATH is accepted
// ("/hotels/x/book?room=1"). Everything else — full URLs, protocol-relative
// ("//evil.com"), backslash tricks ("/\evil.com"), "@"/dot-suffix tricks that
// only work when a value is glued onto an origin ("@evil.com", ".evil.com"),
// control characters — is rejected and the caller's fallback is used instead.
//
// Plain module (NOT "use server") so it is not exposed as a remote action.

const MAX_LENGTH = 2000;

export function safeRedirectPath(
  value: unknown,
  fallback: string | null = null
): string | null {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();

  if (candidate.length === 0 || candidate.length > MAX_LENGTH) return fallback;

  // Must be an absolute path on this site.
  if (!candidate.startsWith("/")) return fallback;

  // "//host" is protocol-relative; "/\host" is treated like "//host" by browsers.
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;

  // No backslashes anywhere, no control characters (CR/LF/TAB/NUL etc).
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;

  // Belt and braces: resolving it against a dummy origin must stay on that origin.
  try {
    const base = "http://safarbuddy.invalid";
    const resolved = new URL(candidate, base);
    if (resolved.origin !== base) return fallback;
  } catch {
    return fallback;
  }

  return candidate;
}
