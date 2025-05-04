import { FunctionalComponent } from "preact";

interface YearSelectorProps {
  selectedYear: number;
  onChange: (e: Event) => void;
}

const YearSelector: FunctionalComponent<YearSelectorProps> = (
  { selectedYear, onChange },
) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i); // Current year + next 5

  return (
    <div>
      <label htmlFor="year-select">Year:</label>
      <select id="year-select" value={selectedYear} onChange={onChange}>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
};

export default YearSelector;
