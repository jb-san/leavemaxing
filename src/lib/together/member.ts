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
