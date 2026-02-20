import { Clock, Weight, Heart, Flame, MoreHorizontal } from 'lucide-react';
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
}: WorkoutCardProps) {
  const dayName = getDayOfWeekName(date);
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  return (
    <div
      className={cn(
        'relative flex bg-card rounded-xl overflow-hidden',
        onClick && 'cursor-pointer hover:bg-accent/50 transition-colors'
      )}
      onClick={onClick}
    >
      <div className={cn('w-1 shrink-0', accentColor)} />
      
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{capitalizedDay}</p>
            <h3 className="text-lg font-bold">{name || 'Тренировка'}</h3>
          </div>
          
          {onMenuClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick();
              }}
              className="p-1 rounded-full hover:bg-accent transition-colors -mr-1 -mt-1"
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
