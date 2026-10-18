import type { MemberRecord } from "./protocol";
import { groupRange } from "./score";

/**
 * Only the blocked and custom days inside the group's months, so personal days from the solo planner
 * (other trips, past days) aren't shared with the group.
 */
export function limitToMonths(member: MemberRecord, months: { year: number; month: number }[]): MemberRecord {
  const { start, end } = groupRange({ months });
  const inside = (d: number) => d >= start && d <= end;
  return { ...member, blocked: member.blocked.filter(inside), customOff: member.customOff.filter(inside) };
}

/** What a joining member shares: a trimmed name, and only days inside the group's months. */
export function forJoining(member: MemberRecord, months: { year: number; month: number }[]): MemberRecord {
  return limitToMonths({ ...member, name: member.name.trim() }, months);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const WHITE = "#ffffff";
const DARK = "#000000";

/** white or black, whichever reads better on a member's colour. */
export function textOn(background: string): string {
  const bg = luminance(background);
  const ratio = (fg: string) => {
    const l = luminance(fg);
    return (Math.max(bg, l) + 0.05) / (Math.min(bg, l) + 0.05);
  };
  return ratio(WHITE) >= ratio(DARK) ? WHITE : DARK;
}
