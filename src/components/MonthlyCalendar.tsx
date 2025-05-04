import { addMonths, format, subMonths } from 'date-fns';
import { useState } from 'react';
import type { PublicHoliday } from '../types/api';
import { getDatesInMonth, getHolidayDetails, isHoliday, isWeekendDay } from '../utils/dateUtils';
import DayCell from './DayCell';

interface MonthlyCalendarProps {
  year: number;
  month: number; // 0-based (0 = January, 11 = December)
  holidays: PublicHoliday[];
  recommendedLeaveDays: Date[];
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

export default function MonthlyCalendar({
  year,
  month,
  holidays,
  recommendedLeaveDays,
  onNavigatePrev,
  onNavigateNext,
}: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(year, month, 1));

  // Get all dates for the current month
  const datesInMonth = getDatesInMonth(currentDate.getFullYear(), currentDate.getMonth());

  // Get the day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = datesInMonth[0].getDay();

  // Calculate how many empty cells we need before the first day
  const emptyCellsAtStart = Array(firstDayOfWeek).fill(null);

  // Create the week rows
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [...emptyCellsAtStart];

  // Add the actual dates
  datesInMonth.forEach((date) => {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(date);
  });

  // Fill the last week with empty cells if needed
  while (currentWeek.length < 7) {
    currentWeek.push(null);
  }

  // Add the last week
  weeks.push(currentWeek);

  // Function to check if a date is recommended leave
  const isRecommendedLeave = (date: Date): boolean => {
    return recommendedLeaveDays.some(
      (leaveDate) =>
        leaveDate.getFullYear() === date.getFullYear() &&
        leaveDate.getMonth() === date.getMonth() &&
        leaveDate.getDate() === date.getDate()
    );
  };

  // Handle month navigation
  const handlePrevMonth = () => {
    const prevMonth = subMonths(currentDate, 1);
    setCurrentDate(prevMonth);

    // Call the parent callback with the new month if provided
    if (onNavigatePrev) {
      onNavigatePrev();
    }
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentDate, 1);
    setCurrentDate(nextMonth);

    // Call the parent callback with the new month if provided
    if (onNavigateNext) {
      onNavigateNext();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Month header and navigation */}
      <div className="flex justify-between items-center p-4 border-b">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Previous month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-800">{format(currentDate, 'MMMM yyyy')}</h2>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Next month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="p-2">
        {/* Day names header */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center py-2 font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((date, index) => {
            if (!date) {
              return (
                <div key={`empty-${index}`} className="bg-gray-50 border border-gray-200"></div>
              );
            }

            const isWeekend = isWeekendDay(date);
            const isHolidayDate = isHoliday(date, holidays);
            const holidayDetails = isHolidayDate ? getHolidayDetails(date, holidays) : null;
            const isLeaveDay = isRecommendedLeave(date);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();

            return (
              <DayCell
                key={date.toISOString()}
                date={date}
                isCurrentMonth={isCurrentMonth}
                isWeekend={isWeekend}
                isHoliday={isHolidayDate}
                isRecommendedLeave={isLeaveDay}
                holidayDetails={holidayDetails}
              />
            );
          })}
        </div>
      </div>

      {/* Calendar legend */}
      <div className="p-4 border-t">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
            <span>Weekend</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-orange-400 mr-2"></span>
            <span>Holiday</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>
            <span>Recommended Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
