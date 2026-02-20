import { useState, useRef, useEffect } from 'react';
import { Clock, Weight, Heart, Flame, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { getDayOfWeekName, formatDuration, cn } from '../lib/utils';

interface WorkoutCardProps {
  date: string;
  name: string;
  durationMinutes: number;
  totalVolume: number;
  heartRate?: number;
  calories?: number;
  accentColor?: string;
  onClick?: () => void;
  onNameChange?: (newName: string) => void;
  onDelete?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export function WorkoutCard({
  date,
  name,
  durationMinutes,
  totalVolume,
  heartRate,
  calories,
  accentColor = 'bg-primary',
  onClick,
  onNameChange,
  onDelete,
  dragHandleProps,
  isDragging,
}: WorkoutCardProps) {
  const dayName = getDayOfWeekName(date);
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showActions, setShowActions] = useState(false);
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
        isDragging && 'opacity-50 shadow-lg scale-[1.02]'
      )}
      onClick={isEditing ? undefined : onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className={cn(
            'flex items-center justify-center w-8 shrink-0 cursor-grab active:cursor-grabbing transition-opacity touch-none',
            showActions || isDragging ? 'opacity-100' : 'opacity-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      
      <div className={cn('w-1 shrink-0', accentColor)} />
      
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
            <span>{formatDuration(durationMinutes)}</span>
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
