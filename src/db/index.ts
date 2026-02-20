import Dexie, { type Table } from 'dexie';

// ==================== EXERCISES & WORKOUTS ====================

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'abs' | 'cardio' | 'other';
  type: 'strength' | 'cardio';
  isCustom: boolean;
  createdAt: Date;
}

export interface Workout {
  id?: number;
  name: string;
  date: string; // YYYY-MM-DD
  startedAt: Date;
  completedAt?: Date;
  notes?: string;
  sortOrder?: number;
  // Timer state persistence
  timerRunning?: boolean;
  timerAccumulatedMs?: number;
  timerLastStartedAt?: Date;
  // Exercise display order (exercise IDs)
  exerciseOrder?: number[];
}

export interface WorkoutSet {
  id?: number;
  workoutId: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weight: number;
  restSeconds: number;
  completedAt: Date;
}

// ==================== NUTRITION ====================

export interface Food {
  id?: number;
  barcode?: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
  createdAt: Date;
}

export interface MealEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: number;
  grams: number;
  createdAt: Date;
}

export interface WaterEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  amount: number; // ml
  createdAt: Date;
}

export interface NutritionGoal {
  id?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // ml
  updatedAt: Date;
}

// ==================== SUPPLEMENTS ====================

export interface Supplement {
  id?: number;
  name: string;
  dosage: string;
  dosageUnit: string;
  frequency: 'daily' | 'weekly' | 'as_needed';
  timesPerDay: number;
  reminderTimes: string[]; // ["08:00", "20:00"]
  withFood: boolean;
  stock: number;
  stockUnit: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface SupplementIntake {
  id?: number;
  supplementId: number;
  scheduledTime: string; // HH:mm
  takenAt?: Date;
  skipped: boolean;
  date: string; // YYYY-MM-DD
}

// ==================== BODY MEASUREMENTS ====================

export type MeasurementType = 'weight' | 'chest' | 'waist' | 'hips' | 'neck' | 'bicep_left' | 'bicep_right' | 'thigh_left' | 'thigh_right' | 'body_fat';

export interface BodyMeasurement {
  id?: number;
  date: string; // YYYY-MM-DD
  type: MeasurementType;
  value: number;
  unit: 'kg' | 'cm' | '%';
  notes?: string;
  createdAt: Date;
}

// ==================== DATABASE ====================

export class FitnessDB extends Dexie {
  exercises!: Table<Exercise>;
  workouts!: Table<Workout>;
  workoutSets!: Table<WorkoutSet>;
  foods!: Table<Food>;
  mealEntries!: Table<MealEntry>;
  waterEntries!: Table<WaterEntry>;
  nutritionGoals!: Table<NutritionGoal>;
  supplements!: Table<Supplement>;
  supplementIntakes!: Table<SupplementIntake>;
  bodyMeasurements!: Table<BodyMeasurement>;

  constructor() {
    super('fitnessTracker');
    
    this.version(1).stores({
      exercises: '++id, name, muscleGroup, type, isCustom',
      workouts: '++id, date, startedAt',
      workoutSets: '++id, workoutId, exerciseId, completedAt',
      foods: '++id, barcode, name, isCustom',
      mealEntries: '++id, date, mealType, foodId',
      waterEntries: '++id, date',
      nutritionGoals: '++id',
      supplements: '++id, name, isActive',
      supplementIntakes: '++id, supplementId, date, scheduledTime',
      bodyMeasurements: '++id, date, type',
    });

    this.version(2).stores({
      exercises: '++id, name, muscleGroup, type, isCustom',
      workouts: '++id, date, startedAt, sortOrder',
      workoutSets: '++id, workoutId, exerciseId, completedAt',
      foods: '++id, barcode, name, isCustom',
      mealEntries: '++id, date, mealType, foodId',
      waterEntries: '++id, date',
      nutritionGoals: '++id',
      supplements: '++id, name, isActive',
      supplementIntakes: '++id, supplementId, date, scheduledTime',
      bodyMeasurements: '++id, date, type',
    });
  }
}

export const db = new FitnessDB();

// ==================== SEED DATA ====================

export async function seedExercises() {
  const count = await db.exercises.count();
  if (count > 0) return;

  const defaultExercises: Omit<Exercise, 'id'>[] = [
    // Chest
    { name: 'Жим штанги лёжа', muscleGroup: 'chest', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Жим гантелей лёжа', muscleGroup: 'chest', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Разводка гантелей', muscleGroup: 'chest', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Отжимания', muscleGroup: 'chest', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Жим в тренажёре', muscleGroup: 'chest', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Back
    { name: 'Подтягивания', muscleGroup: 'back', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Тяга штанги в наклоне', muscleGroup: 'back', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Тяга гантели в наклоне', muscleGroup: 'back', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Тяга верхнего блока', muscleGroup: 'back', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Тяга нижнего блока', muscleGroup: 'back', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Становая тяга', muscleGroup: 'back', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Shoulders
    { name: 'Жим штанги стоя', muscleGroup: 'shoulders', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Жим гантелей сидя', muscleGroup: 'shoulders', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Махи гантелями в стороны', muscleGroup: 'shoulders', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Махи гантелями вперёд', muscleGroup: 'shoulders', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Тяга штанги к подбородку', muscleGroup: 'shoulders', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Biceps
    { name: 'Подъём штанги на бицепс', muscleGroup: 'biceps', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Подъём гантелей на бицепс', muscleGroup: 'biceps', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Молотки', muscleGroup: 'biceps', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Сгибания на скамье Скотта', muscleGroup: 'biceps', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Triceps
    { name: 'Французский жим', muscleGroup: 'triceps', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Разгибания на блоке', muscleGroup: 'triceps', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Отжимания на брусьях', muscleGroup: 'triceps', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Жим узким хватом', muscleGroup: 'triceps', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Legs
    { name: 'Приседания со штангой', muscleGroup: 'legs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Жим ногами', muscleGroup: 'legs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Выпады', muscleGroup: 'legs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Разгибания ног', muscleGroup: 'legs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Сгибания ног', muscleGroup: 'legs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Подъём на носки', muscleGroup: 'legs', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Abs
    { name: 'Скручивания', muscleGroup: 'abs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Планка', muscleGroup: 'abs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Подъём ног в висе', muscleGroup: 'abs', type: 'strength', isCustom: false, createdAt: new Date() },
    { name: 'Велосипед', muscleGroup: 'abs', type: 'strength', isCustom: false, createdAt: new Date() },
    
    // Cardio
    { name: 'Бег', muscleGroup: 'cardio', type: 'cardio', isCustom: false, createdAt: new Date() },
    { name: 'Велотренажёр', muscleGroup: 'cardio', type: 'cardio', isCustom: false, createdAt: new Date() },
    { name: 'Эллипсоид', muscleGroup: 'cardio', type: 'cardio', isCustom: false, createdAt: new Date() },
    { name: 'Скакалка', muscleGroup: 'cardio', type: 'cardio', isCustom: false, createdAt: new Date() },
    { name: 'Гребной тренажёр', muscleGroup: 'cardio', type: 'cardio', isCustom: false, createdAt: new Date() },
  ];

  await db.exercises.bulkAdd(defaultExercises);
}
