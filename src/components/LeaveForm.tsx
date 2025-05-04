import { useState } from 'react';
import type { PublicHoliday } from '../types/api';
import { getCachedHolidays } from '../utils/api';
import { sortedCountries } from '../utils/countryData';
import { formatDate } from '../utils/dateUtils';
import { findOptimalLeaveDays } from '../utils/leaveMaximizer';
import YearCalendar from './YearCalendar';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
const quarters = [
  { id: 0, name: 'No Priority' },
  { id: 1, name: 'Q1 (Jan-Mar)' },
  { id: 2, name: 'Q2 (Apr-Jun)' },
  { id: 3, name: 'Q3 (Jul-Sep)' },
  { id: 4, name: 'Q4 (Oct-Dec)' },
];

export default function LeaveForm() {
  const [year, setYear] = useState<number>(currentYear);
  const [country, setCountry] = useState<string>('US');
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [leaveDays, setLeaveDays] = useState<number>(15);
  const [priorityQuarter, setPriorityQuarter] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  // Filter countries based on search
  const filteredCountries = countrySearch
    ? sortedCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.countryCode.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : sortedCountries;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const holidaysData = await getCachedHolidays(year, country);
      setHolidays(holidaysData);
      const optimalPlan = findOptimalLeaveDays(year, holidaysData, leaveDays, priorityQuarter);
      setResults(optimalPlan);
      setShowCalendar(true);
    } catch (err) {
      setError('Error calculating optimal leave days. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Maximize Your Leave Days</h2>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="block w-full px-3 py-2 mb-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  size={countrySearch ? 5 : 1}
                >
                  {filteredCountries.map((c) => (
                    <option key={c.countryCode} value={c.countryCode}>
                      {c.name} ({c.countryCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="leaveDays" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Leave Days
              </label>
              <input
                type="number"
                id="leaveDays"
                value={leaveDays}
                onChange={(e) => setLeaveDays(parseInt(e.target.value))}
                min="1"
                max="365"
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="priorityQuarter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Priority Quarter
              </label>
              <select
                id="priorityQuarter"
                value={priorityQuarter}
                onChange={(e) => setPriorityQuarter(parseInt(e.target.value))}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {quarters.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate Optimal Leave Days'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 lg:mt-0 lg:col-span-2">
          {error && <div className="p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

          {results && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Optimal Leave Plan</h3>

                <div className="mb-4">
                  <p className="font-medium">
                    Total Days Off:{' '}
                    <span className="text-indigo-600">{results.leavePlan.totalTimeOff}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Using {results.leavePlan.recommendedLeaveDays.length} leave days
                  </p>
                </div>

                <h4 className="font-medium mb-2">Recommended Leave Days:</h4>
                <ul className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {results.leavePlan.recommendedLeaveDays.map((date: Date) => (
                    <li key={date.toString()} className="text-sm p-1 bg-green-100 rounded">
                      {formatDate(new Date(date))}
                    </li>
                  ))}
                </ul>

                <h4 className="font-medium mb-2">Consecutive Breaks:</h4>
                <ul className="space-y-2">
                  {results.leavePlan.consecutiveBreaks.map((breakPeriod: any, index: number) => (
                    <li key={index} className="text-sm p-2 bg-blue-50 rounded flex justify-between">
                      <span>
                        {formatDate(new Date(breakPeriod.startDate))} -{' '}
                        {formatDate(new Date(breakPeriod.endDate))}
                      </span>
                      <span className="font-semibold">
                        {breakPeriod.duration} days
                        <span className="text-gray-500 ml-1">
                          ({breakPeriod.leaveDaysUsed} leave days)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                  >
                    {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 ml-1"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {showCalendar && (
                <div className="mt-4">
                  <YearCalendar
                    year={year}
                    holidays={holidays}
                    recommendedLeaveDays={results.leavePlan.recommendedLeaveDays.map(
                      (d: string) => new Date(d)
                    )}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
