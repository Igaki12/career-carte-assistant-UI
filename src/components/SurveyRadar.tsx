import { Box } from '@chakra-ui/react';
import { useId } from 'react';
import { createSurveyRadarModel } from '../lib/surveyRadar';

type Props = {
  labels: string[];
  values: number[];
  max?: number;
  size?: number;
  labelColor?: string;
  labelStroke?: string;
};

const SurveyRadar = ({ labels, values, max = 100, size = 260, labelColor = '#3f3f46', labelStroke = 'transparent' }: Props) => {
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
            <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#71717a" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {gridPolygons.map((polygon, index) => (
          <polygon
            key={`grid-${index}`}
            points={polygon.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke="#d4d4d8"
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
            stroke="#d4d4d8"
            strokeWidth={1}
          />
        ))}
        <polygon
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill={`url(#${gradientId})`}
          stroke="#52525b"
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
              fontWeight="700"
              fill={labelColor}
              stroke={labelStroke}
              strokeWidth={labelStroke === 'transparent' ? 0 : 3}
              paintOrder="stroke fill"
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
