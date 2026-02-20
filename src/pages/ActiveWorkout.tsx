import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Check, ChevronLeft, Clock, Dumbbell, Trash2 } from 'lucide-react';
import { db, type Exercise, type WorkoutSet } from '../db';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { RestTimer } from '../components/RestTimer';
import { ExercisePicker } from '../components/ExercisePicker';
import { SetInput } from '../components/SetInput';
import { useRestTimer } from '../hooks/useRestTimer';
import { useAppStore } from '../stores/appStore';
import { getMuscleGroupLabel, formatTime } from '../lib/utils';

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
  const [workoutStartTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutStartTime]);

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

  const handleAddExercise = (exercise: Exercise) => {
    const existing = exercisesWithSets.find(e => e.exercise.id === exercise.id);
    if (!existing) {
      setExercisesWithSets([...exercisesWithSets, { exercise, sets: [] }]);
    }
    setShowExercisePicker(false);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...exercisesWithSets];
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    
    updated[exerciseIndex].sets.push({
      id: undefined,
      workoutId: workoutId || 0,
      exerciseId: updated[exerciseIndex].exercise.id!,
      setNumber: updated[exerciseIndex].sets.length + 1,
      reps: 0,
      weight: lastSet?.weight || 0,
      restSeconds: defaultRestSeconds,
      completedAt: new Date(),
      isNew: true,
    });
    
    setExercisesWithSets(updated);
  };

  const handleCompleteSet = async (exerciseIndex: number, setIndex: number, weight: number, reps: number) => {
    const updated = [...exercisesWithSets];
    const set = updated[exerciseIndex].sets[setIndex];
    
    set.weight = weight;
    set.reps = reps;
    set.completedAt = new Date();
    set.isNew = false;

    if (workoutId) {
      if (set.id) {
        await db.workoutSets.update(set.id, { weight, reps, completedAt: set.completedAt });
      } else {
        const newId = await db.workoutSets.add({
          workoutId,
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          weight,
          reps,
          restSeconds: defaultRestSeconds,
          completedAt: set.completedAt,
        });
        set.id = newId as number;
      }
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

  const handleFinishWorkout = async () => {
    if (workoutId) {
      await db.workouts.update(workoutId, { completedAt: new Date() });
    }
    navigate('/workouts');
  };

  const totalSets = exercisesWithSets.reduce((sum, e) => sum + e.sets.filter(s => !s.isNew && s.reps > 0).length, 0);
  const totalVolume = exercisesWithSets.reduce(
    (sum, e) => sum + e.sets.filter(s => !s.isNew).reduce((s, set) => s + set.weight * set.reps, 0),
    0
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/workouts')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
          Назад
        </button>
        <Button onClick={handleFinishWorkout} disabled={totalSets === 0}>
          <Check className="w-4 h-4 mr-2" />
          Завершить
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {workout?.name || 'Новая тренировка'}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(elapsedSeconds)}
          </span>
          <span>{totalSets} подходов</span>
          <span>{totalVolume.toLocaleString()} кг</span>
        </div>
      </div>

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

      {exercisesWithSets.map((exerciseData, exerciseIndex) => (
        <Card key={exerciseData.exercise.id}>
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
      ))}

      <Button
        variant="outline"
        className="w-full h-14 border-dashed"
        onClick={() => setShowExercisePicker(true)}
      >
        <Dumbbell className="w-5 h-5 mr-2" />
        Добавить упражнение
      </Button>

      <ExercisePicker
        open={showExercisePicker}
        onOpenChange={setShowExercisePicker}
        onSelect={handleAddExercise}
        selectedIds={selectedExerciseIds}
      />
    </div>
  );
}
