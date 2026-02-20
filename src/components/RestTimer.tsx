import { Play, Pause, RotateCcw, Plus } from 'lucide-react';
import { Button } from './ui';
import { formatTime } from '../lib/utils';
import { cn } from '../lib/utils';

interface RestTimerProps {
  seconds: number;
  isRunning: boolean;
  progress: number;
  onStart: (seconds?: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAddTime: (seconds: number) => void;
  presetTimes?: number[];
}

export function RestTimer({
  seconds,
  isRunning,
  progress,
  onStart,
  onPause,
  onResume,
  onReset,
  onAddTime,
  presetTimes = [60, 90, 120, 180],
}: RestTimerProps) {
  const isActive = seconds > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground mb-1">Отдых</p>
        <p className={cn(
          "text-4xl font-bold font-mono",
          isRunning && "text-primary"
        )}>
          {formatTime(seconds)}
        </p>
      </div>

      {isActive && (
        <div className="w-full bg-secondary rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-1000"
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      )}

      {isActive ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          {isRunning ? (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onPause}
            >
              <Pause className="w-4 h-4 mr-2" />
              Пауза
            </Button>
          ) : (
            <Button
              variant="default"
              className="flex-1"
              onClick={onResume}
            >
              <Play className="w-4 h-4 mr-2" />
              Продолжить
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAddTime(30)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {presetTimes.map((time) => (
            <Button
              key={time}
              variant="outline"
              onClick={() => onStart(time)}
              className="text-sm"
            >
              {formatTime(time)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
