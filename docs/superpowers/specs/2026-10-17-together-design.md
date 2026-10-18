# Together: plan a trip with other people

Date: 2026-10-17
Status: approved design, awaiting implementation plan

## Goal

Let a group of people, possibly in different countries, find dates they can all take off together, without accounts and without the server being able to read their data.

Each member sets up their own side as they would in the solo planner (country, region, work week, days they can't do, leave they will spend on this trip). The app ranks shared windows by how little leave they cost and how fairly that cost is spread. Members vote on windows, can propose their own dates, and can lock an agreed window into their personal plan.

## Non-goals (v1)

- Chat, comments, live cursors, notifications.
- Editing other members' settings.
- WebRTC or any peer-to-peer transport.
- Recovering a lost personal link (rejoin and have the creator remove the old member instead).
- Linking group settings to the personal plan after joining.

## Architecture

```
browser (React island at /together/)
  ├─ AES-GCM encrypt/decrypt with the group key from the URL fragment
  ├─ scoring runs locally on decrypted records
  └─ WebSocket  ──►  Worker /api/together/:groupId  ──►  Durable Object (one per group)
                                                          stores ciphertext + secret hashes
```

- A separate Worker in `worker/` with its own `wrangler.toml`, deployed by the existing GitHub Action. It is routed at `leavemaxxing.com/api/together/*` (same origin, no CORS).
- One SQLite-backed Durable Object per group. It stores encrypted records and the hashes of write secrets. It never sees plaintext or keys.
- The Astro site stays static. `/together/` is a static page with one React island that reads `location.hash`.

## Links and secrets

All secrets live in the URL fragment, which browsers never send to the server.

| Link | Fragment contents | Grants |
|---|---|---|
| Invite | `groupId.groupKey` | Read the group, join as a new member |
| Personal | `groupId.groupKey.memberId.memberSecret` | Act as that member on any device |
| (Creator, stored locally and folded into the creator's personal link) | `adminSecret` | Edit the group record, remove members |

- `groupId`: 10 random bytes as base64url. `groupKey`: 16 random bytes (AES-128-GCM) as base64url. `memberId`: 6 random bytes. `memberSecret` and `adminSecret`: 16 random bytes.
- On join the client sends `sha256(memberSecret)`. The DO stores it against `memberId` (first write wins). Later writes to that member record must include `memberSecret`. The DO hashes it and compares.
- The creator's `adminSecret` hash is stored when the group is created.
- The browser saves `{groupId → memberId, memberSecret, adminSecret?}` in localStorage, so the joining device never asks who you are. The personal link is for other devices.

## Data model

Plaintext shapes, before encryption. Each record is encrypted on its own, so members are independent.

```ts
interface GroupRecord {
  name: string;               // "Lisbon 2027"
  months: { year: number; month: number }[]; // when it could happen, contiguous or not
  minLength: number;          // days, 3–21
  maxLength: number;
  createdBy: string;          // memberId
}

interface MemberRecord {
  name: string;
  color: string;              // one of a fixed palette
  country: string;
  region: string | null;
  workWeek: boolean[];        // index 0 = Monday
  customOff: DayNum[];
  blocked: DayNum[];          // days they can't do
  allowance: number;          // leave days they will spend on this trip
  proposals: WindowKey[];     // custom windows they put forward
  votes: Record<WindowKey, "yes" | "maybe" | "no">;
}

type WindowKey = `${string}..${string}`; // "2027-04-03..2027-04-11"
```

Stored envelope (what the DO sees):

```ts
interface Envelope {
  kind: "group" | "member";
  id: string;          // "group" or memberId
  version: number;     // monotonically increasing per record
  iv: string;          // base64url, 12 bytes
  data: string;        // base64url AES-GCM ciphertext of the JSON record
}
```

- Only the owner edits a record, so merging is "highest version wins" per `(kind, id)`. No CRDT.
- Votes use date keys, not list positions, so they survive re-ranking.
- On join, the member's form is prefilled from the personal plan in localStorage. After that the two are independent.

## Scoring windows

A pure function in `src/lib/together/score.ts`:

```ts
scoreWindows(group, members, holidaysByMember, today): ScoredWindow[]
```

1. Candidates: every start day inside the group's months (and not before `today`), every length in `minLength..maxLength`.
2. For each member: a day is "off" if it is a weekend in their work week, a public holiday in their region, or in their `customOff`. Their cost is the number of non-off days in the window.
3. Reject a candidate if it touches any member's `blocked` days or costs any member more than their `allowance`.
4. Trim: a window does not start or end on a day that is off for every member. Extend it over that day instead (the days are free anyway, and they count toward the length).
5. Score: `totalDaysOff × memberCount / (sumCost + 1)`, minus a fairness penalty proportional to `maxCost − minCost`. The exact weights are fixed by unit tests.
6. Dedupe: greedily keep the best window and drop any candidate overlapping a kept one by more than half. Return the top 8.

Holidays for each member come from the same static `/data/` files the planner already fetches, one per country and year the group's months touch.

Proposals are scored with the same cost function but never rejected. Members they don't work for (blocked day or over allowance) are flagged on the row.

Windows where every member voted "yes" are shown in a "Works for everyone" section above the ranked list.

Performance: about 300 start days × 10 lengths × 20 members ≈ 60k day checks, recomputed on every change in well under a frame.

## WebSocket protocol

JSON messages. Envelopes are opaque to the server.

Client to server:
- `{ t: "hello", memberId?, secret? }`: sent after connecting.
- `{ t: "put", env: Envelope, secret, secretHash? }`. `secret` is the member secret for member records and the admin secret for the group record. `secretHash` is sent on first write (create or join).
- `{ t: "remove", memberId, secret }`: admin only.

Server to client:
- `{ t: "snapshot", envs: Envelope[], removed: string[] }` on connect.
- `{ t: "update", env }` broadcast to all other sockets.
- `{ t: "removed", memberId }` broadcast.
- `{ t: "error", code: "auth" | "stale" | "limit" | "gone" | "rate" }`.

Server rules:
- A `put` is accepted only if `version` is greater than the stored version for that record (otherwise `stale`).
- A member record write needs a secret whose hash matches the stored hash for that `memberId`. A new `memberId` registers its hash.
- A group record write needs the admin secret. The first group write creates the group and registers the admin hash.
- Removed `memberId`s are kept as tombstones and cannot be re-registered.
- Limits:
  - 20 members per group.
  - 16 KB per envelope.
  - 30 messages per 10 seconds per socket.

## Expiry

The DO sets an alarm. It deletes all storage 60 days after the last day of the group's months, or after 180 days with no writes, whichever comes first. A connection to a deleted group gets `gone`.

## UI

The page at `/together/` is one React island with three states, chosen from the fragment and localStorage.

1. **Create.** Trip name, months (same month picker as Settings), and a trip length range stepper. Then your member form, prefilled. Result: the invite QR.
2. **Join** (invite link, not a member). "Sam invited you to Lisbon 2027" with the members' coloured initials. Name, colour, country and region (prefilled), trip allowance, and blocked days on the existing calendar component.
3. **Group view** (member).
   - Your settings card (same tappable card pattern as "Planning for"), which opens the bottom sheet. The sheet holds a "Use on another device" button for your personal link QR.
   - A group year strip showing how many members are blocked each day, with suggested windows marked.
   - The "Works for everyone" section, then the ranked windows list. Each row shows:
     - dates and total days off
     - helpful holidays
     - each member's initials with their leave cost (red flag if blocked or over allowance)
     - your works/maybe/no control and everyone's votes
   - A "Propose dates" action that opens a date range picker and adds a proposal.
   - On an agreed window: "Add to my plan" adds the window's working days for you to `locked` in your personal plan and opens the planner. If your saved plan is for a different country or leave year, it opens a plan for your group country and the window's leave year instead of altering the existing one.
   - The invite QR sits behind a share button in the header.

QR codes are rendered in the browser with `uqr` (SVG output, themed with CSS tokens). The invite QR is large with "Scan to join {name}", plus copy and native share buttons. The personal QR is styled differently, with the warning "This one is just for you. Anyone with it can change your answers."

The page follows the existing design system: Archivo, lime for leave, sun for holidays, card print edge, and the existing sheet and press motion. Member colours come from a fixed palette checked for contrast in both themes.

## Error handling

| Situation | Behaviour |
|---|---|
| Offline / socket drops | Keep the last decrypted state per group in localStorage. Queue local edits and apply them optimistically. Reconnect with exponential backoff (1s to 30s) and resend queued puts with fresh versions. |
| Fragment malformed or key wrong | "This link is incomplete. Ask for the invite again." |
| `gone` | "This group no longer exists", with a "Start a new group" button. |
| Own memberId removed | "You were removed from this group." No data shown. Local entry is cleared. |
| One envelope fails to decrypt | Skip it and log it to the console. The rest of the group still renders. |
| `stale` | Bump the version past the server's and resend (only happens with two tabs of the same member). |
| `limit` / `rate` | Toast with plain wording: "This group is full (20 people)." / "Slow down a moment." |

## Analytics

Rybbit events `together_create` and `together_join`, with no properties derived from group content.

## Testing

- **Unit (Vitest):**
  - scoring: cost per member with different holidays, blocked and allowance rejection, trimming, fairness ordering, dedupe, proposals flagged rather than rejected
  - crypto round trip
  - fragment parse and format
  - version merge
- **Worker (`@cloudflare/vitest-pool-workers`):**
  - auth on member and group writes
  - stale version rejection
  - tombstones
  - member and size limits
  - rate limit
  - alarm expiry
- **E2E (Playwright, two browser contexts, against `wrangler dev` plus `astro preview`):** A creates a group, B joins via invite, both vote yes on the same window, both see it under "Works for everyone". The page passes axe.

## Files (expected)

- `worker/wrangler.toml`, `worker/src/index.ts` (router), `worker/src/group.ts` (Durable Object), `worker/test/*`
- `src/lib/together/{crypto,link,score,sync,types}.ts` and tests
- `src/components/together/*` (Together island, Create, Join, GroupView, WindowRow, QrCode, MemberSheet)
- `src/pages/together.astro`
- CI: deploy step for the worker in the existing GitHub Action
