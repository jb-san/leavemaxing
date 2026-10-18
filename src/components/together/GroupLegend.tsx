import { cx, DayIcon } from "~/components/planner/ui";
import { t } from "./copy";

/**
 * The shared calendar's legend. Proposed, someone can't, works for everyone and your days off only
 * show while there's one in the group's months.
 */
export function GroupLegend({
  others,
  agreed,
  proposed,
  vetoed,
  dayOff,
}: {
  others: string[];
  agreed: boolean;
  proposed: boolean;
  vetoed: boolean;
  dayOff: boolean;
}) {
  const items: [string, React.ReactNode, string][] = [
    ["bg-sun text-sun-ink", DayIcon.sun, t.legendHoliday],
    ["bg-wkd", null, t.legendWeekend],
    ["bg-red text-white", DayIcon.x, t.legendYouCant],
  ];
  if (dayOff)
    items.push([
      "bg-[color-mix(in_oklab,var(--sky)_30%,var(--card))] text-ink",
      DayIcon.star,
      t.legendDayOff,
    ]);
  const dots = others.length > 0 ? others : ["var(--sky)", "var(--violet)"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted" aria-label={t.legend}>
      {items.map(([cls, icon, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cx("grid size-[18px] place-items-center rounded-full [&>svg]:size-[11px]", cls)}>
            {icon}
          </span>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="flex h-[18px] items-center gap-0.5">
          {dots.map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two members can share a colour
            <span key={`${c}-${i}`} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
        {t.legendOthersCant}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-[18px] w-7 rounded-full bg-lime-soft" />
        {t.legendBreak}
      </li>
      {proposed && (
        <li className="flex items-center gap-1.5">
          <span className="h-[18px] w-7 rounded-full border-2 border-dashed border-lime-strong" />
          {t.legendProposed}
        </li>
      )}
      {vetoed && (
        <li className="flex items-center gap-1.5">
          <span className="hatch h-[18px] w-7 rounded-full" />
          {t.legendVetoed}
        </li>
      )}
      {agreed && (
        <li className="flex items-center gap-1.5">
          <span className="h-[18px] w-7 rounded-full bg-lime" />
          {t.worksForEveryone}
        </li>
      )}
    </ul>
  );
}
