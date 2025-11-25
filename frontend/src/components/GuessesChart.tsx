import {
  CartesianGrid,
  Cell,
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

interface CustomTooltipProps extends TooltipProps<number, number> {
  fullData: ChartPoint[];
}

const CustomTooltip = ({ active, payload, fullData }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const hoveredPoint = payload[0].payload as ChartPoint;
  
  // Find all points that have the exact same X (date) and Y (weight)
  const points = fullData.filter(
    (pt) => pt.x === hoveredPoint.x && pt.y === hoveredPoint.y
  );

  if (!points.length) return null;

  const dateLabel = new Date(points[0].x).toLocaleDateString();

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
            {pt.y} kg
          </Typography>
        </Box>
      ))}
    </Paper>
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
        <Tooltip content={<CustomTooltip fullData={data} />} />
        <Scatter
          name="Guesses"
          data={data}
          fill="#8884d8"
          fillOpacity={0.7}
          stroke="rgba(15,23,42,0.25)"
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
