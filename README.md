# LeaveMaxing

LeaveMaxing is a web application designed to help you maximize your time off by
suggesting the best days to take leave based on public holidays and weekends. By
selecting your country, the year, and the number of leave days you have, the app
calculates optimal leave dates to create the longest possible consecutive free
days, such as taking a Friday off when a holiday falls on a Thursday to enjoy a
four-day weekend. It should try to find "bridge days" between public holidays
and weekends to create the longest possible free days. for example if you have
public holiday on a wednesday, it should suggest monday, tuesday, thursday and
friday as good days to take leave.

## Features

- **Year Selection**: Choose a year, defaulting to the current year, with
  options up to 5 years in the future.
- **Country Selection**: Pick your country from a dropdown of available
  countries.
- **Leave Days Input**: Enter the number of leave days you have available.
- **Calendar Display**: View each month in a calendar component, with public
  holidays highlighted in orange and suggested leave days in green.
- **Smart Leave Suggestions**: Get recommendations for leave days that maximize
  consecutive free days by connecting holidays with weekends or bridging gaps
  between free days.
- **Priority quarter**: be able to select a quarter of the year to focus on. it
  does not garantie that all leave days will be in that quarter, but it will try
  to.

## How It Works

The app fetches public holiday data for the selected year and country using the
[Nager.Date API](https://date.nager.at/). It identifies free days (weekends and
public holidays) and calculates which workdays, when taken as leave, result in
the longest consecutive free day blocks. For example, if a holiday falls on a
Thursday, it suggests taking Friday off to extend the break through the weekend.

## Technical Stack

- **[Deno](https://deno.com/)**: A modern web framework for building fast,
  client-side websites.
- **[Fresh](https://fresh.deno.dev/)**: Used with TypeScript for dynamic,
  interactive components.

The application is fully client-side, with all logic and rendering handled in
the browser.
