import { useState } from 'react';
import { db, type Food } from '../db';
import { getTodayString, getMealTypeLabel } from '../lib/utils';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface AddMealEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType?: MealType;
  onSuccess?: () => void;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function AddMealEntry({ open, onOpenChange, mealType: defaultMealType, onSuccess }: AddMealEntryProps) {
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType || 'breakfast');

  const handleAddFood = async (food: {
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
  }, grams: number) => {
    let foodId: number;

    const existingFood = food.barcode 
      ? await db.foods.where('barcode').equals(food.barcode).first()
      : await db.foods.where('name').equals(food.name).first();

    if (existingFood) {
      foodId = existingFood.id!;
    } else {
      foodId = await db.foods.add({
        barcode: food.barcode,
        name: food.name,
        brand: food.brand,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        isCustom: false,
        createdAt: new Date(),
      }) as number;
    }

    await db.mealEntries.add({
      date: getTodayString(),
      mealType: selectedMealType,
      foodId,
      grams,
      createdAt: new Date(),
    });

    onSuccess?.();
    onOpenChange(false);
  };

  return { handleAddFood, selectedMealType, setSelectedMealType, mealTypes };
}
