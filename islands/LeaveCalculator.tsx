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

// List of supported country codes (extracted from CountrySelector)
const supportedCountryCodes = new Set([
  "AL",
  "AD",
  "AR",
  "AM",
  "AU",
  "AT",
  "AX",
  "BS",
  "BB",
  "BY",
  "BE",
  "BZ",
  "BJ",
  "BO",
  "BA",
  "BW",
  "BR",
  "BG",
  "CA",
  "CL",
  "CN",
  "CO",
  "CR",
  "HR",
  "CU",
  "CY",
  "CZ",
  "DK",
  "DO",
  "EC",
  "EG",
  "SV",
  "EE",
  "FO",
  "FI",
  "FR",
  "GA",
  "GM",
  "GE",
  "DE",
  "GI",
  "GR",
  "GL",
  "GD",
  "GT",
  "GG",
  "GY",
  "HT",
  "HN",
  "HK",
  "HU",
  "IS",
  "ID",
  "IE",
  "IM",
  "IT",
  "JM",
  "JP",
  "JE",
  "KZ",
  "LV",
  "LS",
  "LI",
  "LT",
  "LU",
  "MG",
  "MT",
  "MX",
  "MD",
  "MC",
  "MN",
  "ME",
  "MS",
  "MA",
  "MZ",
  "NA",
  "NL",
  "NZ",
  "NI",
  "NE",
  "NG",
  "MK",
  "NO",
  "PA",
  "PG",
  "PY",
  "PE",
  "PH",
  "PL",
  "PT",
  "PR",
  "RO",
  "RU",
  "SM",
  "RS",
  "SG",
  "SK",
  "SI",
  "ZA",
  "KR",
  "ES",
  "SR",
  "SJ",
  "SE",
  "CH",
  "TR",
  "TN",
  "UA",
  "GB",
  "US",
  "UY",
  "VA",
  "VE",
  "VN",
  "ZW",
]);

// Helper: Check localStorage safely (for SSR compatibility)
function getInitialDarkMode() {
  if (typeof window !== "undefined" && window.localStorage) {
    const storedPref = window.localStorage.getItem("darkMode");
    if (storedPref) {
      return storedPref === "true";
    }
    // Check system preference if no stored preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false; // Default to light mode on server or if localStorage unavailable
}

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
  const darkMode = useSignal<boolean>(getInitialDarkMode());

  // Effect to apply dark class and save preference
  // effect(() => {
  //   const isDark = darkMode.value;
  //   if (typeof window !== "undefined" && window.localStorage) {
  //     localStorage.setItem("darkMode", String(isDark));
  //     if (isDark) {
  //       document.documentElement.classList.add("dark");
  //     } else {
  //       document.documentElement.classList.remove("dark");
  //     }
  //     // Remove console.log
  //     // console.log(`Dark mode toggled: ${isDark}`);
  //   }
  // });

  // Effect to detect country from browser language on initial load
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      try {
        const lang = navigator.language;
        // Remove console.log
        // console.log("Detected browser language:", lang);
        const region = lang.split("-")[1]?.toUpperCase(); // Get region code (e.g., US from en-US)
        if (region && supportedCountryCodes.has(region)) {
          // Remove console.log
          // console.log(`Setting initial country based on language: ${region}`);
          // Check if the signal already exists - important if using SSR props later
          if (selectedCountry.peek() !== region) {
            selectedCountry.value = region; // Set the detected country
          }
        } else {
          // Remove console.log
          // console.log(`Region code '${region}' not in supported list or not found.`);
        }
      } catch (e) {
        console.error("Error detecting country from language:", e); // Keep console.error
      }
    }
    // Run this effect only once on mount
  }, []);

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
        console.error("Error in fetchHolidays effect:", err); // Keep console.error
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
      // Remove console.log
      // console.log("Cannot calculate: Holidays not loaded or still loading.");
      return; // Don't calculate if holidays aren't ready
    }
    if (availableLeaveDays.value <= 0) {
      suggestedLeave.value = []; // Clear if no leave days
      // Remove console.log
      // console.log("Cannot calculate: No available leave days.");
      return;
    }

    isCalculating.value = true;
    error.value = null; // Clear previous errors
    suggestedLeave.value = []; // Clear previous suggestions

    // Remove console.log
    // console.log("Calculation started...");

    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentDateString = today.toISOString().split("T")[0];

    // Use setTimeout to allow UI to update (show loading state) before heavy calc
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const suggestions = calculateOptimalLeave(
        holidays.value!,
        availableLeaveDays.value,
        selectedYear.value,
        priorityQuarter.value,
        currentYear === selectedYear.value ? currentDateString : null,
      );
      suggestedLeave.value = suggestions;
      // Remove console.log
      // console.log("Calculation finished. Suggestions:", suggestions);

      // --- Scroll to current month if current year ---
      if (currentYear === selectedYear.value) {
        // Use setTimeout to allow DOM to update after suggestions are set
        setTimeout(() => {
          const currentMonthIndex = today.getMonth(); // 0-indexed
          const targetId =
            `month-card-${selectedYear.value}-${currentMonthIndex}`;
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            // Remove console.log
            // console.log(`Scrolling to element: #${targetId}`);
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            console.warn(
              `Target element #${targetId} not found for scrolling.`,
            ); // Keep console.warn
          }
        }, 100); // Small delay (e.g., 100ms) to wait for render
      }
      // --- End Scroll Logic ---
    } catch (err) {
      console.error("Error during leave calculation:", err); // Keep console.error
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
    <div class="p-4 mx-auto max-w-7xl dark:bg-gray-900 min-h-screen">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 shadow">
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

      <div class="mb-6 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
        <button
          onClick={handleCalculateClick}
          disabled={isLoadingHolidays.value || isCalculating.value ||
            !holidays.value}
          class="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isCalculating.value ? "Calculating..." : "Calculate Optimal Leave"}
        </button>
        <div class="flex items-center gap-2 text-sm">
          {isLoadingHolidays.value && (
            <p class="text-gray-600 dark:text-gray-400">Loading holidays...</p>
          )}
          {isCalculating.value && !isLoadingHolidays.value && (
            <p class="text-gray-600 dark:text-gray-400">Calculating...</p>
          )}
          {error.value && (
            <p class="text-red-500 dark:text-red-400">Error: {error.value}</p>
          )}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!isLoadingHolidays.value && holidays.value && (
          (() => {
            // Determine current date string once before the loop
            const today = new Date();
            const currentYearCheck = today.getFullYear();
            const currentDateStringCheck = today.toISOString().split("T")[0];
            const isCurrentYear = selectedYear.value === currentYearCheck;

            return Array.from({ length: 12 }).map((_, i) => (
              <CalendarMonth
                key={`${selectedYear.value}-${i}`}
                year={selectedYear.value}
                month={i}
                holidays={holidays.value || []}
                suggestedLeaveDays={suggestedLeave.value}
                // Pass current date only if it's the current year
                currentDateString={isCurrentYear
                  ? currentDateStringCheck
                  : null}
              />
            ));
          })()
        )}
        {(isLoadingHolidays.value || !holidays.value && !error.value) && (
          <p class="sm:col-span-2 lg:col-span-3 text-center text-gray-500 py-10">
            {isLoadingHolidays.value
              ? "Loading calendar..."
              : "Select year and country to load calendar."}
          </p>
        )}
        {error.value && !isLoadingHolidays.value && (
          <p class="sm:col-span-2 lg:col-span-3 text-center text-red-500 py-10">
            Error loading holiday data. Cannot display calendar.
          </p>
        )}
      </div>
    </div>
  );
}
