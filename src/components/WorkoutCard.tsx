import { useState, useRef, useEffect } from 'react';
import { Clock, Weight, Heart, Flame, MoreHorizontal, Pencil } from 'lucide-react';
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
  onMenuClick?: () => void;
  onNameChange?: (newName: string) => void;
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
  onMenuClick,
  onNameChange,
}: WorkoutCardProps) {
  const dayName = getDayOfWeekName(date);
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
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

  return (
    <div
      className={cn(
        'relative flex bg-card rounded-xl overflow-hidden',
        onClick && !isEditing && 'cursor-pointer hover:bg-accent/50 transition-colors'
      )}
      onClick={isEditing ? undefined : onClick}
    >
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
          
          {onMenuClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick();
              }}
              className="p-1 rounded-full hover:bg-accent transition-colors -mr-1 -mt-1 shrink-0"
            >
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
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
