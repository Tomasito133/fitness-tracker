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
