import { useState } from 'react';
import { getCachedHolidays } from '../utils/api';
import { sortedCountries } from '../utils/countryData';
import { formatDate } from '../utils/dateUtils';
import { findOptimalLeaveDays } from '../utils/leaveMaximizer';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

export default function LeaveForm() {
  const [year, setYear] = useState<number>(currentYear);
  const [country, setCountry] = useState<string>('US');
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [leaveDays, setLeaveDays] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

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
      const holidays = await getCachedHolidays(year, country);
      const optimalPlan = findOptimalLeaveDays(year, holidays, leaveDays);
      setResults(optimalPlan);
    } catch (err) {
      setError('Error calculating optimal leave days. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Maximize Your Leave Days</h2>

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
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Calculate Optimal Leave Days'}
          </button>
        </div>
      </form>

      {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

      {results && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
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
          <ul className="mb-4 grid grid-cols-2 gap-2">
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
        </div>
      )}
    </div>
  );
}
