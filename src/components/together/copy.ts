import { type DayNum, formatRange, formatShort } from "~/lib/dates";
import type { MemberDayKind } from "~/lib/together/calendar";
import type { MenuOption } from "~/lib/together/dayMenu";
import type { Vote } from "~/lib/together/protocol";
import type { Status } from "~/lib/together/session";

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
  creating: "Creating…",
  createHint: "Next you'll get a link and a QR code to invite people.",
  createFailed: "Couldn't create the group. Try again.",
  createOffline: "Can't reach the server. Check your connection and try again.",

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

  linkBelongsTo: (name: string) => `This link belongs to ${name}.`,
  onThisDevice: (name: string) => `On this device you're ${name}.`,
  losesAdmin: "You'll lose admin rights on this device unless you saved your personal link.",
  stayAs: (name: string) => `Stay as ${name}`,
  switchTo: (name: string) => `Switch to ${name}`,
  someoneElse: "someone else",
  anotherMember: "another member",

  edit: "Edit",
  settings: "Settings",
  saveFailed: "Couldn't save that change. Try again.",
  leaveDays: (n: number) => `${n} leave ${n === 1 ? "day" : "days"}`,
  calendar: "Calendar",
  calendarHint: "Tap a day to mark it, vote on dates or propose some. Everyone in the group sees it.",
  legend: "Legend",
  legendHoliday: "Public holiday",
  legendWeekend: "Weekend",
  legendYouCant: "You can't",
  legendOthersCant: "Others can't",
  legendBreak: "Suggested break",
  legendProposed: "Proposed",
  legendDayOff: "Day off",
  legendVetoed: "Someone can't",
  proposerYou: "you",
  worksForEveryone: "Works for everyone",
  proposed: "Proposed",
  suggested: "Suggested dates",
  noWindows: "No dates work for everyone in these months. Widen the months or the trip length.",
  noWindowsAsk: (who: string) =>
    `No dates work for everyone in these months. Ask ${who} to widen the months or the trip length.`,
  whoeverStarted: "whoever started the group",
  votedOn: "Voted on",
  saving: "Saving…",
  savingOffline: "Offline. Changes will save when you're back.",
  daysOff: (n: number) => `${n} days off`,
  leave: (n: number) => `${n} leave`,
  cantDo: (name: string) => `${name} can't do these dates`,
  savesFor: (who: string) => `, saves leave for ${who}`,
  nameYou: (name: string) => `${name} (you)`,
  yourVote: "Your vote",
  votes: { yes: "Works", maybe: "Maybe", no: "Can't" },
  voteCount: (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`,
  proposeDates: "Propose dates",
  proposeMonths: "Dates to propose",
  proposeFirst: "Tap the first day of the trip, then the last.",
  proposeLast: "Now tap the last day.",
  proposeCost: (length: number, leave: number) =>
    `${length} ${length === 1 ? "day" : "days"}, costs you ${leave} leave`,
  proposeClamped: (max: number, end: DayNum) =>
    `Trips are ${max} days at most, so it ends on ${formatShort(end)}.`,
  proposeTooShort: "Pick at least 3 days.",
  proposedBy: "Proposed by",
  withdraw: "Withdraw",
  addToPlan: "Add to my plan",
  theTrip: "The trip",
  remove: "Remove",
  menu: {
    cant: ["Can't do this day", "Everyone sees you're busy"],
    dayOff: ["Day off anyway", "A company day off, it costs no leave"],
    notFree: ["Not free", "You're busy even though it's a day off"],
    propose: ["Propose dates from here", "Pick an end day next"],
    canAgain: ["Can do this day again", "Back to a normal workday"],
    freeAgain: ["Free again", "Back to a day off"],
    removeDayOff: ["Remove day off", "Back to a normal workday"],
  } satisfies Record<MenuOption, [string, string]>,
  windowKinds: {
    agreed: "Works for everyone",
    suggested: "Suggested",
    proposed: "Proposed",
    voted: "Voted on",
  },
  everyonesVotes: "Everyone's votes",
  voteOn: (dates: string) => `Your vote on ${dates}`,
  voteWords: { yes: "Works", maybe: "Maybe", no: "Can't", none: "No vote yet" },
  removeAsk: (name: string) => `Remove ${name}?`,
  removeHint: "They can rejoin with the invite link unless you start a new group.",
  sharedDays: (n: number) =>
    `${n} ${n === 1 ? "day" : "days"} you marked in your own plan will be shared with the group.`,
  dontShare: "Don't share them",
  confirm: "Confirm",
  cancel: "Cancel",
} as const;

/** The group cards in My plans, which show only what the membership keeps, without decrypting. */
export const plansCopy = {
  groupPlan: "Group plan",
  people: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
  agreed: (n: number) => `${n} ${n === 1 ? "date works" : "dates work"} for everyone`,
  openToSee: "Open it to see who is in.",
  youCreated: "You created it",
  open: "Open",
  openAria: (name: string) => `Open ${name}`,
  removeAria: (name: string) => `Remove ${name} from this browser`,
  stillWorks: "Your personal link still works.",
  removeConfirm: "Remove? You stay in the group.",
  copyPersonal: "Copy personal link",
  copied: "Copied",
  cancel: "Cancel",
} as const;

/** The empty list's note: the admin can widen the months, everyone else is told who can. */
export function noWindowsNote(isAdmin: boolean, creator: string | null): string {
  return isAdmin ? t.noWindows : t.noWindowsAsk(creator ?? t.whoeverStarted);
}

/** The save status line: nothing once everything has reached the server. */
export function saveNote(status: Status, saving: boolean): string | null {
  if (!saving) return null;
  return status === "online" ? t.saving : t.savingOffline;
}

/** "Sam", "Sam and Alex", "Sam, Alex and Kim". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const DAY_KIND: Record<Exclude<MemberDayKind, "holiday">, string> = {
  blocked: "you can't",
  custom: "your day off",
  weekend: "weekend",
  work: "workday",
};

/** A member's vote, named for a sentence. `you` is the reader. */
export interface NamedVote {
  name: string;
  you: boolean;
  vote: Vote | null;
}

const VOTE_VERB: Record<Vote | "none", [string, string]> = {
  yes: ["works", "work"],
  maybe: ["says maybe", "say maybe"],
  no: ["can't", "can't"],
  none: ["hasn't voted", "haven't voted"],
};

/** "In 12–15 Nov: Sam works, Alex can't, Jo hasn't voted." Your own vote reads "you work". */
export function votesPhrase(start: DayNum, end: DayNum, votes: readonly NamedVote[]): string {
  const each = votes.map((v) => {
    const [they, you] = VOTE_VERB[v.vote ?? "none"];
    return v.you ? `you ${you}` : `${v.name} ${they}`;
  });
  return `In ${formatRange(start, end)}: ${each.join(", ")}.`;
}

/**
 * A shared calendar day for screen readers: the date, what it is for you, who else can't do it,
 * who proposed dates that cover it, and the votes on each window that holds it.
 * "Sat 9 Jan, weekend. Sam and Alex can't. Proposed by Kim. In 8–12 Jan: Sam works, Kim can't."
 */
export function dayLabel(
  day: DayNum,
  kind: MemberDayKind,
  holidays: readonly string[],
  othersCant: readonly string[],
  proposedBy: readonly string[] = [],
  windows: readonly { start: DayNum; end: DayNum; votes: readonly NamedVote[] }[] = [],
): string {
  const what = kind === "holiday" ? `public holiday ${holidays.join(", ")}` : DAY_KIND[kind];
  const who = othersCant.length > 0 ? ` ${joinNames(othersCant)} can't.` : "";
  const proposed = proposedBy.length > 0 ? ` Proposed by ${joinNames(proposedBy)}.` : "";
  const votes = windows.map((w) => ` ${votesPhrase(w.start, w.end, w.votes)}`).join("");
  return `${formatShort(day)}, ${what}.${who}${proposed}${votes}`;
}

const MENU_KIND: Record<MemberDayKind, string | null> = {
  blocked: "You can't do this day.",
  custom: "Your day off. It costs no leave.",
  weekend: "Weekend.",
  holiday: null,
  work: null,
};

/** The note at the top of a day's menu: what the day is for you, and who else can't do it. */
export function menuNote(
  kind: MemberDayKind,
  holidays: readonly string[],
  othersCant: readonly string[],
): string | null {
  const what =
    kind === "holiday"
      ? holidays.length > 0
        ? `Public holiday: ${holidays.join(", ")}.`
        : "Public holiday."
      : MENU_KIND[kind];
  const who = othersCant.length > 0 ? `${joinNames(othersCant)} can't.` : null;
  const note = [what, who].filter(Boolean).join(" ");
  return note || null;
}

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
