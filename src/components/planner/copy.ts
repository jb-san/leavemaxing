export function quip(multiplier: number, leaveUsed: number, daysOff: number): string {
  if (leaveUsed === 0) return "No leave planned yet. Add some days and watch them multiply.";
  if (multiplier >= 3.2) return "Elite leavemaxxing. Frame this calendar.";
  if (multiplier >= 2.6)
    return `Every leave day is pulling ${multiplier >= 3 ? "triple" : "double"} duty or more. Legend.`;
  if (multiplier >= 2)
    return `${daysOff} days away from your desk. Weekends and holidays are doing the heavy lifting.`;
  if (multiplier >= 1.6) return "Solid plan. Try “Long weekends” if you want a higher score.";
  return "Not many holidays to lean on here. Try another style or shorter breaks.";
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
