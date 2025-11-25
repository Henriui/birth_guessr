import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { Box, Paper, Typography } from '@mui/material';
import type { ChartPoint } from './types';

interface GuessesChartProps {
  data: ChartPoint[];
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, number>) => {
  if (!active || !payload || payload.length === 0) return null;

  const hoveredPoint = payload[0].payload as ChartPoint;
  const points = hoveredPoint.subPoints || [
    { name: hoveredPoint.name, color: hoveredPoint.color },
  ];

  const dateLabel = new Date(hoveredPoint.x).toLocaleDateString();

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" fontWeight="bold">
        Guesses on {dateLabel}
      </Typography>
      {points.map((pt, idx) => (
        <Box
          key={idx}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: pt.color,
              border: '1px solid rgba(15,23,42,0.3)',
            }}
          />
          <Typography variant="body2">{pt.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {hoveredPoint.y} kg
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

const AnimatedPoint = (props: {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: unknown;
  size?: number;
}) => {
  const { cx, cy, fill, payload, size } = props;
  const chartPoint = payload as ChartPoint;
  const subPoints = chartPoint?.subPoints;
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (!subPoints || subPoints.length <= 1) return;
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % subPoints.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [subPoints]);

  const currentColor =
    subPoints && subPoints.length > 1 ? subPoints[colorIndex].color : fill;

  // Calculate radius from area (size) if available, otherwise default to 6
  const radius = size ? Math.sqrt(size / Math.PI) : 6;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={currentColor}
      stroke="rgba(15,23,42,0.25)"
      strokeWidth={1}
      style={{ transition: 'fill 1s ease-in-out' }}
    />
  );
};

export function GuessesChart({ data }: GuessesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Date"
          domain={['auto', 'auto']}
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
        />
        <YAxis type="number" dataKey="y" name="Weight" unit="kg" domain={[0, 12]} />
        <ZAxis type="number" dataKey="z" range={[50, 400]} name="Weight Size" />
        <Tooltip content={<CustomTooltip />} />
        <Scatter
          name="Guesses"
          data={data}
          fill="#8884d8"
          fillOpacity={0.7}
          shape={<AnimatedPoint />}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
