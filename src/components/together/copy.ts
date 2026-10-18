/** Together's own UI strings. Together v1 is English only, so these stay out of the i18n catalog. */
export const t = {
  title: "Plan time off with friends",
  lead: "Start a group for the trip and invite your friends. Then everyone marks the days they can't do on a shared calendar, and the dates that cost the group the least leave come first.",
  privacy: "Plans are encrypted in your browser. The server only keeps what it can't read.",
  noScript: "Together runs in your browser and needs JavaScript.",

  trip: "The trip",
  tripName: "Trip name",
  tripNamePlaceholder: "Summer in Lisbon",
  when: "When",
  pickMonths: "Trip months",
  prevYear: "Previous year",
  nextYear: "Next year",
  pickFirst: "Tap the first month, then the last.",
  pickLast: "Now tap the last month. Up to 12 months in all.",
  shortest: "Shortest trip",
  longest: "Longest trip",
  shortestAria: "days in the shortest trip",
  longestAria: "days in the longest trip",
  nDays: (n: number) => `${n} days`,

  you: "You",
  yourName: "Your name",
  colour: "Your colour",
  where: "Where you work",
  region: "Region",
  wholeCountry: "Whole country (national holidays)",
  allowance: "Leave days for this trip",
  allowanceAria: "leave days for this trip",

  create: "Create group",
  creating: "Creating",
  createHint: "Next you'll get a link and a QR code to invite people.",
  createFailed: "Couldn't create the group. Try again.",

  inviteTitle: "Invite your group",
  scanToJoin: (name: string) => `Scan to join ${name}`,
  personalTitle: "Use on another device",
  personalCaption: "Scan on your other device",
  personalWarning: "This one is just for you. Anyone with it can change your answers.",
  link: "Link",
  copyLink: "Copy link",
  copied: "Copied",
  share: "Share",
  invite: "Invite",

  loading: "Opening the group",
  members: "Members",
  invitedYou: (who: string, group: string) => `${who} invited you to ${group}`,
  someone: "A friend",
  alreadyIn: "Already in",
  joinGroup: "Join group",
  joining: "Joining",
  joinFailed: "Couldn't join the group. Try again.",
  joinHint: "Next you'll see the group. Mark the days you can't do there.",
  slowDown: "Slow down a moment.",
  tripSentence: (range: string, min: number, max: number) =>
    `Planning for ${range}, trips of ${min === max ? `${min} days` : `${min} to ${max} days`}.`,
  errors: {
    incomplete: "This link is incomplete. Ask for the invite again.",
    gone: "This group no longer exists",
    removed: "You were removed from this group.",
    full: "This group is full (20 people).",
  },
  startNew: "Start a new group",
  groupSoon: "The group view is coming soon.",
  youreIn: "You're in. Share the invite so others can add their days.",
} as const;

/** Names for MEMBER_COLORS, in the same order, for screen readers. */
export const COLOR_NAMES: readonly string[] = [
  "Red",
  "Orange",
  "Amber",
  "Green",
  "Teal",
  "Blue",
  "Purple",
  "Pink",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "June 2027", "June to November 2027" or "November 2027 to February 2028". */
export function monthsPhrase(months: { year: number; month: number }[]): string {
  const sorted = [...months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return "";
  const name = (m: { month: number }) => MONTH_NAMES[m.month - 1] ?? "";
  if (first.year === last.year && first.month === last.month) return `${name(first)} ${first.year}`;
  if (first.year === last.year) return `${name(first)} to ${name(last)} ${first.year}`;
  return `${name(first)} ${first.year} to ${name(last)} ${last.year}`;
}
