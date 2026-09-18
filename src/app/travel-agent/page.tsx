// Audit fix: this segment had a layout.tsx (role gate — admin,
// super_admin, travel_agent) but no page.tsx at all, so visiting
// /travel-agent directly 404'd even though redirectToDashboard() (see
// src/lib/auth/redirect.ts) and the travel-agent layout's own
// UNAUTHENTICATED branch both send a travel_agent user here straight
// after login.
//
// Unlike /vendor or /dashboard, there is no existing travel-agent
// feature anywhere in the app (no actions, repository methods, or
// components reference travel_agent beyond the role check itself), so
// there is nowhere real to redirect a travel_agent user to yet. Rather
// than guess at a dashboard shape that isn't part of any confirmed
// milestone, this is a plain placeholder that at least renders instead
// of 404ing. Replace with a real dashboard once a travel-agent feature
// is scoped.
export default function TravelAgentIndexPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
      <h1 className="font-display text-2xl text-deep">Travel agent dashboard</h1>
      <p className="mt-3 max-w-md text-[14px] text-ink/60">
        You&apos;re signed in as a travel agent. Dedicated tools for this
        role haven&apos;t been built yet — check back soon, or contact the
        SafarBuddy team if you were expecting something specific here.
      </p>
    </div>
  );
}
