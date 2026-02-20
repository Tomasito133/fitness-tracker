import { useState, useEffect } from 'react';
import { Plus, X, Clock } from 'lucide-react';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui';
import { db, type Supplement } from '../db';

interface SupplementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplement?: Supplement;
  onSuccess?: () => void;
}

export function SupplementForm({ open, onOpenChange, supplement, onSuccess }: SupplementFormProps) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState('мг');
  const [reminderTimes, setReminderTimes] = useState<string[]>(['08:00']);
  const [withFood, setWithFood] = useState(false);
  const [stock, setStock] = useState(0);
  const [stockUnit, setStockUnit] = useState('шт');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (supplement) {
        setName(supplement.name || '');
        setDosage(supplement.dosage || '');
        setDosageUnit(supplement.dosageUnit || 'мг');
        setReminderTimes(supplement.reminderTimes || ['08:00']);
        setWithFood(supplement.withFood || false);
        setStock(supplement.stock || 0);
        setStockUnit(supplement.stockUnit || 'шт');
        setNotes(supplement.notes || '');
      } else {
        setName('');
        setDosage('');
        setDosageUnit('мг');
        setReminderTimes(['08:00']);
        setWithFood(false);
        setStock(0);
        setStockUnit('шт');
        setNotes('');
      }
    }
  }, [open, supplement]);

  const handleAddTime = () => {
    setReminderTimes([...reminderTimes, '12:00']);
  };

  const handleRemoveTime = (index: number) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, value: string) => {
    const updated = [...reminderTimes];
    updated[index] = value;
    setReminderTimes(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      dosage,
      dosageUnit,
      frequency: 'daily' as const,
      timesPerDay: reminderTimes.length,
      reminderTimes: reminderTimes.sort(),
      withFood,
      stock,
      stockUnit,
      notes,
      isActive: true,
      createdAt: supplement?.createdAt || new Date(),
    };

    if (supplement?.id) {
      await db.supplements.update(supplement.id, data);
    } else {
      await db.supplements.add(data);
    }

    onSuccess?.();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDosage('');
    setDosageUnit('мг');
    setReminderTimes(['08:00']);
    setWithFood(false);
    setStock(0);
    setStockUnit('шт');
    setNotes('');
  };

  const dosageUnits = ['мг', 'г', 'мкг', 'МЕ', 'мл', 'капс', 'табл'];
  const stockUnits = ['шт', 'капс', 'табл', 'г', 'мл', 'дней'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplement ? 'Редактировать' : 'Добавить'} добавку</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Название *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Омега-3"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Дозировка</label>
              <Input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="1000"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Единица</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {dosageUnits.map((unit) => (
                  <Button
                    key={unit}
                    variant={dosageUnit === unit ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDosageUnit(unit)}
                  >
                    {unit}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Время приёма
            </label>
            <div className="space-y-2 mt-2">
              {reminderTimes.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {reminderTimes.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveTime(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddTime} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Добавить время
              </Button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withFood}
                onChange={(e) => setWithFood(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-sm">Принимать с едой</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Запас</label>
              <Input
                type="number"
                value={stock || ''}
                onChange={(e) => setStock(Number(e.target.value))}
                placeholder="30"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Единица</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {stockUnits.slice(0, 4).map((unit) => (
                  <Button
                    key={unit}
                    variant={stockUnit === unit ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStockUnit(unit)}
                  >
                    {unit}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Заметки</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {supplement ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
