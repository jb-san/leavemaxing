# LeaveMaxing

LeaveMaxing is a web application designed to help you maximize your time off by suggesting the best days to take leave based on public holidays and weekends. By selecting your country, the year, and the number of leave days you have, the app calculates optimal leave dates to create the longest possible consecutive free days, such as taking a Friday off when a holiday falls on a Thursday to enjoy a four-day weekend.

## Features

- **Year Selection**: Choose a year, defaulting to the current year, with options up to 5 years in the future.
- **Country Selection**: Pick your country from a dropdown of available countries.
- **Leave Days Input**: Enter the number of leave days you have available.
- **Calendar Display**: View each month in a calendar component, with public holidays highlighted in orange and suggested leave days in green.
- **Smart Leave Suggestions**: Get recommendations for leave days that maximize consecutive free days by connecting holidays with weekends or bridging gaps between free days.

## How It Works

The app fetches public holiday data for the selected year and country using the [Nager.Date API](https://date.nager.at/). It identifies free days (weekends and public holidays) and calculates which workdays, when taken as leave, result in the longest consecutive free day blocks. For example, if a holiday falls on a Thursday, it suggests taking Friday off to extend the break through the weekend.

## Technical Stack

- **[Astro](https://astro.build/)**: A modern web framework for building fast, client-side websites.
- **[React](https://reactjs.org/)**: Used with TypeScript for dynamic, interactive components.
- **[TypeScript](https://www.typescriptlang.org/)**: Ensures type-safe, maintainable code.

The application is fully client-side, with all logic and rendering handled in the browser.

## Setup

To run LeaveMaxing locally, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repo/leave-maxing.git
   cd leave-maxing
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:3000` to see the app in action.

## Building for Production

To create a production-ready build, run:

```bash
npm run build
```

The output will be generated in the `dist` directory, ready for deployment.

## Contributing

We welcome contributions! If you find a bug or have a feature idea, please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.