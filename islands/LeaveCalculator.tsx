import { useSignal } from "@preact/signals";
import { useCallback, useEffect } from "preact/hooks";
import CalendarMonth from "../components/CalendarMonth.tsx";
import CountrySelector from "../components/CountrySelector.tsx";
import LeaveDaysInput from "../components/LeaveDaysInput.tsx";
import QuarterSelector from "../components/QuarterSelector.tsx";
import YearSelector from "../components/YearSelector.tsx";
import { getPublicHolidays, Holiday } from "../utils/holidays.ts";
import { calculateOptimalLeave } from "../utils/leave_maximizer.ts";
// import { calculateOptimalLeave } from "../utils/leave_maximizer.ts"; // Will be needed later

export default function LeaveCalculator() {
  const currentYear = new Date().getFullYear();
  const selectedYear = useSignal(currentYear);
  const selectedCountry = useSignal("US"); // Default to US
  const availableLeaveDays = useSignal(10); // Default to 10
  const priorityQuarter = useSignal("any"); // Default to any

  const holidays = useSignal<Holiday[] | null>(null);
  const suggestedLeave = useSignal<string[]>([]); // Format: YYYY-MM-DD
  const isLoadingHolidays = useSignal(false); // Renamed for clarity
  const isCalculating = useSignal(false); // New signal for calculation state
  const error = useSignal<string | null>(null);

  // Effect to fetch holidays when year or country changes
  useEffect(() => {
    let active = true; // Prevent state updates if component unmounts
    async function fetchHolidays() {
      isLoadingHolidays.value = true;
      // Reset dependent state when fetching new holidays
      error.value = null;
      suggestedLeave.value = [];
      holidays.value = null; // Clear previous holidays
      isCalculating.value = false; // Ensure calculation state is reset

      try {
        const fetchedHolidays = await getPublicHolidays(
          selectedYear.value,
          selectedCountry.value,
        );
        if (active) {
          holidays.value = fetchedHolidays;
        }
      } catch (err) {
        console.error("Error in fetchHolidays effect:", err);
        if (active) {
          error.value = "Failed to fetch holiday data.";
          holidays.value = null;
        }
      } finally {
        if (active) {
          isLoadingHolidays.value = false;
        }
      }
    }

    fetchHolidays();
    return () => {
      active = false;
    }; // Cleanup function
  }, [selectedYear.value, selectedCountry.value]);

  // --- ADD Calculation Handler ---
  const handleCalculateClick = useCallback(async () => {
    if (!holidays.value || isLoadingHolidays.value) {
      console.log("Cannot calculate: Holidays not loaded or still loading.");
      return; // Don't calculate if holidays aren't ready
    }
    if (availableLeaveDays.value <= 0) {
      suggestedLeave.value = []; // Clear if no leave days
      console.log("Cannot calculate: No available leave days.");
      return;
    }

    isCalculating.value = true;
    error.value = null; // Clear previous errors
    suggestedLeave.value = []; // Clear previous suggestions

    console.log("Calculation started...");

    // Use setTimeout to allow UI to update (show loading state) before heavy calc
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const suggestions = calculateOptimalLeave(
        holidays.value,
        availableLeaveDays.value,
        selectedYear.value,
        priorityQuarter.value,
      );
      suggestedLeave.value = suggestions;
      console.log("Calculation finished. Suggestions:", suggestions);
    } catch (err) {
      console.error("Error during leave calculation:", err);
      error.value = "Failed to calculate leave suggestions.";
    } finally {
      isCalculating.value = false;
    }
  }, [
    holidays.value,
    availableLeaveDays.value,
    selectedYear.value,
    priorityQuarter.value,
    isLoadingHolidays.value,
  ]); // Dependencies for useCallback

  const handleYearChange = (e: Event) => {
    selectedYear.value = parseInt((e.target as HTMLSelectElement).value, 10);
  };

  const handleCountryChange = (e: Event) => {
    selectedCountry.value = (e.target as HTMLSelectElement).value;
  };

  const handleLeaveDaysChange = (e: Event) => {
    availableLeaveDays.value =
      parseInt((e.target as HTMLInputElement).value, 10) || 0;
  };

  const handleQuarterChange = (e: Event) => {
    priorityQuarter.value = (e.target as HTMLSelectElement).value;
  };

  return (
    <div class="p-4 mx-auto max-w-4xl">
      <h1 class="text-2xl font-bold mb-4">LeaveMaxing</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <YearSelector
          selectedYear={selectedYear.value}
          onChange={handleYearChange}
        />
        <CountrySelector
          selectedCountry={selectedCountry.value}
          onChange={handleCountryChange}
        />
        <LeaveDaysInput
          value={availableLeaveDays.value}
          onChange={handleLeaveDaysChange}
        />
        <QuarterSelector
          selectedQuarter={priorityQuarter.value}
          onChange={handleQuarterChange}
        />
      </div>

      {/* Button and Status Section */}
      <div class="mb-6 flex items-center gap-4">
        <button
          onClick={handleCalculateClick}
          disabled={isLoadingHolidays.value || isCalculating.value ||
            !holidays.value}
          class="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCalculating.value ? "Calculating..." : "Calculate Optimal Leave"}
        </button>
        {isLoadingHolidays.value && (
          <p class="text-gray-600">Loading holidays...</p>
        )}
        {error.value && <p class="text-red-500">Error: {error.value}</p>}
      </div>

      {/* Calendar Display Area */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.value && !isLoadingHolidays.value && (
          Array.from({ length: 12 }).map((_, i) => (
            <CalendarMonth
              key={`${selectedYear.value}-${i}`}
              year={selectedYear.value}
              month={i}
              holidays={holidays.value || []}
              suggestedLeaveDays={suggestedLeave.value}
            />
          ))
        )}
      </div>
    </div>
  );
}
