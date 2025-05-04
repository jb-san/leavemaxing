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
      <label
        htmlFor="year-select"
        class="block text-sm font-medium text-gray-700 mb-1"
      >
        Year:
      </label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={onChange}
        class="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      >
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
