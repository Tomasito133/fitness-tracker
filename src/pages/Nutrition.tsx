import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Utensils, Droplets, Search, Flame, Beef, Wheat, Droplet, Trash2, Settings } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui';
import { FoodSearch } from '../components/FoodSearch';
import { db } from '../db';
import { getTodayString, getMealTypeLabel, cn } from '../lib/utils';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function Nutrition() {
  const today = getTodayString();
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showWaterInput, setShowWaterInput] = useState(false);
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [waterAmount, setWaterAmount] = useState(250);

  const todayMeals = useLiveQuery(
    () => db.mealEntries.where('date').equals(today).toArray(),
    [today]
  );

  const todayWater = useLiveQuery(
    () => db.waterEntries.where('date').equals(today).toArray(),
    [today]
  );

  const foods = useLiveQuery(() => db.foods.toArray());

  const nutritionGoal = useLiveQuery(() => db.nutritionGoals.toCollection().last());

  const [goalCalories, setGoalCalories] = useState(2000);
  const [goalProtein, setGoalProtein] = useState(150);
  const [goalCarbs, setGoalCarbs] = useState(200);
  const [goalFat, setGoalFat] = useState(70);
  const [goalWater, setGoalWater] = useState(2500);

  const totalWater = todayWater?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
  const waterGoal = nutritionGoal?.water || 2500;

  const todayNutrients = useMemo(() => {
    if (!todayMeals || !foods) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    return todayMeals.reduce(
      (acc, meal) => {
        const food = foods.find((f) => f.id === meal.foodId);
        if (!food) return acc;

        const multiplier = meal.grams / 100;
        return {
          calories: acc.calories + Math.round(food.calories * multiplier),
          protein: acc.protein + food.protein * multiplier,
          carbs: acc.carbs + food.carbs * multiplier,
          fat: acc.fat + food.fat * multiplier,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayMeals, foods]);

  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, typeof todayMeals> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    todayMeals?.forEach((meal) => {
      if (grouped[meal.mealType as MealType]) {
        grouped[meal.mealType as MealType]!.push(meal);
      }
    });

    return grouped;
  }, [todayMeals]);

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
      date: today,
      mealType: selectedMealType,
      foodId,
      grams,
      createdAt: new Date(),
    });
  };

  const handleAddWater = async (ml: number) => {
    await db.waterEntries.add({
      date: today,
      amount: ml,
      createdAt: new Date(),
    });
  };

  const handleDeleteMeal = async (mealId: number) => {
    await db.mealEntries.delete(mealId);
  };

  const handleSaveGoals = async () => {
    const existingGoal = await db.nutritionGoals.toCollection().first();
    
    const goalData = {
      calories: goalCalories,
      protein: goalProtein,
      carbs: goalCarbs,
      fat: goalFat,
      water: goalWater,
      updatedAt: new Date(),
    };

    if (existingGoal) {
      await db.nutritionGoals.update(existingGoal.id!, goalData);
    } else {
      await db.nutritionGoals.add(goalData);
    }
    
    setShowGoalsDialog(false);
  };

  const calorieGoal = nutritionGoal?.calories || 2000;
  const proteinGoal = nutritionGoal?.protein || 150;
  const carbsGoal = nutritionGoal?.carbs || 200;
  const fatGoal = nutritionGoal?.fat || 70;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Питание</h1>
          <p className="text-muted-foreground">Отслеживайте калории и БЖУ</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowGoalsDialog(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className={cn(todayNutrients.calories > calorieGoal && 'border-destructive/50')}>
          <CardContent className="p-3 text-center">
            <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{todayNutrients.calories}</p>
            <p className="text-xs text-muted-foreground">/ {calorieGoal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Beef className="w-5 h-5 mx-auto text-red-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(todayNutrients.protein)}</p>
            <p className="text-xs text-muted-foreground">/ {proteinGoal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Wheat className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(todayNutrients.carbs)}</p>
            <p className="text-xs text-muted-foreground">/ {carbsGoal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Droplet className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{Math.round(todayNutrients.fat)}</p>
            <p className="text-xs text-muted-foreground">/ {fatGoal}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Вода
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowWaterInput(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">{totalWater} мл</span>
            <span className="text-muted-foreground">/ {waterGoal} мл</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((totalWater / waterGoal) * 100, 100)}%` }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            {[200, 250, 300, 500].map((ml) => (
              <Button
                key={ml}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleAddWater(ml)}
              >
                +{ml}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Дневник питания</h2>
        </div>

        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => {
          const meals = mealsByType[mealType] || [];
          const mealCalories = meals.reduce((sum, meal) => {
            const food = foods?.find((f) => f.id === meal.foodId);
            return sum + (food ? Math.round(food.calories * meal.grams / 100) : 0);
          }, 0);

          return (
            <Card key={mealType}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {getMealTypeLabel(mealType)}
                    </CardTitle>
                    {mealCalories > 0 && (
                      <span className="text-xs text-muted-foreground">{mealCalories} ккал</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMealType(mealType);
                      setShowFoodSearch(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {meals.length > 0 ? (
                  <div className="space-y-2">
                    {meals.map((meal) => {
                      const food = foods?.find((f) => f.id === meal.foodId);
                      if (!food) return null;

                      const multiplier = meal.grams / 100;
                      const calories = Math.round(food.calories * multiplier);

                      return (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{food.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {meal.grams}г · {calories} ккал
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteMeal(meal.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет записей</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!todayMeals || todayMeals.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Utensils className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Начните вести дневник</h3>
            <p className="text-muted-foreground text-center mb-4">
              Добавьте первый приём пищи
            </p>
            <Button onClick={() => setShowFoodSearch(true)}>
              <Search className="w-4 h-4 mr-2" />
              Поиск продуктов
            </Button>
          </CardContent>
        </Card>
      )}

      <FoodSearch
        open={showFoodSearch}
        onOpenChange={setShowFoodSearch}
        onSelect={handleAddFood}
      />

      <Dialog open={showWaterInput} onOpenChange={setShowWaterInput}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить воду</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Количество (мл)</label>
              <Input
                type="number"
                value={waterAmount}
                onChange={(e) => setWaterAmount(Number(e.target.value))}
                className="mt-1"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-2">
              {[150, 200, 250, 300, 500].map((ml) => (
                <Button
                  key={ml}
                  variant={waterAmount === ml ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setWaterAmount(ml)}
                >
                  {ml}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                handleAddWater(waterAmount);
                setShowWaterInput(false);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Цели КБЖУ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Калории (ккал)</label>
              <Input
                type="number"
                value={goalCalories}
                onChange={(e) => setGoalCalories(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Белки (г)</label>
                <Input
                  type="number"
                  value={goalProtein}
                  onChange={(e) => setGoalProtein(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Углев. (г)</label>
                <Input
                  type="number"
                  value={goalCarbs}
                  onChange={(e) => setGoalCarbs(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Жиры (г)</label>
                <Input
                  type="number"
                  value={goalFat}
                  onChange={(e) => setGoalFat(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Вода (мл)</label>
              <Input
                type="number"
                value={goalWater}
                onChange={(e) => setGoalWater(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleSaveGoals}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
