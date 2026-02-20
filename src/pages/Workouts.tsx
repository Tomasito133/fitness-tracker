import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, Trophy, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '../components/ui';
import { WeekCalendar } from '../components/WeekCalendar';
import { WorkoutCard } from '../components/WorkoutCard';
import { db, seedExercises } from '../db';
import { groupByWeek, getTodayString } from '../lib/utils';

const ACCENT_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

export function Workouts() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    seedExercises();
  }, []);

  const workouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().limit(50).toArray()
  );

  const allSets = useLiveQuery(() => db.workoutSets.toArray());

  const workoutDates = useMemo(() => {
    return workouts?.map(w => w.date) || [];
  }, [workouts]);

  const workoutsWithStats = useMemo(() => {
    if (!workouts || !allSets) return [];
    
    return workouts.map((workout, index) => {
      const sets = allSets.filter(s => s.workoutId === workout.id);
      const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      
      let durationMinutes = 0;
      if (workout.completedAt && workout.startedAt) {
        const start = new Date(workout.startedAt).getTime();
        const end = new Date(workout.completedAt).getTime();
        durationMinutes = Math.round((end - start) / 60000);
      }

      return {
        ...workout,
        totalVolume,
        durationMinutes,
        accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
      };
    });
  }, [workouts, allSets]);

  const weekGroups = useMemo(() => {
    return groupByWeek(workoutsWithStats);
  }, [workoutsWithStats]);

  const handleStartWorkout = async () => {
    const today = getTodayString();
    const workoutId = await db.workouts.add({
      name: 'Тренировка',
      date: today,
      startedAt: new Date(),
    });
    navigate(`/workouts/${workoutId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-primary font-medium">
          Шаблоны
        </button>
        <h1 className="text-xl font-bold">Дневник</h1>
        <button
          onClick={handleStartWorkout}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <WeekCalendar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        workoutDates={workoutDates}
      />

      {weekGroups.length > 0 ? (
        <div className="space-y-6">
          {weekGroups.map((group) => (
            <div key={group.weekKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">{group.dateRange}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {group.items.length} {group.items.length === 1 ? 'тренировка' : 
                      group.items.length < 5 ? 'тренировки' : 'тренировок'}
                  </span>
                  <button className="p-1 rounded-full hover:bg-accent transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {group.items.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    date={workout.date}
                    name={workout.name}
                    durationMinutes={workout.durationMinutes}
                    totalVolume={workout.totalVolume}
                    accentColor={workout.accentColor}
                    onClick={() => navigate(`/workouts/${workout.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Нет тренировок</h3>
            <p className="text-muted-foreground text-center mb-4">
              Начните новую тренировку, чтобы отслеживать прогресс
            </p>
            <button
              onClick={handleStartWorkout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              <Plus className="w-4 h-4" />
              Начать тренировку
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
