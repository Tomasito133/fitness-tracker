import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronDown, MoreHorizontal, Heart, Share2, Pencil, Trash2, Dumbbell } from 'lucide-react';
import { db, type Exercise, type WorkoutSet } from '../db';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { RestTimer } from '../components/RestTimer';
import { ExercisePicker } from '../components/ExercisePicker';
import { SetInput } from '../components/SetInput';
import { useRestTimer } from '../hooks/useRestTimer';
import { useAppStore } from '../stores/appStore';
import { formatDuration, formatDurationWithSeconds, formatShortDate, getMuscleGroupLabel } from '../lib/utils';

interface ExerciseWithSets {
  exercise: Exercise;
  sets: (WorkoutSet & { isNew?: boolean })[];
}

export function ActiveWorkout() {
  const navigate = useNavigate();
  const { id } = useParams();
  const workoutId = id ? Number(id) : null;
  
  const { defaultRestSeconds } = useAppStore();
  const restTimer = useRestTimer({ defaultSeconds: defaultRestSeconds });
  
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exercisesWithSets, setExercisesWithSets] = useState<ExerciseWithSets[]>([]);
  const [isEditing, setIsEditing] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Workout timer states
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [accumulatedTimeMs, setAccumulatedTimeMs] = useState(0);
  const [lastStartTime, setLastStartTime] = useState<Date | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [timerRestored, setTimerRestored] = useState(false);

  const workout = useLiveQuery(
    () => workoutId ? db.workouts.get(workoutId) : undefined,
    [workoutId]
  );

  const savedSets = useLiveQuery(
    () => workoutId ? db.workoutSets.where('workoutId').equals(workoutId).toArray() : [],
    [workoutId]
  );

  const exercises = useLiveQuery(() => db.exercises.toArray());

  useEffect(() => {
    if (workout) {
      setIsEditing(!workout.completedAt);
    }
  }, [workout]);

  // Restore timer state from DB
  useEffect(() => {
    if (workout && !timerRestored && !workout.completedAt) {
      if (workout.timerRunning && workout.timerLastStartedAt) {
        // Timer was running - calculate elapsed time since last start
        const lastStart = new Date(workout.timerLastStartedAt);
        const elapsed = Date.now() - lastStart.getTime();
        const totalAccumulated = (workout.timerAccumulatedMs || 0) + elapsed;
        
        setAccumulatedTimeMs(workout.timerAccumulatedMs || 0);
        setLastStartTime(lastStart);
        setCurrentTimeMs(totalAccumulated);
        setIsWorkoutRunning(true);
      } else if (workout.timerAccumulatedMs && workout.timerAccumulatedMs > 0) {
        // Timer was paused - restore accumulated time
        setAccumulatedTimeMs(workout.timerAccumulatedMs);
        setCurrentTimeMs(workout.timerAccumulatedMs);
        setIsWorkoutRunning(false);
      }
      setTimerRestored(true);
    }
  }, [workout, timerRestored]);

  useEffect(() => {
    if (workout?.name) {
      setWorkoutName(workout.name);
    }
  }, [workout?.name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Update timer every second when workout is running
  useEffect(() => {
    if (!isWorkoutRunning || !lastStartTime) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastStartTime.getTime();
      setCurrentTimeMs(accumulatedTimeMs + elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isWorkoutRunning, lastStartTime, accumulatedTimeMs]);

  const handleStartWorkout = async () => {
    const now = new Date();
    setLastStartTime(now);
    setIsWorkoutRunning(true);
    
    // Save to DB
    if (workoutId) {
      await db.workouts.update(workoutId, {
        timerRunning: true,
        timerLastStartedAt: now,
        timerAccumulatedMs: accumulatedTimeMs,
      });
    }
  };

  const handlePauseWorkout = async () => {
    let newAccumulated = accumulatedTimeMs;
    if (lastStartTime) {
      const elapsed = Date.now() - lastStartTime.getTime();
      newAccumulated = accumulatedTimeMs + elapsed;
      setAccumulatedTimeMs(newAccumulated);
      setCurrentTimeMs(newAccumulated);
    }
    setIsWorkoutRunning(false);
    setLastStartTime(null);
    
    // Save to DB
    if (workoutId) {
      await db.workouts.update(workoutId, {
        timerRunning: false,
        timerLastStartedAt: undefined,
        timerAccumulatedMs: newAccumulated,
      });
    }
  };

  const handleResumeWorkout = async () => {
    const now = new Date();
    setLastStartTime(now);
    setIsWorkoutRunning(true);
    
    // Save to DB
    if (workoutId) {
      await db.workouts.update(workoutId, {
        timerRunning: true,
        timerLastStartedAt: now,
        timerAccumulatedMs: accumulatedTimeMs,
      });
    }
  };

  const handleSaveName = async () => {
    const trimmedName = workoutName.trim() || 'Тренировка';
    if (workoutId && trimmedName !== workout?.name) {
      await db.workouts.update(workoutId, { name: trimmedName });
    }
    setWorkoutName(trimmedName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setWorkoutName(workout?.name || 'Тренировка');
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (savedSets && savedSets.length > 0 && exercises) {
      const grouped = savedSets.reduce((acc, set) => {
        if (!acc[set.exerciseId]) {
          const exercise = exercises.find(e => e.id === set.exerciseId);
          if (exercise) {
            acc[set.exerciseId] = { exercise, sets: [] };
          }
        }
        if (acc[set.exerciseId]) {
          acc[set.exerciseId].sets.push(set);
        }
        return acc;
      }, {} as Record<number, ExerciseWithSets>);
      
      setExercisesWithSets(Object.values(grouped));
    }
  }, [savedSets, exercises]);

  const selectedExerciseIds = useMemo(
    () => exercisesWithSets.map(e => e.exercise.id!),
    [exercisesWithSets]
  );

  const handleAddExercise = async (exercise: Exercise) => {
    const existing = exercisesWithSets.find(e => e.exercise.id === exercise.id);
    if (!existing && workoutId) {
      const newSetId = await db.workoutSets.add({
        workoutId,
        exerciseId: exercise.id!,
        setNumber: 1,
        weight: 0,
        reps: 0,
        restSeconds: defaultRestSeconds,
        completedAt: new Date(),
      });
      
      setExercisesWithSets([...exercisesWithSets, { 
        exercise, 
        sets: [{
          id: newSetId as number,
          workoutId,
          exerciseId: exercise.id!,
          setNumber: 1,
          weight: 0,
          reps: 0,
          restSeconds: defaultRestSeconds,
          completedAt: new Date(),
          isNew: false,
        }] 
      }]);
    }
    setShowExercisePicker(false);
  };

  const handleAddSet = async (exerciseIndex: number) => {
    if (!workoutId) return;
    
    const updated = [...exercisesWithSets];
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    const newSetNumber = updated[exerciseIndex].sets.length + 1;
    
    const newSetId = await db.workoutSets.add({
      workoutId,
      exerciseId: updated[exerciseIndex].exercise.id!,
      setNumber: newSetNumber,
      weight: lastSet?.weight || 0,
      reps: 0,
      restSeconds: defaultRestSeconds,
      completedAt: new Date(),
    });
    
    updated[exerciseIndex].sets.push({
      id: newSetId as number,
      workoutId,
      exerciseId: updated[exerciseIndex].exercise.id!,
      setNumber: newSetNumber,
      reps: 0,
      weight: lastSet?.weight || 0,
      restSeconds: defaultRestSeconds,
      completedAt: new Date(),
      isNew: false,
    });
    
    setExercisesWithSets(updated);
  };

  const handleSetChange = async (exerciseIndex: number, setIndex: number, weight: number, reps: number) => {
    const updated = [...exercisesWithSets];
    const set = updated[exerciseIndex].sets[setIndex];
    
    set.weight = weight;
    set.reps = reps;

    if (set.id) {
      await db.workoutSets.update(set.id, { weight, reps });
    }

    setExercisesWithSets(updated);
  };

  const handleCompleteSet = async (exerciseIndex: number, setIndex: number, weight: number, reps: number) => {
    const updated = [...exercisesWithSets];
    const set = updated[exerciseIndex].sets[setIndex];
    
    set.weight = weight;
    set.reps = reps;
    set.completedAt = new Date();
    set.isNew = false;

    if (set.id) {
      await db.workoutSets.update(set.id, { weight, reps, completedAt: set.completedAt });
    }

    setExercisesWithSets(updated);
    restTimer.start();
  };

  const handleDeleteSet = async (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercisesWithSets];
    const set = updated[exerciseIndex].sets[setIndex];
    
    if (set.id) {
      await db.workoutSets.delete(set.id);
    }
    
    updated[exerciseIndex].sets.splice(setIndex, 1);
    updated[exerciseIndex].sets.forEach((s, i) => s.setNumber = i + 1);
    
    setExercisesWithSets(updated);
  };

  const handleRemoveExercise = async (exerciseIndex: number) => {
    const updated = [...exercisesWithSets];
    const exerciseData = updated[exerciseIndex];
    
    for (const set of exerciseData.sets) {
      if (set.id) {
        await db.workoutSets.delete(set.id);
      }
    }
    
    updated.splice(exerciseIndex, 1);
    setExercisesWithSets(updated);
  };

  const handleSaveWorkout = async () => {
    if (!workoutId) return;
    
    for (const exerciseData of exercisesWithSets) {
      for (const set of exerciseData.sets) {
        if (!set.id) {
          const newId = await db.workoutSets.add({
            workoutId,
            exerciseId: set.exerciseId,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            restSeconds: set.restSeconds,
            completedAt: set.completedAt,
          });
          set.id = newId as number;
          set.isNew = false;
        } else if (set.id) {
          await db.workoutSets.update(set.id, {
            weight: set.weight,
            reps: set.reps,
            completedAt: set.completedAt,
          });
        }
      }
    }
  };

  const handleFinishWorkout = async () => {
    // Stop timer if running
    if (isWorkoutRunning && lastStartTime) {
      const elapsed = Date.now() - lastStartTime.getTime();
      setAccumulatedTimeMs(prev => prev + elapsed);
      setIsWorkoutRunning(false);
      setLastStartTime(null);
    }
    
    await handleSaveWorkout();
    if (workoutId) {
      await db.workouts.update(workoutId, { completedAt: new Date() });
    }
    setIsEditing(false);
  };

  const totalVolume = exercisesWithSets.reduce(
    (sum, e) => sum + e.sets.filter(s => !s.isNew).reduce((s, set) => s + set.weight * set.reps, 0),
    0
  );

  const durationMinutes = useMemo(() => {
    if (!workout) return 0;
    // For completed workouts, use saved duration
    if (workout.completedAt) {
      const start = new Date(workout.startedAt).getTime();
      const end = new Date(workout.completedAt).getTime();
      return Math.round((end - start) / 60000);
    }
    // For active workouts, use timer state
    return Math.round(currentTimeMs / 60000);
  }, [workout, currentTimeMs]);

  const startTime = workout?.startedAt ? new Date(workout.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

  const formatSetsCompact = (sets: WorkoutSet[]) => {
    return sets
      .filter(s => s.reps > 0)
      .map(s => `${s.weight} кг × ${s.reps}`)
      .join(', ');
  };

  if (!workout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-40">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500 to-red-500 -mx-4 -mt-4 px-4 pt-4 pb-6 rounded-b-3xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/workouts')}
            className="flex items-center gap-1 text-white/80 hover:text-white"
          >
            <ChevronDown className="w-5 h-5" />
            {formatShortDate(workout.date)}, {startTime}
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>

        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleNameKeyDown}
            className="text-3xl font-bold text-white bg-transparent border-b-2 border-white/50 outline-none w-full"
            placeholder="Название тренировки"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-left w-full"
          >
            <h1 className="text-3xl font-bold text-white">
              {workoutName || workout.name || 'Тренировка'}
            </h1>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Время</p>
          <p className="text-2xl font-bold">
            {workout.completedAt 
              ? formatDuration(durationMinutes) 
              : formatDurationWithSeconds(currentTimeMs)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Объём</p>
          <p className="text-2xl font-bold">{totalVolume.toLocaleString('ru-RU')} кг</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            Ср. <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          </p>
          <p className="text-2xl font-bold text-muted-foreground">—</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Калории</p>
          <p className="text-2xl font-bold text-muted-foreground">—</p>
        </div>
      </div>

      {/* Rest Timer (only in edit mode) */}
      {isEditing && (
        <div className="mb-6">
          <RestTimer
            seconds={restTimer.seconds}
            isRunning={restTimer.isRunning}
            progress={restTimer.progress}
            onStart={restTimer.start}
            onPause={restTimer.pause}
            onResume={restTimer.resume}
            onReset={restTimer.reset}
            onAddTime={restTimer.addTime}
          />
        </div>
      )}

      {/* Exercises List */}
      <div className="space-y-4">
        {exercisesWithSets.map((exerciseData, exerciseIndex) => (
          <div key={exerciseData.exercise.id}>
            {isEditing ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{exerciseData.exercise.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getMuscleGroupLabel(exerciseData.exercise.muscleGroup)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExercise(exerciseIndex)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {exerciseData.sets.map((set, setIndex) => (
                    <SetInput
                      key={`${set.id || 'new'}-${setIndex}`}
                      setNumber={set.setNumber}
                      defaultWeight={set.weight}
                      defaultReps={set.reps}
                      isCompleted={!set.isNew && set.reps > 0}
                      onComplete={(weight, reps) => handleCompleteSet(exerciseIndex, setIndex, weight, reps)}
                      onChange={(weight, reps) => handleSetChange(exerciseIndex, setIndex, weight, reps)}
                      onDelete={() => handleDeleteSet(exerciseIndex, setIndex)}
                      previousSet={setIndex > 0 ? {
                        weight: exerciseData.sets[setIndex - 1].weight,
                        reps: exerciseData.sets[setIndex - 1].reps,
                      } : undefined}
                    />
                  ))}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAddSet(exerciseIndex)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить подход
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex gap-4 py-3 border-b border-border/50">
                <span className="text-muted-foreground w-6 shrink-0">{exerciseIndex + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{exerciseData.exercise.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatSetsCompact(exerciseData.sets) || 'Нет подходов'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Exercise Button (edit mode) */}
      {isEditing && (
        <Button
          variant="outline"
          className="w-full h-14 border-dashed mt-6"
          onClick={() => setShowExercisePicker(true)}
        >
          <Dumbbell className="w-5 h-5 mr-2" />
          Добавить упражнение
        </Button>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4 flex items-center justify-center gap-3 z-40">
        {isEditing ? (
          <>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
            {isWorkoutRunning ? (
              <button
                onClick={handlePauseWorkout}
                className="px-6 py-3 rounded-full font-medium transition-all duration-300 transform bg-yellow-500 text-white hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                  Остановить
                </span>
              </button>
            ) : accumulatedTimeMs > 0 ? (
              <button
                onClick={handleResumeWorkout}
                className="px-6 py-3 rounded-full font-medium transition-all duration-300 transform bg-green-500 text-white hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Продолжить
                </span>
              </button>
            ) : (
              <button
                onClick={handleStartWorkout}
                className="px-6 py-3 rounded-full font-medium transition-all duration-300 transform bg-green-500 text-white hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Начать
                </span>
              </button>
            )}
            <button
              onClick={handleFinishWorkout}
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium"
            >
              Завершить
            </button>
          </>
        ) : (
          <>
            <button className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Редактировать
            </button>
          </>
        )}
      </div>

      <ExercisePicker
        open={showExercisePicker}
        onOpenChange={setShowExercisePicker}
        onSelect={handleAddExercise}
        selectedIds={selectedExerciseIds}
      />
    </div>
  );
}
