import { FunctionalComponent } from "preact";

interface QuarterSelectorProps {
  selectedQuarter: string;
  onChange: (e: Event) => void;
}

const QuarterSelector: FunctionalComponent<QuarterSelectorProps> = (
  { selectedQuarter, onChange },
) => {
  const quarters = [
    { value: "any", label: "Any" },
    { value: "q1", label: "Q1 (Jan-Mar)" },
    { value: "q2", label: "Q2 (Apr-Jun)" },
    { value: "q3", label: "Q3 (Jul-Sep)" },
    { value: "q4", label: "Q4 (Oct-Dec)" },
  ];

  return (
    <div>
      <label
        htmlFor="quarter-select"
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Priority Quarter:
      </label>
      <select
        id="quarter-select"
        value={selectedQuarter}
        onChange={onChange}
        class="form-select block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:text-gray-200"
      >
        {quarters.map((q) => (
          <option key={q.value} value={q.value}>
            {q.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default QuarterSelector;
