export function quip(multiplier: number, leaveUsed: number): string {
  if (leaveUsed === 0) return "Add leave days in the settings to see where your breaks land.";
  const ratio = `That's ${multiplier.toFixed(1)} days off for every day of leave.`;
  if (multiplier >= 2) return `${ratio} Weekends and public holidays make up the rest.`;
  if (multiplier >= 1.6) return `${ratio} Long weekends usually stretch it further.`;
  return `${ratio} Few holidays fall on workdays here, so breaks cost more leave.`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function countdown(days: number): string {
  if (days <= 0) return "now";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30.4)} months`;
}
