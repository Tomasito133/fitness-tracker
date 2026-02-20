import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, Trophy, MoreHorizontal } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from '../components/ui';
import { WeekCalendar } from '../components/WeekCalendar';
import { SortableWorkoutCard } from '../components/SortableWorkoutCard';
import { db, seedExercises } from '../db';
import { groupByWeek, getTodayString } from '../lib/utils';
import { Dialog } from '../components/ui/Dialog';

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

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
    
    return sorted.map((workout, index) => {
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
    const maxSortOrder = workouts?.reduce((max, w) => Math.max(max, w.sortOrder || 0), 0) || 0;
    const workoutId = await db.workouts.add({
      name: 'Тренировка',
      date: today,
      startedAt: new Date(),
      sortOrder: maxSortOrder + 1,
    });
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = workoutsWithStats.findIndex(w => w.id === active.id);
      const newIndex = workoutsWithStats.findIndex(w => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...workoutsWithStats];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        await db.transaction('rw', db.workouts, async () => {
          for (let i = 0; i < reordered.length; i++) {
            await db.workouts.update(reordered[i].id!, { sortOrder: i });
          }
        });
      }
    }
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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

                <SortableContext
                  items={group.items.map(w => w.id!)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {group.items.map((workout) => (
                      <SortableWorkoutCard
                        key={workout.id}
                        id={workout.id!}
                        date={workout.date}
                        name={workout.name}
                        durationMinutes={workout.durationMinutes}
                        totalVolume={workout.totalVolume}
                        accentColor={workout.accentColor}
                        onClick={() => navigate(`/workouts/${workout.id}`)}
                        onNameChange={(newName) => handleNameChange(workout.id!, newName)}
                        onDelete={() => handleDeleteClick(workout.id!, workout.name)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
        </DndContext>
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
