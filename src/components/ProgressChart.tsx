import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type BodyMeasurement, type MeasurementType } from '../db';
import { getMeasurementLabel } from '../lib/utils';

interface ProgressChartProps {
  measurements: BodyMeasurement[];
  type: MeasurementType;
  color?: string;
}

export function ProgressChart({ measurements, type, color = '#3b82f6' }: ProgressChartProps) {
  const data = useMemo(() => {
    return measurements
      .filter((m) => m.type === type)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
        date: new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        value: m.value,
        fullDate: m.date,
      }));
  }, [measurements, type]);

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Недостаточно данных для графика (минимум 2 замера)
      </div>
    );
  }

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = (maxValue - minValue) * 0.1 || 1;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickLine={false}
          />
          <YAxis
            domain={[Math.floor(minValue - padding), Math.ceil(maxValue + padding)]}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickLine={false}
            width={40}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                  <p className="text-sm font-medium">{data.value} {type === 'weight' ? 'кг' : 'см'}</p>
                  <p className="text-xs text-muted-foreground">{data.date}</p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
