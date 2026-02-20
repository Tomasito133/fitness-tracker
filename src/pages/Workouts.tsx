import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, Clock, Calendar, ChevronRight, Flame } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { db, seedExercises } from '../db';
import { useEffect } from 'react';
import { formatShortDate, getMuscleGroupLabel, getTodayString } from '../lib/utils';

export function Workouts() {
  const navigate = useNavigate();

  useEffect(() => {
    seedExercises();
  }, []);

  const workouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().limit(20).toArray()
  );

  const allSets = useLiveQuery(() => db.workoutSets.toArray());

  const exercises = useLiveQuery(() => db.exercises.toArray());

  const exercisesByGroup = exercises?.reduce((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
    acc[ex.muscleGroup].push(ex);
    return acc;
  }, {} as Record<string, typeof exercises>);

  const handleStartWorkout = async () => {
    const today = getTodayString();
    const workoutId = await db.workouts.add({
      name: 'Тренировка',
      date: today,
      startedAt: new Date(),
    });
    navigate(`/workouts/${workoutId}`);
  };

  const getWorkoutStats = (workoutId: number) => {
    const sets = allSets?.filter(s => s.workoutId === workoutId) || [];
    const totalSets = sets.length;
    const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const uniqueExercises = new Set(sets.map(s => s.exerciseId)).size;
    return { totalSets, totalVolume, uniqueExercises };
  };

  const getWorkoutDuration = (workout: typeof workouts extends (infer T)[] | undefined ? T : never) => {
    if (!workout?.completedAt) return null;
    const start = new Date(workout.startedAt).getTime();
    const end = new Date(workout.completedAt).getTime();
    return Math.round((end - start) / 60000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Тренировки</h1>
          <p className="text-muted-foreground">Записывайте свой прогресс</p>
        </div>
        <Button onClick={handleStartWorkout}>
          <Plus className="w-4 h-4 mr-2" />
          Новая
        </Button>
      </div>

      {workouts && workouts.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">История</h2>
          {workouts.map((workout) => {
            const stats = getWorkoutStats(workout.id!);
            const duration = getWorkoutDuration(workout);
            const isCompleted = !!workout.completedAt;

            return (
              <Card
                key={workout.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/workouts/${workout.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCompleted ? 'bg-primary/10' : 'bg-warning/10'}`}>
                        <Dumbbell className={`w-5 h-5 ${isCompleted ? 'text-primary' : 'text-warning'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{workout.name}</p>
                          {!isCompleted && (
                            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                              В процессе
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatShortDate(workout.date)}
                          </span>
                          {duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {duration} мин
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="font-medium">{stats.totalSets} подходов</p>
                        <p className="text-muted-foreground flex items-center gap-1 justify-end">
                          <Flame className="w-3 h-3" />
                          {stats.totalVolume.toLocaleString()} кг
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Нет тренировок</h3>
            <p className="text-muted-foreground text-center mb-4">
              Начните новую тренировку, чтобы отслеживать прогресс
            </p>
            <Button onClick={handleStartWorkout}>
              <Plus className="w-4 h-4 mr-2" />
              Начать тренировку
            </Button>
          </CardContent>
        </Card>
      )}

      {exercisesByGroup && Object.keys(exercisesByGroup).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Упражнения по группам</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(exercisesByGroup).map(([group, exs]) => (
              <Card key={group} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">{getMuscleGroupLabel(group)}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl font-bold">{exs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">упражнений</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
