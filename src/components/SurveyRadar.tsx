import { Box } from '@chakra-ui/react';
import { useId } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type Props = {
  labels: string[];
  values: number[];
  max?: number;
  size?: number;
};

const SurveyRadar = ({ labels, values, max = 100, size = 260 }: Props) => {
  const gradientId = useId();
  const count = Math.min(labels.length, values.length);
  const padding = 56;
  const canvasSize = size + padding * 2;
  const center = canvasSize / 2;
  const radius = size * 0.32;
  const labelRadius = size * 0.42;
  const angleStep = (Math.PI * 2) / count;

  const points = Array.from({ length: count }).map((_, index) => {
    const value = clamp(values[index] ?? 0, 0, max) / max;
    const angle = -Math.PI / 2 + angleStep * index;
    const x = center + Math.cos(angle) * radius * value;
    const y = center + Math.sin(angle) * radius * value;
    return `${x},${y}`;
  });

  const gridPolygons = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const polygonPoints = Array.from({ length: count }).map((_, index) => {
      const angle = -Math.PI / 2 + angleStep * index;
      const x = center + Math.cos(angle) * radius * ratio;
      const y = center + Math.sin(angle) * radius * ratio;
      return `${x},${y}`;
    });
    return polygonPoints.join(' ');
  });

  const axisLines = Array.from({ length: count }).map((_, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return { x, y };
  });

  return (
    <Box w={`${canvasSize}px`} h={`${canvasSize}px`} mx="auto">
      <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {gridPolygons.map((polygon, index) => (
          <polygon
            key={`grid-${index}`}
            points={polygon}
            fill="none"
            stroke="#cbd5f5"
            strokeDasharray={index === gridPolygons.length - 1 ? undefined : '2 4'}
            strokeWidth={1}
          />
        ))}
        {axisLines.map((axis, index) => (
          <line
            key={`axis-${index}`}
            x1={center}
            y1={center}
            x2={axis.x}
            y2={axis.y}
            stroke="#cbd5f5"
            strokeWidth={1}
          />
        ))}
        <polygon
          points={points.join(' ')}
          fill={`url(#${gradientId})`}
          stroke="#0ea5e9"
          strokeWidth={2}
        />
        {axisLines.map((_, index) => {
          const angle = -Math.PI / 2 + angleStep * index;
          const labelX = center + Math.cos(angle) * labelRadius;
          const labelY = center + Math.sin(angle) * labelRadius;
          const anchor = labelX > center + 4 ? 'start' : labelX < center - 4 ? 'end' : 'middle';
          const dy = labelY > center + 4 ? 12 : labelY < center - 4 ? -4 : 4;
          return (
            <text
              key={`label-${index}`}
              x={labelX}
              y={labelY}
              textAnchor={anchor}
              fontSize="11"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fill="#475569"
              dy={dy}
            >
              {labels[index]}
            </text>
          );
        })}
      </svg>
    </Box>
  );
};

export default SurveyRadar;
