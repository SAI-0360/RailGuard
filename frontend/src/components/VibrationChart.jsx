import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

/**
 * Custom tooltip for the vibration chart.
 */
function ChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-1.5">{new Date(data.timestamp).toLocaleTimeString()}</p>
      <div className="space-y-1">
        <p className="text-white font-semibold">
          Vibration: <span className={
            data.vibrationLevel > 7.0 ? 'text-red-400' :
            data.vibrationLevel > 4.0 ? 'text-amber-400' : 'text-emerald-400'
          }>{data.vibrationLevel.toFixed(2)} mm/s</span>
        </p>
        <p className="text-gray-300">
          Temp: <span className="text-blue-400">{data.temperature?.toFixed(1) ?? '—'}°C</span>
        </p>
        {data.crackDetected && (
          <p className="text-red-400 font-bold">⚠ Crack Detected</p>
        )}
      </div>
    </div>
  );
}

/**
 * VibrationChart — Recharts line chart for vibration history.
 * Shows reference lines at normal (4.0) and warning (7.0) thresholds.
 * @param {{ vibrationHistory: Array }} props
 */
export default function VibrationChart({ vibrationHistory = [] }) {
  if (vibrationHistory.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vibration History</h4>
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
          No vibration data available
        </div>
      </div>
    );
  }

  // Format time labels for ticks
  const formatTime = (tickItem) => {
    try {
      return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return tickItem;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Vibration History</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={vibrationHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fill: '#6B7280', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 12]}
            tick={{ fill: '#6B7280', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            unit=" mm/s"
          />

          {/* Reference lines for thresholds */}
          <ReferenceLine
            y={4.0}
            stroke="#F59E0B"
            strokeDasharray="6 4"
            strokeOpacity={0.8}
            label={{ value: 'Normal Max (4.0)', fill: '#F59E0B', fontSize: 9, position: 'right' }}
          />
          <ReferenceLine
            y={7.0}
            stroke="#EF4444"
            strokeDasharray="6 4"
            strokeOpacity={0.8}
            label={{ value: 'Warning Max (7.0)', fill: '#EF4444', fontSize: 9, position: 'right' }}
          />

          <Tooltip content={<ChartTooltip />} />

          <Line
            type="monotone"
            dataKey="vibrationLevel"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#10B981', stroke: '#0B0F19', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Normal ≤ 4.0
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Warning ≤ 7.0
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical &gt; 7.0
        </span>
      </div>
    </div>
  );
}
