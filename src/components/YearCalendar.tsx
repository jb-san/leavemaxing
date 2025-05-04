import { useState } from 'react';
import type { PublicHoliday } from '../types/api';
import MonthlyCalendar from './MonthlyCalendar';

interface YearCalendarProps {
  year: number;
  holidays: PublicHoliday[];
  recommendedLeaveDays: Date[];
}

export default function YearCalendar({ year, holidays, recommendedLeaveDays }: YearCalendarProps) {
  const [viewMode, setViewMode] = useState<'year' | 'single'>('single');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const toggleViewMode = () => {
    setViewMode(viewMode === 'year' ? 'single' : 'year');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Calendar {year}</h2>
        <button
          onClick={toggleViewMode}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          {viewMode === 'year' ? 'Show Single Month' : 'Show Full Year'}
        </button>
      </div>

      {viewMode === 'single' ? (
        <div>
          <div className="flex mb-2 justify-center">
            <div className="inline-flex bg-gray-100 rounded-md p-1">
              {monthNames.map((name, index) => (
                <button
                  key={name}
                  onClick={() => setCurrentMonth(index)}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentMonth === index
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <MonthlyCalendar
            year={year}
            month={currentMonth}
            holidays={holidays}
            recommendedLeaveDays={recommendedLeaveDays}
            onNavigatePrev={() => setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1))}
            onNavigateNext={() => setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1))}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthNames.map((name, index) => (
            <div key={name} className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2 text-center">{name}</h3>
              <MonthlyCalendar
                year={year}
                month={index}
                holidays={holidays}
                recommendedLeaveDays={recommendedLeaveDays}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
