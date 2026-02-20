import { useState } from 'react';
import { Scale, Ruler } from 'lucide-react';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui';
import { db, type MeasurementType } from '../db';
import { getTodayString, getMeasurementLabel } from '../lib/utils';

interface MeasurementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const measurementConfig: { type: MeasurementType; unit: 'kg' | 'cm' | '%'; icon: typeof Scale }[] = [
  { type: 'weight', unit: 'kg', icon: Scale },
  { type: 'chest', unit: 'cm', icon: Ruler },
  { type: 'waist', unit: 'cm', icon: Ruler },
  { type: 'hips', unit: 'cm', icon: Ruler },
  { type: 'neck', unit: 'cm', icon: Ruler },
  { type: 'bicep_left', unit: 'cm', icon: Ruler },
  { type: 'bicep_right', unit: 'cm', icon: Ruler },
  { type: 'thigh_left', unit: 'cm', icon: Ruler },
  { type: 'thigh_right', unit: 'cm', icon: Ruler },
];

export function MeasurementForm({ open, onOpenChange, onSuccess }: MeasurementFormProps) {
  const [values, setValues] = useState<Record<MeasurementType, string>>({
    weight: '',
    chest: '',
    waist: '',
    hips: '',
    neck: '',
    bicep_left: '',
    bicep_right: '',
    thigh_left: '',
    thigh_right: '',
    body_fat: '',
  });
  const [date, setDate] = useState(getTodayString());

  const handleValueChange = (type: MeasurementType, value: string) => {
    setValues((prev) => ({ ...prev, [type]: value }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(values).filter(([_, value]) => value && Number(value) > 0);

    if (entries.length === 0) return;

    for (const [type, value] of entries) {
      const config = measurementConfig.find((c) => c.type === type);
      await db.bodyMeasurements.add({
        date,
        type: type as MeasurementType,
        value: Number(value),
        unit: config?.unit || 'cm',
        createdAt: new Date(),
      });
    }

    onSuccess?.();
    onOpenChange(false);
    setValues({
      weight: '',
      chest: '',
      waist: '',
      hips: '',
      neck: '',
      bicep_left: '',
      bicep_right: '',
      thigh_left: '',
      thigh_right: '',
      body_fat: '',
    });
  };

  const filledCount = Object.values(values).filter((v) => v && Number(v) > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новый замер</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Дата</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {measurementConfig.map(({ type, unit, icon: Icon }) => (
              <div key={type}>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {getMeasurementLabel(type)}
                </label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={values[type]}
                    onChange={(e) => handleValueChange(type, e.target.value)}
                    placeholder="0"
                    className="pr-10"
                    inputMode="decimal"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {unit === 'kg' ? 'кг' : 'см'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={filledCount === 0}>
            Сохранить ({filledCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
