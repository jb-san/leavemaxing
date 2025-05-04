import type { PublicHoliday } from '../types/api';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  isRecommendedLeave: boolean;
  holidayDetails?: PublicHoliday | null;
  onClick?: () => void;
}

export default function DayCell({
  date,
  isCurrentMonth,
  isWeekend,
  isHoliday,
  isRecommendedLeave,
  holidayDetails,
  onClick,
}: DayCellProps) {
  // Determine cell color based on its status
  let backgroundColor = 'bg-white';
  let textColor = 'text-gray-900';
  let hoverEffect = 'hover:bg-gray-100';

  if (!isCurrentMonth) {
    backgroundColor = 'bg-gray-100';
    textColor = 'text-gray-400';
  } else if (isRecommendedLeave) {
    backgroundColor = 'bg-green-100';
    textColor = 'text-green-800';
    hoverEffect = 'hover:bg-green-200';
  } else if (isHoliday) {
    backgroundColor = 'bg-orange-100';
    textColor = 'text-orange-800';
    hoverEffect = 'hover:bg-orange-200';
  } else if (isWeekend) {
    backgroundColor = 'bg-blue-50';
    textColor = 'text-blue-800';
    hoverEffect = 'hover:bg-blue-100';
  }

  return (
    <div
      className={`min-h-[80px] p-2 border border-gray-200 ${backgroundColor} ${hoverEffect} cursor-pointer transition-colors`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <span className={`font-medium ${textColor}`}>{date.getDate()}</span>
        <div className="flex gap-1">
          {isWeekend && !isHoliday && (
            <span className="w-2 h-2 rounded-full bg-blue-400" title="Weekend" />
          )}
          {isHoliday && (
            <span
              className="w-2 h-2 rounded-full bg-orange-400"
              title={holidayDetails?.name || 'Holiday'}
            />
          )}
          {isRecommendedLeave && (
            <span className="w-2 h-2 rounded-full bg-green-400" title="Recommended Leave" />
          )}
        </div>
      </div>

      {isHoliday && holidayDetails && (
        <div
          className={`mt-1 text-xs font-medium ${textColor} line-clamp-2`}
          title={holidayDetails.name}
        >
          {holidayDetails.name}
        </div>
      )}
    </div>
  );
}
