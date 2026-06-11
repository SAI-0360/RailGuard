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
import { VIBRATION_NORMAL_MAX, VIBRATION_WARNING_MAX } from '../utils/constants';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

/** Custom tooltip: instrument readout, not a floating card. */
function ChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const vib = data.vibrationLevel;

  return (
    <div className="bg-surface-3 border border-line rounded-lg px-3 py-2 font-mono text-[11px]">
      <p className="text-ink-3 mb-1">{new Date(data.timestamp).toLocaleTimeString()}</p>
      <p className="text-ink">
        vib{' '}
        <span className={
          vib > VIBRATION_WARNING_MAX ? 'text-crit' :
          vib > VIBRATION_NORMAL_MAX ? 'text-warn' : 'text-ink'
        }>
          {vib.toFixed(2)} mm/s
        </span>
      </p>
      {data.temperature != null && (
        <p className="text-ink-2">temp {data.temperature.toFixed(1)}°C</p>
      )}
      {data.crackDetected && <p className="text-crit">crack detected</p>}
    </div>
  );
}

/**
 * VibrationChart — single focused time-series with threshold lines, so the
 * operator reads "how far past safe", not just an abstract curve.
 * The trace uses the interactive accent; thresholds carry the severity hues.
 */
export default function VibrationChart({ vibrationHistory = [] }) {
  if (vibrationHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 rounded-lg border border-line bg-surface-2
        font-mono text-[11px] text-ink-3">
        No vibration readings yet
      </div>
    );
  }

  const formatTime = (tickItem) => {
    try {
      return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return tickItem;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={vibrationHistory} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,163,178,0.07)" vertical={false} />

        <XAxis
          dataKey="timestamp"
          tickFormatter={formatTime}
          tick={{ fill: '#6A7383', fontSize: 9, fontFamily: MONO }}
          axisLine={{ stroke: '#232936' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 12]}
          tick={{ fill: '#6A7383', fontSize: 9, fontFamily: MONO }}
          axisLine={false}
          tickLine={false}
        />

        <ReferenceLine
          y={VIBRATION_NORMAL_MAX}
          stroke="#E6A23C"
          strokeDasharray="5 4"
          strokeOpacity={0.6}
          label={{ value: `warn ${VIBRATION_NORMAL_MAX.toFixed(1)}`, fill: '#E6A23C', fontSize: 9, fontFamily: MONO, position: 'insideTopRight' }}
        />
        <ReferenceLine
          y={VIBRATION_WARNING_MAX}
          stroke="#F0524F"
          strokeDasharray="5 4"
          strokeOpacity={0.6}
          label={{ value: `crit ${VIBRATION_WARNING_MAX.toFixed(1)}`, fill: '#F0524F', fontSize: 9, fontFamily: MONO, position: 'insideTopRight' }}
        />

        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#232936' }} />

        <Line
          type="monotone"
          dataKey="vibrationLevel"
          stroke="#4CB8E8"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: '#4CB8E8', stroke: '#0B0D12', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
