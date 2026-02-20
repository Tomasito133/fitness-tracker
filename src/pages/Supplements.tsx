import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pill, Check, X, Bell, Clock, Package, Edit2, Trash2, BellOff } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { SupplementForm } from '../components/SupplementForm';
import { db, type Supplement } from '../db';
import { getTodayString, cn } from '../lib/utils';

export function Supplements() {
  const today = getTodayString();
  const [showForm, setShowForm] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | undefined>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const supplements = useLiveQuery(() =>
    db.supplements.filter(s => s.isActive === true).toArray()
  );

  const todayIntakes = useLiveQuery(
    () => db.supplementIntakes.where('date').equals(today).toArray(),
    [today]
  );

  const createTodayIntakes = async () => {
    if (!supplements) return;

    for (const supplement of supplements) {
      for (const time of supplement.reminderTimes) {
        const existing = todayIntakes?.find(
          (i) => i.supplementId === supplement.id && i.scheduledTime === time
        );

        if (!existing) {
          await db.supplementIntakes.add({
            supplementId: supplement.id!,
            scheduledTime: time,
            skipped: false,
            date: today,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (supplements && supplements.length > 0) {
      createTodayIntakes();
    }
  }, [supplements, today]);

  const handleTakeIntake = async (intakeId: number) => {
    await db.supplementIntakes.update(intakeId, {
      takenAt: new Date(),
      skipped: false,
    });
  };

  const handleSkipIntake = async (intakeId: number) => {
    await db.supplementIntakes.update(intakeId, {
      skipped: true,
      takenAt: undefined,
    });
  };

  const handleEditSupplement = (supplement: Supplement) => {
    setEditingSupplement(supplement);
    setShowForm(true);
  };

  const handleDeleteSupplement = async (supplementId: number) => {
    await db.supplements.update(supplementId, { isActive: false });
    await db.supplementIntakes.where('supplementId').equals(supplementId).delete();
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        new Notification('FitTrack', {
          body: 'Уведомления включены! Вы будете получать напоминания о приёме добавок.',
          icon: '/favicon.svg',
        });
      }
    }
  };

  const getIntakesForSupplement = (supplementId: number) => {
    return todayIntakes?.filter((i) => i.supplementId === supplementId) || [];
  };

  const getSupplementProgress = (supplement: Supplement) => {
    const intakes = getIntakesForSupplement(supplement.id!);
    const taken = intakes.filter((i) => i.takenAt && !i.skipped).length;
    const total = supplement.reminderTimes.length;
    return { taken, total, percentage: total > 0 ? (taken / total) * 100 : 0 };
  };

  const totalTaken = supplements?.reduce((sum, s) => sum + getSupplementProgress(s).taken, 0) || 0;
  const totalRequired = supplements?.reduce((sum, s) => sum + s.reminderTimes.length, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">БАДы и добавки</h1>
          <p className="text-muted-foreground">
            {totalTaken}/{totalRequired} принято сегодня
          </p>
        </div>
        <Button onClick={() => { 
          setEditingSupplement(undefined); 
          setShowForm(true); 
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      <Card className={cn(
        "border-primary/20",
        notificationsEnabled ? "bg-primary/5" : "bg-warning/5 border-warning/20"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {notificationsEnabled ? (
              <Bell className="w-6 h-6 text-primary" />
            ) : (
              <BellOff className="w-6 h-6 text-warning" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {notificationsEnabled ? 'Уведомления включены' : 'Push-уведомления'}
              </p>
              <p className="text-sm text-muted-foreground">
                {notificationsEnabled
                  ? 'Вы будете получать напоминания о приёме'
                  : 'Включите для получения напоминаний'}
              </p>
            </div>
            {!notificationsEnabled && (
              <Button variant="outline" size="sm" onClick={requestNotifications}>
                Включить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {supplements && supplements.length > 0 ? (
        <div className="space-y-3">
          {supplements.map((supplement) => {
            const intakes = getIntakesForSupplement(supplement.id!);
            const progress = getSupplementProgress(supplement);

            return (
              <Card key={supplement.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        progress.percentage === 100 ? "bg-green-500/10" : "bg-primary/10"
                      )}>
                        <Pill className={cn(
                          "w-5 h-5",
                          progress.percentage === 100 ? "text-green-500" : "text-primary"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{supplement.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {supplement.dosage} {supplement.dosageUnit}
                          {supplement.withFood && ' · с едой'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditSupplement(supplement)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSupplement(supplement.id!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex gap-2 mb-3">
                    {supplement.reminderTimes.map((time) => {
                      const intake = intakes.find((i) => i.scheduledTime === time);
                      const isTaken = intake?.takenAt && !intake?.skipped;
                      const isSkipped = intake?.skipped;

                      return (
                        <div key={time} className="flex-1">
                          <div className={cn(
                            "flex items-center justify-center gap-1 p-2 rounded-lg text-sm font-medium transition-colors",
                            isTaken && "bg-green-500/10 text-green-600",
                            isSkipped && "bg-secondary text-muted-foreground line-through",
                            !isTaken && !isSkipped && "bg-secondary"
                          )}>
                            <Clock className="w-3 h-3" />
                            {time}
                            {isTaken && <Check className="w-3 h-3" />}
                            {isSkipped && <X className="w-3 h-3" />}
                          </div>
                          {intake && !isTaken && !isSkipped && (
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => handleTakeIntake(intake.id!)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => handleSkipIntake(intake.id!)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {supplement.stock > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span>
                        Запас: {supplement.stock} {supplement.stockUnit}
                        {supplement.timesPerDay > 0 && (
                          <> (~{Math.floor(supplement.stock / supplement.timesPerDay)} дней)</>
                        )}
                      </span>
                    </div>
                  )}

                  {supplement.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{supplement.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Нет добавок</h3>
            <p className="text-muted-foreground text-center mb-4">
              Добавьте БАДы, витамины или лекарства
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить добавку
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Популярные добавки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: 'Омега-3', dosage: '1000', unit: 'мг', times: ['08:00'] },
            { name: 'Витамин D3', dosage: '5000', unit: 'МЕ', times: ['08:00'] },
            { name: 'Магний', dosage: '400', unit: 'мг', times: ['21:00'] },
            { name: 'Цинк', dosage: '25', unit: 'мг', times: ['08:00'] },
            { name: 'Креатин', dosage: '5', unit: 'г', times: ['08:00'] },
          ].map((example, idx) => (
            <button
              key={idx}
              onClick={async () => {
                await db.supplements.add({
                  name: example.name,
                  dosage: example.dosage,
                  dosageUnit: example.unit,
                  frequency: 'daily',
                  timesPerDay: example.times.length,
                  reminderTimes: example.times,
                  withFood: false,
                  stock: 0,
                  stockUnit: 'шт',
                  isActive: true,
                  createdAt: new Date(),
                });
              }}
              className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="text-left">
                <p className="font-medium">{example.name}</p>
                <p className="text-sm text-muted-foreground">
                  {example.dosage} {example.unit}
                </p>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      <SupplementForm
        open={showForm}
        onOpenChange={setShowForm}
        supplement={editingSupplement}
      />
    </div>
  );
}
