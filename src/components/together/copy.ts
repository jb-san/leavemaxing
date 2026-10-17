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
  joinSoon: "Joining a group is coming soon.",
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
