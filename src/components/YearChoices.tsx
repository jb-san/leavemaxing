import { useOfferedYears } from "./useOfferedYears";

/** "Plan another year" links. Only the rolling window, skipping the page's own year. */
export function YearLinks({
  years,
  buildYear,
  skip,
  prefix,
}: {
  years: number[];
  buildYear: number;
  skip?: number;
  /** Path before the year, with a trailing slash, such as `/se/`. */
  prefix: string;
}) {
  const offered = useOfferedYears(years, buildYear).filter((year) => year !== skip);
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {offered.map((year) => (
        <li key={year}>
          <a className="chip" href={`${prefix}${year}/`}>
            {year}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A single year link, removed when that year is no longer in the rolling window. */
export function OfferedYearLink({
  year,
  buildYear,
  years,
  href,
  label,
  className,
}: {
  year: number;
  buildYear: number;
  years: number[];
  href: string;
  label: string;
  className?: string;
}) {
  const offered = useOfferedYears(years, buildYear);
  if (!offered.includes(year)) return null;
  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}
