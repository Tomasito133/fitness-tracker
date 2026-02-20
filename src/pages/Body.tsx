import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Ruler, TrendingUp, TrendingDown, Minus, Scale, ChevronRight, Calculator, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui';
import { MeasurementForm } from '../components/MeasurementForm';
import { ProgressChart } from '../components/ProgressChart';
import { db, type MeasurementType } from '../db';
import { getMeasurementLabel, formatShortDate, cn } from '../lib/utils';

const measurementTypes: { type: MeasurementType; unit: string; color: string }[] = [
  { type: 'weight', unit: 'кг', color: '#3b82f6' },
  { type: 'chest', unit: 'см', color: '#10b981' },
  { type: 'waist', unit: 'см', color: '#f59e0b' },
  { type: 'hips', unit: 'см', color: '#8b5cf6' },
  { type: 'neck', unit: 'см', color: '#ec4899' },
  { type: 'bicep_left', unit: 'см', color: '#06b6d4' },
  { type: 'bicep_right', unit: 'см', color: '#06b6d4' },
  { type: 'thigh_left', unit: 'см', color: '#84cc16' },
  { type: 'thigh_right', unit: 'см', color: '#84cc16' },
];

export function Body() {
  const [showForm, setShowForm] = useState(false);
  const [showChart, setShowChart] = useState<MeasurementType | null>(null);
  const [showFatCalculator, setShowFatCalculator] = useState(false);
  const [fatCalcValues, setFatCalcValues] = useState({ neck: '', waist: '', hips: '', height: '' });
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bodyFatResult, setBodyFatResult] = useState<number | null>(null);

  const measurements = useLiveQuery(() =>
    db.bodyMeasurements.orderBy('date').reverse().toArray()
  );

  const latestByType = useMemo(() => {
    if (!measurements) return {};
    return measurements.reduce((acc, m) => {
      if (!acc[m.type]) acc[m.type] = m;
      return acc;
    }, {} as Record<string, (typeof measurements)[0]>);
  }, [measurements]);

  const previousByType = useMemo(() => {
    if (!measurements) return {};
    return measurements.reduce((acc, m) => {
      if (latestByType[m.type]?.id !== m.id && !acc[m.type]) {
        acc[m.type] = m;
      }
      return acc;
    }, {} as Record<string, (typeof measurements)[0]>);
  }, [measurements, latestByType]);

  const getTrend = (type: MeasurementType) => {
    const latest = latestByType[type];
    const previous = previousByType[type];
    if (!latest || !previous) return null;

    const diff = latest.value - previous.value;
    if (Math.abs(diff) < 0.1) return { direction: 'same' as const, value: 0 };
    return {
      direction: diff > 0 ? ('up' as const) : ('down' as const),
      value: Math.abs(diff),
    };
  };

  const handleDeleteMeasurement = async (id: number) => {
    await db.bodyMeasurements.delete(id);
  };

  const calculateBodyFat = () => {
    const neck = Number(fatCalcValues.neck);
    const waist = Number(fatCalcValues.waist);
    const hips = Number(fatCalcValues.hips);
    const height = Number(fatCalcValues.height);

    if (!neck || !waist || !height) return;

    let bodyFat: number;

    if (gender === 'male') {
      bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      if (!hips) return;
      bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.22100 * Math.log10(height)) - 450;
    }

    setBodyFatResult(Math.round(bodyFat * 10) / 10);
  };

  const selectedChartConfig = measurementTypes.find((t) => t.type === showChart);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Замеры тела</h1>
          <p className="text-muted-foreground">Отслеживайте прогресс</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Новый замер
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {measurementTypes.map(({ type, unit, color }) => {
          const latest = latestByType[type];
          const trend = getTrend(type);
          const measurementsCount = measurements?.filter((m) => m.type === type).length || 0;

          return (
            <Card
              key={type}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => measurementsCount >= 2 && setShowChart(type)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {getMeasurementLabel(type)}
                  </CardTitle>
                  {type === 'weight' ? (
                    <Scale className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {latest ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" style={{ color }}>{latest.value}</span>
                      <span className="text-muted-foreground">{unit}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {trend && (
                        <>
                          {trend.direction === 'up' && (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          )}
                          {trend.direction === 'down' && (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          )}
                          {trend.direction === 'same' && (
                            <Minus className="w-3 h-3" />
                          )}
                          {trend.direction !== 'same' && (
                            <span className={trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}>
                              {trend.direction === 'up' ? '+' : '-'}{trend.value.toFixed(1)}
                            </span>
                          )}
                        </>
                      )}
                      <span className="ml-auto">{formatShortDate(latest.date)}</span>
                      {measurementsCount >= 2 && (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Нет данных</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setShowFatCalculator(true)}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Калькулятор % жира</p>
            <p className="text-sm text-muted-foreground">Формула ВМС США</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {measurements && measurements.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Последние замеры</h2>
          {measurements.slice(0, 10).map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{getMeasurementLabel(m.type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatShortDate(m.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold">
                    {m.value} {m.unit === 'kg' ? 'кг' : m.unit === '%' ? '%' : 'см'}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMeasurement(m.id!);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!measurements || measurements.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ruler className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Нет замеров</h3>
            <p className="text-muted-foreground text-center mb-4">
              Добавьте первый замер для отслеживания прогресса
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить замер
            </Button>
          </CardContent>
        </Card>
      )}

      <MeasurementForm open={showForm} onOpenChange={setShowForm} />

      <Dialog open={!!showChart} onOpenChange={() => setShowChart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showChart && getMeasurementLabel(showChart)} — динамика
            </DialogTitle>
          </DialogHeader>
          {showChart && measurements && (
            <ProgressChart
              measurements={measurements}
              type={showChart}
              color={selectedChartConfig?.color}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showFatCalculator} onOpenChange={setShowFatCalculator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Калькулятор % жира</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={gender === 'male' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setGender('male')}
              >
                Мужчина
              </Button>
              <Button
                variant={gender === 'female' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setGender('female')}
              >
                Женщина
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Рост (см)</label>
                <Input
                  type="number"
                  value={fatCalcValues.height}
                  onChange={(e) => setFatCalcValues({ ...fatCalcValues, height: e.target.value })}
                  placeholder="175"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Шея (см)</label>
                <Input
                  type="number"
                  value={fatCalcValues.neck}
                  onChange={(e) => setFatCalcValues({ ...fatCalcValues, neck: e.target.value })}
                  placeholder="38"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Талия (см)</label>
                <Input
                  type="number"
                  value={fatCalcValues.waist}
                  onChange={(e) => setFatCalcValues({ ...fatCalcValues, waist: e.target.value })}
                  placeholder="85"
                  className="mt-1"
                />
              </div>
              {gender === 'female' && (
                <div>
                  <label className="text-sm text-muted-foreground">Бёдра (см)</label>
                  <Input
                    type="number"
                    value={fatCalcValues.hips}
                    onChange={(e) => setFatCalcValues({ ...fatCalcValues, hips: e.target.value })}
                    placeholder="100"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {bodyFatResult !== null && (
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Процент жира</p>
                <p className="text-3xl font-bold text-primary">{bodyFatResult}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bodyFatResult < 10 && 'Очень низкий'}
                  {bodyFatResult >= 10 && bodyFatResult < 15 && 'Атлетическое телосложение'}
                  {bodyFatResult >= 15 && bodyFatResult < 20 && 'Фитнес'}
                  {bodyFatResult >= 20 && bodyFatResult < 25 && 'Средний'}
                  {bodyFatResult >= 25 && bodyFatResult < 30 && 'Выше среднего'}
                  {bodyFatResult >= 30 && 'Высокий'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={calculateBodyFat} className="w-full">
              Рассчитать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
