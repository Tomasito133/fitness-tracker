import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronDown, MoreHorizontal, Heart, Share2, Pencil, Dumbbell, GripVertical, Check, Trash2 } from 'lucide-react';
import { db, type Exercise, type WorkoutSet } from '../db';
import { Button } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { useAppStore } from '../stores/appStore';
import { formatDuration, formatDurationWithSeconds, formatShortDate } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ExerciseWithSets {
  exercise: Exercise;
  sets: (WorkoutSet & { isNew?: boolean })[];
}

interface SortableExerciseItemProps {
  id: string;
  exerciseData: ExerciseWithSets;
  exerciseIndex: number;
  isEditing: boolean;
  onClick: () => void;
  onDelete?: () => void;
  formatSetsCompact: (sets: WorkoutSet[]) => string;
}

function SortableExerciseItem({ 
  id, 
  exerciseData, 
  exerciseIndex, 
  isEditing,
  onClick,
  onDelete,
  formatSetsCompact,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 py-4 border-b border-border/50 items-center ${isEditing ? 'cursor-pointer hover:bg-accent/30 transition-colors' : ''}`}
    >
      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing touch-none self-center shrink-0"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
      <div 
        className="flex gap-4 flex-1 min-w-0"
        onClick={onClick}
      >
        <span className="text-muted-foreground w-6 shrink-0">{exerciseIndex + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{exerciseData.exercise.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatSetsCompact(exerciseData.sets) || 'Нажмите для добавления подходов'}
          </p>
        </div>
      </div>
      {isEditing && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 rounded-full hover:bg-destructive/10 text-destructive shrink-0"
          title="Удалить упражнение"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function ActiveWorkout() {
  const navigate = useNavigate();
  const { id } = useParams();
  const workoutId = id ? Number(id) : null;
  
  const { defaultRestSeconds } = useAppStore();
  
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
  const [saveJustCompleted, setSaveJustCompleted] = useState(false);

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
    if (savedSets && savedSets.length > 0 && exercises && workout) {
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
      
      let list = Object.values(grouped);
      const order = workout.exerciseOrder;
      if (order && order.length > 0) {
        const byId = new Map(list.map(e => [e.exercise.id!, e]));
        const ordered: ExerciseWithSets[] = [];
        for (const id of order) {
          const item = byId.get(id);
          if (item) ordered.push(item);
        }
        const rest = list.filter(e => !order.includes(e.exercise.id!));
        list = [...ordered, ...rest];
      }
      setExercisesWithSets(list);
    }
  }, [savedSets, exercises, workout]);

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

  const handleRemoveExercise = async (exerciseData: ExerciseWithSets) => {
    if (!workoutId) return;
    const exerciseId = exerciseData.exercise.id!;
    const setsToDelete = await db.workoutSets.where('workoutId').equals(workoutId).filter((s) => s.exerciseId === exerciseId).toArray();
    await db.workoutSets.bulkDelete(setsToDelete.map((s) => s.id!));
    setExercisesWithSets((prev) => prev.filter((e) => e.exercise.id !== exerciseId));
  };

  const handleSaveWorkout = async (onAfterSaveAnimation?: () => void) => {
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
    const order = exercisesWithSets.map(e => e.exercise.id!);
    await db.workouts.update(workoutId, { exerciseOrder: order });
    setSaveJustCompleted(true);
    window.setTimeout(() => {
      setSaveJustCompleted(false);
      onAfterSaveAnimation?.();
    }, 1800);
  };

  const handleFinishWorkout = async () => {
    // Stop timer if running
    let finalAccumulatedMs = accumulatedTimeMs;
    if (isWorkoutRunning && lastStartTime) {
      const elapsed = Date.now() - lastStartTime.getTime();
      finalAccumulatedMs = accumulatedTimeMs + elapsed;
      setAccumulatedTimeMs(finalAccumulatedMs);
      setIsWorkoutRunning(false);
      setLastStartTime(null);
    }
    
    await handleSaveWorkout();
    if (workoutId) {
      // Save final timer accumulated time along with completedAt
      await db.workouts.update(workoutId, { 
        completedAt: new Date(),
        timerAccumulatedMs: finalAccumulatedMs,
        timerRunning: false,
        timerLastStartedAt: undefined,
      });
    }
    setIsEditing(false);
  };

  const totalVolume = exercisesWithSets.reduce(
    (sum, e) => sum + e.sets.filter(s => !s.isNew).reduce((s, set) => s + set.weight * set.reps, 0),
    0
  );

  const durationMinutes = useMemo(() => {
    if (!workout) return 0;
    // For completed workouts, use saved timer accumulated time
    if (workout.completedAt) {
      if (workout.timerAccumulatedMs) {
        return Math.round(workout.timerAccumulatedMs / 60000);
      }
      // Fallback for old workouts without timerAccumulatedMs
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getExerciseId = (exerciseData: ExerciseWithSets) => {
    return `exercise-${exerciseData.exercise.id}`;
  };

  const handleExerciseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = exercisesWithSets.findIndex(e => getExerciseId(e) === active.id);
      const newIndex = exercisesWithSets.findIndex(e => getExerciseId(e) === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(exercisesWithSets, oldIndex, newIndex);
        setExercisesWithSets(newOrder);
        
        // Update set numbers in DB to reflect new order
        for (let i = 0; i < newOrder.length; i++) {
          for (const set of newOrder[i].sets) {
            if (set.id) {
              // Update exerciseId order is preserved through the sets themselves
            }
          }
        }
      }
    }
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

      {/* Exercises List - Compact View */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleExerciseDragEnd}
      >
        <SortableContext
          items={exercisesWithSets.map(e => getExerciseId(e))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0">
            {exercisesWithSets.map((exerciseData, exerciseIndex) => (
              <SortableExerciseItem
                key={getExerciseId(exerciseData)}
                id={getExerciseId(exerciseData)}
                exerciseData={exerciseData}
                exerciseIndex={exerciseIndex}
                isEditing={isEditing}
                onClick={() => isEditing && navigate(`/workouts/${workoutId}/exercise/${exerciseIndex}`)}
                onDelete={() => handleRemoveExercise(exerciseData)}
                formatSetsCompact={formatSetsCompact}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
        {isEditing && !workout.completedAt ? (
          <>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleSaveWorkout()}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                saveJustCompleted
                  ? 'bg-green-500 text-white scale-105'
                  : 'border border-border bg-background hover:bg-accent'
              }`}
            >
              {saveJustCompleted ? (
                <>
                  <Check className="w-5 h-5" />
                  Сохранено
                </>
              ) : (
                'Сохранить'
              )}
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
        ) : isEditing && workout.completedAt ? (
          <>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={async () => {
                await handleSaveWorkout(() => setIsEditing(false));
              }}
              className={`px-8 py-3 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 min-w-[120px] ${
                saveJustCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {saveJustCompleted ? (
                <>
                  <Check className="w-5 h-5" />
                  Сохранено
                </>
              ) : (
                'Сохранить'
              )}
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
