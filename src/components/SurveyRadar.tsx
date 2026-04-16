import { Box } from '@chakra-ui/react';
import { useId } from 'react';
import { createSurveyRadarModel } from '../lib/surveyRadar';

type Props = {
  labels: string[];
  values: number[];
  max?: number;
  size?: number;
};

const SurveyRadar = ({ labels, values, max = 100, size = 260 }: Props) => {
  const gradientId = useId();
  const { canvasSize, center, points, gridPolygons, axisLines, labels: positionedLabels } = createSurveyRadarModel(
    labels,
    values,
    max,
    size,
  );

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
            points={polygon.map((point) => `${point.x},${point.y}`).join(' ')}
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
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill={`url(#${gradientId})`}
          stroke="#0ea5e9"
          strokeWidth={2}
        />
        {positionedLabels.map((label, index) => {
          const anchor = label.anchor === 'left' ? 'start' : label.anchor === 'right' ? 'end' : 'middle';
          return (
            <text
              key={`label-${index}`}
              x={label.x}
              y={label.y}
              textAnchor={anchor}
              fontSize="11"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fill="#475569"
              dy={label.dy}
            >
              {label.text}
            </text>
          );
        })}
      </svg>
    </Box>
  );
};

export default SurveyRadar;
