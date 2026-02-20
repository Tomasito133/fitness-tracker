import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Dumbbell, Trophy } from 'lucide-react';
import { Card, CardContent } from '../components/ui';
import { WeekCalendar } from '../components/WeekCalendar';
import { WorkoutCard } from '../components/WorkoutCard';
import { db, seedExercises } from '../db';
import { getWeekDates, getTodayString } from '../lib/utils';
import { Dialog } from '../components/ui/Dialog';

const WORKOUTS_DATE_KEY = 'workoutsSelectedDate';

export function Workouts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const selectedDate = useMemo(() => {
    if (!dateParam) return new Date();
    const parsed = new Date(dateParam);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dateParam]);
  const setSelectedDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSearchParams({ date: dateStr }, { replace: true });
    try {
      localStorage.setItem(WORKOUTS_DATE_KEY, dateStr);
    } catch (_) {}
  };
  useEffect(() => {
    if (!dateParam) {
      try {
        const stored = localStorage.getItem(WORKOUTS_DATE_KEY);
        if (stored) {
          const parsed = new Date(stored);
          if (!isNaN(parsed.getTime())) setSearchParams({ date: stored }, { replace: true });
        }
      } catch (_) {}
    }
  }, [dateParam, setSearchParams]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newWorkoutDate, setNewWorkoutDate] = useState(getTodayString());

  useEffect(() => {
    seedExercises();
  }, []);

  const workouts = useLiveQuery(
    () => db.workouts.orderBy('sortOrder').toArray()
  );

  const allSets = useLiveQuery(() => db.workoutSets.toArray());

  const workoutDates = useMemo(() => {
    return workouts?.map(w => w.date) || [];
  }, [workouts]);

  const workoutsWithStats = useMemo(() => {
    if (!workouts || !allSets) return [];
    
    const sorted = [...workouts].sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    return sorted.map((workout) => {
      const sets = allSets.filter(s => s.workoutId === workout.id);
      const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      
      let durationMinutes = 0;
      if (workout.completedAt) {
        // Completed workout - use saved timer accumulated time if available
        if (workout.timerAccumulatedMs) {
          durationMinutes = Math.round(workout.timerAccumulatedMs / 60000);
        } else if (workout.startedAt) {
          // Fallback for old workouts without timerAccumulatedMs
          const start = new Date(workout.startedAt).getTime();
          const end = new Date(workout.completedAt).getTime();
          durationMinutes = Math.round((end - start) / 60000);
        }
      } else if (workout.timerRunning && workout.timerLastStartedAt) {
        // Active running workout - calculate current duration
        const accumulated = workout.timerAccumulatedMs || 0;
        const elapsed = Date.now() - new Date(workout.timerLastStartedAt).getTime();
        durationMinutes = Math.round((accumulated + elapsed) / 60000);
      } else if (workout.timerAccumulatedMs) {
        // Paused workout - show accumulated time
        durationMinutes = Math.round(workout.timerAccumulatedMs / 60000);
      }

      return {
        ...workout,
        totalVolume,
        durationMinutes,
      };
    });
  }, [workouts, allSets]);

  const filteredWorkouts = useMemo(() => {
    const weekDates = getWeekDates(selectedDate);
    const weekStart = weekDates[0].toISOString().split('T')[0];
    const weekEnd = weekDates[6].toISOString().split('T')[0];
    
    return workoutsWithStats
      .filter(w => w.date >= weekStart && w.date <= weekEnd)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workoutsWithStats, selectedDate]);

  const isPastWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekDates = getWeekDates(selectedDate);
    const weekEnd = weekDates[6];
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd < today;
  }, [selectedDate]);

  const isFutureWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekDates = getWeekDates(selectedDate);
    const weekStart = weekDates[0];
    weekStart.setHours(0, 0, 0, 0);
    return weekStart > today;
  }, [selectedDate]);

  const handleStartWorkout = () => {
    setNewWorkoutDate(selectedDate.toISOString().split('T')[0]);
    setShowDatePicker(true);
  };

  const handleCreateWorkout = async () => {
    const maxSortOrder = workouts?.reduce((max, w) => Math.max(max, w.sortOrder || 0), 0) || 0;
    const workoutDate = new Date(newWorkoutDate);
    const workoutId = await db.workouts.add({
      name: 'Тренировка',
      date: newWorkoutDate,
      startedAt: workoutDate,
      sortOrder: maxSortOrder + 1,
    });
    setShowDatePicker(false);
    navigate(`/workouts/${workoutId}`);
  };

  const handleNameChange = async (workoutId: number, newName: string) => {
    await db.workouts.update(workoutId, { name: newName });
  };

  const handleDeleteClick = (workoutId: number, workoutName: string) => {
    setDeleteConfirm({ id: workoutId, name: workoutName });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await db.workoutSets.where('workoutId').equals(deleteConfirm.id).delete();
      await db.workouts.delete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleDayDoubleClick = (date: Date) => {
    setSelectedDate(date);
    setNewWorkoutDate(date.toISOString().split('T')[0]);
    setShowDatePicker(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleStartWorkout}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Добавить тренировку"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <WeekCalendar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onDayDoubleClick={handleDayDoubleClick}
        workoutDates={workoutDates}
      />

      {filteredWorkouts.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Тренировки на этой неделе</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'тренировка' : 
                filteredWorkouts.length < 5 ? 'тренировки' : 'тренировок'}
            </span>
          </div>

          <div className="space-y-2">
            {filteredWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                date={workout.date}
                name={workout.name}
                durationMinutes={workout.durationMinutes}
                totalVolume={workout.totalVolume}
                onClick={() => navigate(`/workouts/${workout.id}`)}
                onNameChange={(newName) => handleNameChange(workout.id!, newName)}
                onDelete={() => handleDeleteClick(workout.id!, workout.name)}
                timerRunning={workout.timerRunning}
                timerAccumulatedMs={workout.timerAccumulatedMs}
                timerLastStartedAt={workout.timerLastStartedAt}
                isCompleted={!!workout.completedAt}
                isHighlighted={workout.date === selectedDate.toISOString().split('T')[0]}
              />
            ))}
            <button
              onClick={handleStartWorkout}
              className="w-full py-2.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-sm font-medium"
            >
              Добавить тренировку
            </button>
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Нет тренировок на этой неделе</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isPastWeek ? (
                <>
                  Внесите прошедшую тренировку или переключитесь на{' '}
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-primary hover:underline font-medium"
                  >
                    текущую неделю
                  </button>
                </>
              ) : isFutureWeek ? (
                <>
                  Запланируйте тренировку или переключитесь на{' '}
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-primary hover:underline font-medium"
                  >
                    текущую неделю
                  </button>
                </>
              ) : (
                'Запланируйте тренировку или переключитесь на другую неделю'
              )}
            </p>
            <button
              onClick={handleStartWorkout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              <Plus className="w-4 h-4" />
              {isPastWeek ? 'Внести прошедшую тренировку' : isFutureWeek ? 'Запланировать тренировку' : 'Начать тренировку'}
            </button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        title="Выберите дату тренировки"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Выберите дату для новой тренировки. Можно запланировать на будущее или внести прошлую тренировку.
          </p>
          <input
            type="date"
            value={newWorkoutDate}
            onChange={(e) => setNewWorkoutDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-lg"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDatePicker(false)}
              className="px-4 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateWorkout}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Создать
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Удалить тренировку?"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Вы уверены, что хотите удалить тренировку "{deleteConfirm?.name}"? 
            Это действие нельзя отменить.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
