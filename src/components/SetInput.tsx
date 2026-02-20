import { useState } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import { Button, Input } from './ui';
import { cn } from '../lib/utils';

interface SetInputProps {
  setNumber: number;
  defaultWeight?: number;
  defaultReps?: number;
  isCompleted?: boolean;
  onComplete: (weight: number, reps: number) => void;
  onDelete?: () => void;
  previousSet?: { weight: number; reps: number };
}

export function SetInput({
  setNumber,
  defaultWeight = 0,
  defaultReps = 0,
  isCompleted = false,
  onComplete,
  onDelete,
  previousSet,
}: SetInputProps) {
  const [weight, setWeight] = useState(defaultWeight || previousSet?.weight || 0);
  const [reps, setReps] = useState(defaultReps || previousSet?.reps || 0);
  const [isEditing, setIsEditing] = useState(!isCompleted);

  const handleComplete = () => {
    if (reps > 0) {
      onComplete(weight, reps);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isCompleted && !isEditing
          ? 'bg-primary/5 border-primary/20'
          : 'bg-card border-border'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
        {setNumber}
      </div>

      {isEditing ? (
        <>
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Вес (кг)</label>
              <Input
                type="number"
                value={weight || ''}
                onChange={(e) => setWeight(Number(e.target.value))}
                placeholder="0"
                className="h-9 text-center"
                inputMode="decimal"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Повторения</label>
              <Input
                type="number"
                value={reps || ''}
                onChange={(e) => setReps(Number(e.target.value))}
                placeholder="0"
                className="h-9 text-center"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleComplete}
              disabled={reps <= 0}
              className="text-green-600 hover:text-green-700 hover:bg-green-100"
            >
              <Check className="w-5 h-5" />
            </Button>
            {isCompleted && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={handleEdit}
            className="flex-1 flex gap-4 text-left"
          >
            <div>
              <p className="text-xs text-muted-foreground">Вес</p>
              <p className="font-semibold">{weight} кг</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Повторения</p>
              <p className="font-semibold">{reps}</p>
            </div>
          </button>

          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          <Check className="w-5 h-5 text-primary" />
        </>
      )}
    </div>
  );
}
