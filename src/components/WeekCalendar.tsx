import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekDates, getMonthGridDates, getDayOfWeekShort, getTodayString, cn } from '../lib/utils';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onWeekChange?: (direction: 'prev' | 'next') => void;
  workoutDates?: string[];
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function WeekCalendar({
  selectedDate,
  onDateChange,
  onWeekChange,
  workoutDates = [],
}: WeekCalendarProps) {
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [viewedMonth, setViewedMonth] = useState(() => new Date(selectedDate));
  const miniCalRef = useRef<HTMLDivElement>(null);
  const today = getTodayString();

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthGrid = useMemo(
    () => getMonthGridDates(viewedMonth.getFullYear(), viewedMonth.getMonth()),
    [viewedMonth]
  );

  useEffect(() => {
    setViewedMonth(new Date(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!showMiniCalendar) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (miniCalRef.current && !miniCalRef.current.contains(e.target as Node)) {
        setShowMiniCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMiniCalendar]);

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

  const isPastDate = (dateStr: string) => dateStr < today;
  const isFutureDate = (dateStr: string) => dateStr > today;

  const monthYearLabel = selectedDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const viewedMonthLabel = viewedMonth.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    setViewedMonth((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const nextMonth = () => {
    setViewedMonth((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleMiniDayClick = (date: Date) => {
    onDateChange(date);
    setShowMiniCalendar(false);
  };

  const currentMonth = viewedMonth.getMonth();

  return (
    <div className="py-4 relative">
      <div className="flex justify-center mb-2">
        <button
          type="button"
          onClick={() => setShowMiniCalendar((v) => !v)}
          className="text-lg font-semibold text-foreground hover:text-primary transition-colors capitalize"
        >
          {monthYearLabel}
        </button>
      </div>

      {showMiniCalendar && (
        <div
          ref={miniCalRef}
          className="absolute left-4 right-4 z-50 mt-1 p-3 bg-card border border-border rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-full hover:bg-accent"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="font-medium capitalize">{viewedMonthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-full hover:bg-accent"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-xs text-muted-foreground py-1">
                {label}
              </div>
            ))}
            {monthGrid.map((date) => {
              const dateStr = date.toISOString().split('T')[0];
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate.toISOString().split('T')[0];
              const hasWorkoutOnDay = hasWorkout(date);
              const past = isPastDate(dateStr);
              const future = isFutureDate(dateStr);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleMiniDayClick(date)}
                  className={cn(
                    'aspect-square rounded-lg text-sm transition-colors',
                    !isCurrentMonth && 'text-muted-foreground/50',
                    isCurrentMonth && 'font-medium',
                    hasWorkoutOnDay && past && 'bg-muted', // прошедшие тренировки — серый фон
                    hasWorkoutOnDay && (future || dateStr === today) && 'bg-primary/20 text-primary', // запланированные
                    isToday && !hasWorkoutOnDay && 'ring-1 ring-primary',
                    isSelected && 'bg-primary text-primary-foreground',
                    isCurrentMonth && !isSelected && 'hover:bg-accent'
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                <span
                  className={cn(
                    'text-xs mb-1',
                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {getDayOfWeekShort(date)}
                </span>
                <span
                  className={cn(
                    'text-lg font-semibold',
                    isToday && !isSelected && 'text-primary'
                  )}
                >
                  {date.getDate()}
                </span>
                {hasWorkoutOnDay && (
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full mt-1',
                      isSelected ? 'bg-primary-foreground' : 'bg-primary'
                    )}
                  />
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
