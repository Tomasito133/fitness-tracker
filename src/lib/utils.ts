import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMuscleGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    chest: 'Грудь',
    back: 'Спина',
    shoulders: 'Плечи',
    biceps: 'Бицепс',
    triceps: 'Трицепс',
    legs: 'Ноги',
    abs: 'Пресс',
    cardio: 'Кардио',
    other: 'Другое',
  };
  return labels[group] || group;
}

export function getMealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
  };
  return labels[type] || type;
}

export function getMeasurementLabel(type: string): string {
  const labels: Record<string, string> = {
    weight: 'Вес',
    chest: 'Грудь',
    waist: 'Талия',
    hips: 'Бёдра',
    neck: 'Шея',
    bicep_left: 'Бицепс (Л)',
    bicep_right: 'Бицепс (П)',
    thigh_left: 'Бедро (Л)',
    thigh_right: 'Бедро (П)',
    body_fat: '% жира',
  };
  return labels[type] || type;
}

export function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diff));
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    dates.push(current);
  }
  
  return dates;
}

export function getDayOfWeekName(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', { weekday: 'long' });
}

export function getDayOfWeekShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[d.getDay()];
}

export function getISOWeekKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

export function formatWeekRange(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('ru-RU', { month: 'long' });
  const endMonth = endDate.toLocaleDateString('ru-RU', { month: 'long' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  
  if (startMonth === endMonth) {
    return `${startDay}—${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} ч ${mins} мин`;
  }
  return `${mins} мин`;
}

export function formatDurationWithSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export interface WeekGroup<T> {
  weekKey: string;
  dateRange: string;
  startDate: Date;
  endDate: Date;
  items: T[];
}

export function groupByWeek<T extends { date: string }>(items: T[]): WeekGroup<T>[] {
  const groups = new Map<string, { items: T[]; dates: Date[] }>();
  
  for (const item of items) {
    const date = new Date(item.date);
    const weekKey = getISOWeekKey(date);
    
    if (!groups.has(weekKey)) {
      groups.set(weekKey, { items: [], dates: [] });
    }
    
    const group = groups.get(weekKey)!;
    group.items.push(item);
    group.dates.push(date);
  }
  
  const result: WeekGroup<T>[] = [];
  
  for (const [weekKey, { items, dates }] of groups) {
    const weekDates = getWeekDates(dates[0]);
    const startDate = weekDates[0];
    const endDate = weekDates[6];
    
    result.push({
      weekKey,
      dateRange: formatWeekRange(startDate, endDate),
      startDate,
      endDate,
      items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    });
  }
  
  return result.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}
