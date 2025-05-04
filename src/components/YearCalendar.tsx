import type { PublicHoliday } from '../types/api';
import MonthlyCalendar from './MonthlyCalendar';

interface YearCalendarProps {
  year: number;
  holidays: PublicHoliday[];
  recommendedLeaveDays: Date[];
}

export default function YearCalendar({ year, holidays, recommendedLeaveDays }: YearCalendarProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Calendar {year}</h2>
      </div>

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
    </div>
  );
}
