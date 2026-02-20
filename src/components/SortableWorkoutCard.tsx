import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkoutCard } from './WorkoutCard';

interface SortableWorkoutCardProps {
  id: number;
  date: string;
  name: string;
  durationMinutes: number;
  totalVolume: number;
  accentColor?: string;
  onClick?: () => void;
  onNameChange?: (newName: string) => void;
  onDelete?: () => void;
}

export function SortableWorkoutCard({
  id,
  date,
  name,
  durationMinutes,
  totalVolume,
  accentColor,
  onClick,
  onNameChange,
  onDelete,
}: SortableWorkoutCardProps) {
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
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WorkoutCard
        date={date}
        name={name}
        durationMinutes={durationMinutes}
        totalVolume={totalVolume}
        accentColor={accentColor}
        onClick={onClick}
        onNameChange={onNameChange}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}
