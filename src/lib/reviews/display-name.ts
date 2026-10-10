// ROOT PATH: src/lib/reviews/display-name.ts
// GOLIVE-15 — how a reviewer's name is shown publicly: first name + last
// initial ("Ayush V."). Never the email, never a user id. Deleted accounts
// (account deletion anonymises the name) show as a generic guest.

export function reviewerDisplayName(
  fullName: string | null | undefined,
  deleted: boolean
): string {
  const name = (fullName ?? '').trim();
  if (deleted || name.length === 0 || name.toLowerCase() === 'deleted user') {
    return 'SafarBuddy guest';
  }

  const parts = name.split(/\s+/);
  const first = parts[0];
  if (parts.length === 1) return first;

  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}
