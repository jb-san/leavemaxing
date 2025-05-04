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
      <label htmlFor="leave-days">Available Leave Days:</label>
      <input
        type="number"
        id="leave-days"
        name="leave-days"
        min="0"
        step="1"
        placeholder="e.g., 10"
        value={value}
        onInput={onChange}
      />
    </div>
  );
};

export default LeaveDaysInput;
