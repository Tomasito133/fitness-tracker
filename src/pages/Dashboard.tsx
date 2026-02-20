import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Utensils, Pill, Ruler, Droplets, TrendingUp, Flame, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../components/ui';
import { db } from '../db';
import { getTodayString, formatShortDate } from '../lib/utils';

export function Dashboard() {
  const navigate = useNavigate();
  const today = getTodayString();

  const todayWorkouts = useLiveQuery(
    () => db.workouts.where('date').equals(today).toArray(),
    [today]
  );

  const todayMeals = useLiveQuery(
    () => db.mealEntries.where('date').equals(today).toArray(),
    [today]
  );

  const todayWater = useLiveQuery(
    () => db.waterEntries.where('date').equals(today).toArray(),
    [today]
  );

  const todaySupplements = useLiveQuery(
    () => db.supplementIntakes.where('date').equals(today).toArray(),
    [today]
  );

  const foods = useLiveQuery(() => db.foods.toArray());

  const nutritionGoal = useLiveQuery(() => db.nutritionGoals.toCollection().last());

  const latestWeight = useLiveQuery(
    () => db.bodyMeasurements.where('type').equals('weight').last()
  );

  const supplements = useLiveQuery(() =>
    db.supplements.where('isActive').equals(1).toArray()
  );

  const totalWater = todayWater?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
  const waterGoal = nutritionGoal?.water || 2500;

  const supplementsTaken = todaySupplements?.filter(s => !s.skipped && s.takenAt).length || 0;
  const supplementsTotal = supplements?.reduce((sum, s) => sum + s.reminderTimes.length, 0) || 0;

  const todayCalories = useMemo(() => {
    if (!todayMeals || !foods) return 0;
    return todayMeals.reduce((sum, meal) => {
      const food = foods.find(f => f.id === meal.foodId);
      return sum + (food ? Math.round(food.calories * meal.grams / 100) : 0);
    }, 0);
  }, [todayMeals, foods]);

  const calorieGoal = nutritionGoal?.calories || 2000;

  const handleStartWorkout = async () => {
    const workoutId = await db.workouts.add({
      name: 'Тренировка',
      date: today,
      startedAt: new Date(),
    });
    navigate(`/workouts/${workoutId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Привет!</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors" 
          onClick={() => navigate('/workouts')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Тренировки</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayWorkouts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">сегодня</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/nutrition')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Калории</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCalories}</div>
            <p className="text-xs text-muted-foreground">/ {calorieGoal} ккал</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/nutrition')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Вода</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWater}</div>
            <p className="text-xs text-muted-foreground">/ {waterGoal} мл</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/supplements')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">БАДы</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplementsTaken}/{supplementsTotal}
            </div>
            <p className="text-xs text-muted-foreground">принято</p>
          </CardContent>
        </Card>
      </div>

      {latestWeight && (
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/body')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Текущий вес</p>
                <p className="text-sm text-muted-foreground">
                  Измерено {formatShortDate(latestWeight.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{latestWeight.value} кг</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Начать тренировку</h3>
                <p className="text-sm text-muted-foreground">
                  Запишите свой прогресс
                </p>
              </div>
            </div>
            <Button onClick={handleStartWorkout}>
              <Plus className="w-4 h-4 mr-2" />
              Начать
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/nutrition')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Utensils className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Добавить еду</p>
              <p className="text-xs text-muted-foreground">{todayMeals?.length || 0} записей</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/body')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Ruler className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Добавить замер</p>
              <p className="text-xs text-muted-foreground">Отслеживайте прогресс</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
