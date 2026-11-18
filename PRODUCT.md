# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Working software engineers in Indonesia who want to level up. They come back for events, peers and, later, mentors and discussion, more than for hand-holding. Juniors and students are part of the community but are not the audience the member portal is built around.

Admins (community organisers) manage events, members and recommendation reviews from `/admin`.

## Product Purpose

SWE Growth (swegrowth.id) is a community platform for Indonesian software engineers. The public site presents the community, its agenda, recordings and a directory of recommendations. The portal is the member space: what a logged-in member is registered for, what is coming up, their profile, and their links into the community.

## Operating Context

- Chat lives outside the product today, in WhatsApp groups (general and per field) and Telegram; a Discord link is not yet available.
- Events are registered for on the site; sessions themselves run elsewhere.
- Members sign in with Google, complete onboarding (profile plus a short motivation answer), then reach the portal.

## Capabilities and Constraints

Exists today:

- Agenda and event detail, registration with confirmed and waitlist states, live Q&A per event.
- Recordings, public member profiles, and a recommendations directory that members submit to and admins review.
- Portal pages: home, profile, profile edit, membership (placeholder).

Planned for the portal:

- **Mentors.** Members book a session with a mentor. At launch SWE Growth acts as the middleman: the member requests, the team arranges it. Direct booking comes later.
- **Recommended events.** What "recommended" is based on is undecided.
- **Discussions.** Coming soon. Shown as such until it exists; where and how it works is undecided.
- **Membership (verified member).** Not live (`MEMBERSHIP_LIVE = false`). Kept out of navigation until launch.

Terminology: "Portal" is the member space. "Rekomendasi" is the public directory of recommended resources; "Rekomendasiku" is a member's own submissions.

Stack: React 19 and React Router in framework mode on Vite, Supabase (Postgres, Auth, RLS), plain CSS, deployed on Netlify. Interface copy is in Bahasa Indonesia.

Undecided: positioning against neighbouring communities; the basis for recommended events; the shape of discussions.

## Brand Commitments

- Name: SWE Growth.
- The member portal keeps the public site's existing identity (teal, cream, yellow, one typeface). Its structure may change; its identity does not.
- Voice: informal, warm Bahasa Indonesia, addressing the member as "kamu".

## Evidence on Hand

Real events, recordings, member profiles and recommendations come from Supabase. There is no sample data and there are no invented numbers anywhere in the product; a section with no data is not shown. There is no mentor or discussion data yet, and none may be fabricated.

## Product Principles

1. No invented content. Empty is honest; filler is not.
2. The member space shows what a visitor cannot see: my sessions, my people, my next step.
3. Say plainly when something failed, is not ready, or is coming soon.
4. Private details stay private, and the interface says so where the member would worry.
