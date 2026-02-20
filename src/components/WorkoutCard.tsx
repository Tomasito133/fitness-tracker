import { useState, useRef, useEffect } from 'react';
import { Clock, Weight, Heart, Flame, Pencil, Trash2 } from 'lucide-react';
import { getDayOfWeekName, formatDuration, formatDurationWithSeconds, cn } from '../lib/utils';

interface WorkoutCardProps {
  date: string;
  name: string;
  durationMinutes: number;
  totalVolume: number;
  heartRate?: number;
  calories?: number;
  onClick?: () => void;
  onNameChange?: (newName: string) => void;
  onDelete?: () => void;
  // Timer state for active workouts
  timerRunning?: boolean;
  timerAccumulatedMs?: number;
  timerLastStartedAt?: Date;
  isCompleted?: boolean;
  isHighlighted?: boolean;
}

export function WorkoutCard({
  date,
  name,
  durationMinutes,
  totalVolume,
  heartRate,
  calories,
  onClick,
  onNameChange,
  onDelete,
  timerRunning,
  timerAccumulatedMs,
  timerLastStartedAt,
  isCompleted,
  isHighlighted,
}: WorkoutCardProps) {
  const dayName = getDayOfWeekName(date);
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showActions, setShowActions] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update timer every second for active workouts
  useEffect(() => {
    if (isCompleted || !timerRunning || !timerLastStartedAt) {
      // For non-running workouts, just show accumulated time
      setCurrentTimeMs(timerAccumulatedMs || 0);
      return;
    }

    const updateTime = () => {
      const accumulated = timerAccumulatedMs || 0;
      const elapsed = Date.now() - new Date(timerLastStartedAt).getTime();
      setCurrentTimeMs(accumulated + elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerAccumulatedMs, timerLastStartedAt, isCompleted]);

  const isActiveWorkout = !isCompleted && (timerRunning || (timerAccumulatedMs && timerAccumulatedMs > 0));

  const handleSave = () => {
    const trimmedName = editedName.trim() || 'Тренировка';
    if (trimmedName !== name && onNameChange) {
      onNameChange(trimmedName);
    }
    setEditedName(trimmedName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedName(name);
      setIsEditing(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div
      className={cn(
        'relative flex bg-card rounded-xl overflow-hidden transition-all',
        onClick && !isEditing && 'cursor-pointer hover:bg-accent/50',
        isHighlighted && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={isEditing ? undefined : onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{capitalizedDay}</p>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="text-lg font-bold bg-transparent border-b-2 border-primary outline-none w-full"
                placeholder="Название тренировки"
              />
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 className="text-lg font-bold truncate">{name || 'Тренировка'}</h3>
                {onNameChange && (
                  <button
                    onClick={handleEditClick}
                    className="p-1 rounded-full hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className={cn(
                'p-1.5 rounded-full hover:bg-destructive/10 transition-all shrink-0 -mr-1 -mt-1',
                showActions ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>
              {isActiveWorkout 
                ? formatDurationWithSeconds(currentTimeMs)
                : formatDuration(durationMinutes)}
            </span>
          </div>
          
          <span className="text-muted-foreground/50">•</span>
          
          <div className="flex items-center gap-1">
            <Weight className="w-4 h-4" />
            <span>{totalVolume.toLocaleString('ru-RU')} кг</span>
          </div>
          
          {heartRate && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{heartRate}</span>
              </div>
            </>
          )}
          
          {calories && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4" />
                <span>{calories}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
