import { FunctionalComponent } from "preact";

interface LeaveDaysInputProps {
  value: number;
  onChange: (e: Event) => void;
}

const LeaveDaysInput: FunctionalComponent<LeaveDaysInputProps> = (
  { value, onChange },
) => {
  return (
    <div>
      <label
        htmlFor="leave-days"
        class="block text-sm font-medium text-gray-700 mb-1"
      >
        Available Leave Days:
      </label>
      <input
        type="number"
        id="leave-days"
        name="leave-days"
        min="0"
        step="1"
        placeholder="e.g., 10"
        value={value}
        onInput={onChange}
        class="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      />
    </div>
  );
};

export default LeaveDaysInput;
