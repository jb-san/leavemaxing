# Implementation Plan for LeaveMaxing

This document outlines the steps to build the LeaveMaxing application based on
the README.

1. **Set up Project Structure:**
   - Initialize a new Deno Fresh project.
   - Create basic directory structure (`routes/`, `components/`, `islands/`,
     `utils/`).

2. **Fetch Public Holidays:**
   - Create a utility function (`utils/holidays.ts`) to fetch public holiday
     data from the Nager.Date API based on year and country code.
   - Handle API errors gracefully.

3. **Create UI Components:**
   - **`components/YearSelector.tsx`**: Dropdown for selecting the year (current
     year + next 5 years).
   - **`components/CountrySelector.tsx`**: Dropdown for selecting the country.
     Populate dynamically or use a predefined list compatible with the
     Nager.Date API.
   - **`components/LeaveDaysInput.tsx`**: Input field for the number of
     available leave days.
   - **`components/QuarterSelector.tsx`**: Radio buttons or dropdown to select a
     priority quarter (Q1, Q2, Q3, Q4) or 'Any'.
   - **`components/CalendarMonth.tsx`**: Component to display a single month's
     calendar view. It should be able to highlight dates based on type (weekend,
     holiday, suggested leave).
   - **`islands/LeaveCalculator.tsx`**: The main interactive island component
     that orchestrates the UI elements and logic. It will manage state for
     selected year, country, leave days, priority quarter, and fetched holidays.
     It will contain the calendar display logic.

4. **Implement Core Logic (`utils/leave_maximizer.ts`):**
   - Function to identify all free days (weekends + public holidays) for the
     selected year.
   - Algorithm to find optimal leave day suggestions:
     - Iterate through potential leave days (workdays).
     - For each potential leave day, calculate the length of the consecutive
       free block it creates by bridging weekends and holidays.
     - Consider the `priorityQuarter` to favor suggestions within that period.
     - Select the `n` best leave days (where `n` is the user's input) that
       result in the longest total free time or longest individual blocks,
       prioritizing based on the quarter if specified.

5. **Integrate Logic with UI (`islands/LeaveCalculator.tsx`):**
   - Trigger holiday fetching when year or country changes.
   - Call the `leave_maximizer` logic when holidays are fetched or leave
     days/priority quarter input changes.
   - Pass holiday data and suggested leave dates to the `CalendarMonth`
     components for display.
   - Render multiple `CalendarMonth` components (e.g., 12 for the year).

6. **Styling:**
   - Apply basic styling to make the application presentable. Use Tailwind CSS
     (common with Fresh) or standard CSS.
   - Ensure highlighted dates (holidays: orange, suggested leave: green) are
     clear.

7. **Deployment (Optional):**
   - Configure deployment settings (e.g., for Deno Deploy).

8. **Refinement & Testing:**
   - Test with various countries, years, and leave day counts.
   - Test edge cases (e.g., holidays at year start/end, few/many leave days).
   - Refine the suggestion algorithm based on test results.
