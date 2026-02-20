import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, Check, GripVertical } from 'lucide-react';
import { db, type WorkoutSet } from '../db';
import { SetInput } from '../components/SetInput';
import { useAppStore } from '../stores/appStore';
import { formatDurationWithSeconds } from '../lib/utils';
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

interface SortableSetInputProps {
  id: string;
  set: WorkoutSet & { isNew?: boolean };
  index: number;
  previousSet?: { weight: number; reps: number };
  onDelete: () => void;
  onChange: (weight: number, reps: number) => void;
}

function SortableSetInput({ id, set, index, previousSet, onDelete, onChange }: SortableSetInputProps) {
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
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="p-2 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <SetInput
          setNumber={index + 1}
          defaultWeight={set.weight}
          defaultReps={set.reps}
          previousSet={previousSet}
          onDelete={onDelete}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function ExerciseDetail() {
  const navigate = useNavigate();
  const { id, exerciseIndex } = useParams();
  const workoutId = id ? Number(id) : null;
  const currentExerciseIndex = exerciseIndex ? Number(exerciseIndex) : 0;
  
  const { defaultRestSeconds } = useAppStore();
  
  const [sets, setSets] = useState<(WorkoutSet & { isNew?: boolean })[]>([]);
  const [deletedSetIds, setDeletedSetIds] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

  const workout = useLiveQuery(
    () => workoutId ? db.workouts.get(workoutId) : undefined,
    [workoutId]
  );

  const savedSets = useLiveQuery(
    () => workoutId ? db.workoutSets.where('workoutId').equals(workoutId).toArray() : [],
    [workoutId]
  );

  const exercises = useLiveQuery(() => db.exercises.toArray());

  const exerciseIds = useMemo(() => {
    if (!savedSets) return [];
    const ids = [...new Set(savedSets.map(s => s.exerciseId))];
    return ids;
  }, [savedSets]);

  const currentExerciseId = exerciseIds[currentExerciseIndex];
  const currentExercise = exercises?.find(e => e.id === currentExerciseId);

  useEffect(() => {
    if (savedSets && currentExerciseId && !initialized) {
      const exerciseSets = savedSets
        .filter(s => s.exerciseId === currentExerciseId)
        .sort((a, b) => a.setNumber - b.setNumber);
      setSets(exerciseSets);
      setDeletedSetIds([]);
      setInitialized(true);
    }
  }, [savedSets, currentExerciseId, initialized]);

  // Reset initialized when exercise changes
  useEffect(() => {
    setInitialized(false);
  }, [currentExerciseId]);

  const currentTimeMs = useMemo(() => {
    if (!workout) return 0;
    if (workout.completedAt) {
      return workout.timerAccumulatedMs || 0;
    }
    if (workout.timerRunning && workout.timerLastStartedAt) {
      const accumulated = workout.timerAccumulatedMs || 0;
      const elapsed = Date.now() - new Date(workout.timerLastStartedAt).getTime();
      return accumulated + elapsed;
    }
    return workout.timerAccumulatedMs || 0;
  }, [workout]);

  const [displayTime, setDisplayTime] = useState(currentTimeMs);

  useEffect(() => {
    // Don't run timer for completed workouts
    if (workout?.completedAt || !workout?.timerRunning) {
      setDisplayTime(currentTimeMs);
      return;
    }
    const interval = setInterval(() => {
      if (workout.timerLastStartedAt) {
        const accumulated = workout.timerAccumulatedMs || 0;
        const elapsed = Date.now() - new Date(workout.timerLastStartedAt).getTime();
        setDisplayTime(accumulated + elapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [workout, currentTimeMs]);

  const handleAddSet = () => {
    if (!workoutId || !currentExerciseId) return;
    
    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    
    const newSet: WorkoutSet & { isNew?: boolean } = {
      workoutId,
      exerciseId: currentExerciseId,
      setNumber: newSetNumber,
      weight: lastSet?.weight || 0,
      reps: 0,
      restSeconds: defaultRestSeconds,
      completedAt: new Date(),
      isNew: true,
    };
    
    setSets([...sets, newSet]);
  };

  const handleSetChange = (setIndex: number, weight: number, reps: number) => {
    const set = sets[setIndex];
    if (!set) return;
    
    const updated = [...sets];
    updated[setIndex] = { ...set, weight, reps };
    setSets(updated);
  };

  const handleDeleteSet = (setIndex: number) => {
    const set = sets[setIndex];
    if (set.id && !set.isNew) {
      setDeletedSetIds(prev => [...prev, set.id!]);
    }
    const updated = sets.filter((_, i) => i !== setIndex);
    updated.forEach((s, i) => s.setNumber = i + 1);
    setSets(updated);
  };

  const handleSave = async () => {
    // Delete removed sets
    for (const id of deletedSetIds) {
      await db.workoutSets.delete(id);
    }
    
    // Save all sets
    for (const set of sets) {
      if (set.isNew) {
        await db.workoutSets.add({
          workoutId: set.workoutId,
          exerciseId: set.exerciseId,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          restSeconds: set.restSeconds,
          completedAt: set.completedAt,
        });
      } else if (set.id) {
        await db.workoutSets.update(set.id, {
          weight: set.weight,
          reps: set.reps,
          setNumber: set.setNumber,
        });
      }
    }
    
    goBack();
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sets.findIndex(s => getSetId(s, sets.indexOf(s)) === active.id);
      const newIndex = sets.findIndex(s => getSetId(s, sets.indexOf(s)) === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSets = arrayMove(sets, oldIndex, newIndex);
        newSets.forEach((s, i) => s.setNumber = i + 1);
        setSets(newSets);
      }
    }
  };

  const getSetId = (set: WorkoutSet & { isNew?: boolean }, index: number) => {
    return set.id ? `set-${set.id}` : `new-${index}`;
  };

  const goToExercise = (index: number) => {
    if (index >= 0 && index < exerciseIds.length) {
      navigate(`/workouts/${workoutId}/exercise/${index}`, { replace: true });
    }
  };

  const goBack = () => {
    navigate(`/workouts/${workoutId}`);
  };

  if (!workout || !currentExercise) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500 to-red-500 -mx-4 -mt-4 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/80 text-sm">
            {currentExerciseIndex + 1} / {exerciseIds.length}
          </span>
          <span className="text-white text-xl font-bold">
            {formatDurationWithSeconds(displayTime)}
          </span>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Exercise Card */}
      <div className="bg-card rounded-t-3xl -mt-4 pt-6 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] min-h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => goBack()}
            className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-accent transition-colors">
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold mb-1">{currentExercise.name}</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            {currentExercise.muscleGroup === 'back' ? 'Широчайшие' : currentExercise.muscleGroup}
          </p>
        </div>

        {/* Sets List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sets.map((s, i) => getSetId(s, i))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {sets.map((set, index) => (
                <SortableSetInput
                  key={getSetId(set, index)}
                  id={getSetId(set, index)}
                  set={set}
                  index={index}
                  previousSet={index > 0 ? sets[index - 1] : undefined}
                  onDelete={() => handleDeleteSet(index)}
                  onChange={(weight, reps) => handleSetChange(index, weight, reps)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        </div>

      {/* Bottom Navigation */}
      <div className="fixed left-0 right-0 bg-background border-t border-border p-4 flex items-center justify-between z-40 bottom-[calc(4rem+env(safe-area-inset-bottom))]">
        <button
          onClick={() => goToExercise(currentExerciseIndex - 1)}
          disabled={currentExerciseIndex === 0}
          className="p-3 rounded-full hover:bg-accent transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={handleAddSet}
          className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button 
          onClick={handleSave}
          className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          Сохранить
        </button>
        
        <button
          onClick={() => goToExercise(currentExerciseIndex + 1)}
          disabled={currentExerciseIndex >= exerciseIds.length - 1}
          className="p-3 rounded-full hover:bg-accent transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
