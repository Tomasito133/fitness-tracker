import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Check } from 'lucide-react';
import { db, type Exercise } from '../db';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle } from './ui';
import { getMuscleGroupLabel, cn } from '../lib/utils';

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
  selectedIds?: number[];
}

const muscleGroups = [
  'all', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs', 'cardio'
] as const;

export function ExercisePicker({ open, onOpenChange, onSelect, selectedIds = [] }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const exercises = useLiveQuery(() => db.exercises.toArray());

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    
    return exercises.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
      const matchesGroup = selectedGroup === 'all' || ex.muscleGroup === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [exercises, search, selectedGroup]);

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Выбрать упражнение</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск упражнений..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-2 px-2">
          {muscleGroups.map((group) => (
            <Button
              key={group}
              variant={selectedGroup === group ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGroup(group)}
              className="whitespace-nowrap"
            >
              {group === 'all' ? 'Все' : getMuscleGroupLabel(group)}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-1">
          {filteredExercises.map((exercise) => {
            const isSelected = selectedIds.includes(exercise.id!);
            
            return (
              <button
                key={exercise.id}
                onClick={() => handleSelect(exercise)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                  isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'
                )}
              >
                <div>
                  <p className="font-medium">{exercise.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getMuscleGroupLabel(exercise.muscleGroup)}
                  </p>
                </div>
                {isSelected ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Plus className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            );
          })}

          {filteredExercises.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Упражнения не найдены</p>
              <Button variant="link" className="mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Создать своё
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
