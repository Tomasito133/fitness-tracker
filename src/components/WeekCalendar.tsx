import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekDates, getDayOfWeekShort, getTodayString, cn } from '../lib/utils';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onWeekChange?: (direction: 'prev' | 'next') => void;
  workoutDates?: string[];
}

export function WeekCalendar({ 
  selectedDate, 
  onDateChange, 
  onWeekChange,
  workoutDates = [] 
}: WeekCalendarProps) {
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const today = getTodayString();

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
    onWeekChange?.('prev');
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
    onWeekChange?.('next');
  };

  const hasWorkout = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return workoutDates.includes(dateStr);
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevWeek}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <div className="flex gap-1 flex-1 justify-center">
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate.toISOString().split('T')[0];
            const hasWorkoutOnDay = hasWorkout(date);

            return (
              <button
                key={dateStr}
                onClick={() => onDateChange(date)}
                className={cn(
                  'flex flex-col items-center py-2 px-3 rounded-xl transition-colors min-w-[44px]',
                  isToday && !isSelected && 'bg-primary/10',
                  isSelected && 'bg-primary text-primary-foreground',
                  !isToday && !isSelected && 'hover:bg-accent'
                )}
              >
                <span className={cn(
                  'text-xs mb-1',
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}>
                  {getDayOfWeekShort(date)}
                </span>
                <span className={cn(
                  'text-lg font-semibold',
                  isToday && !isSelected && 'text-primary'
                )}>
                  {date.getDate()}
                </span>
                {hasWorkoutOnDay && (
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  )} />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
