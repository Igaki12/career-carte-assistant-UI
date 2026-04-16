export const SURVEY_RADAR_COLORS = {
  grid: '#cbd5f5',
  fillStart: '#7dd3fc',
  fillEnd: '#38bdf8',
  stroke: '#0ea5e9',
  label: '#475569',
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type RadarPoint = {
  x: number;
  y: number;
};

export type SurveyRadarLabelPosition = {
  text: string;
  x: number;
  y: number;
  anchor: CanvasTextAlign;
  dy: number;
};

export type SurveyRadarModel = {
  canvasSize: number;
  center: number;
  points: RadarPoint[];
  gridPolygons: RadarPoint[][];
  axisLines: RadarPoint[];
  labels: SurveyRadarLabelPosition[];
};

export const createSurveyRadarModel = (labels: string[], values: number[], max = 100, size = 260): SurveyRadarModel => {
  const count = Math.min(labels.length, values.length);
  const padding = 50;
  const chartSize = size * 0.9;
  const canvasSize = chartSize + padding * 2;
  const center = canvasSize / 2;
  const radius = chartSize * 0.32;
  const labelRadius = chartSize * 0.42;
  const angleStep = count > 0 ? (Math.PI * 2) / count : 0;

  const points = Array.from({ length: count }).map((_, index) => {
    const value = clamp(values[index] ?? 0, 0, max) / max;
    const angle = -Math.PI / 2 + angleStep * index;
    return {
      x: center + Math.cos(angle) * radius * value,
      y: center + Math.sin(angle) * radius * value,
    };
  });

  const gridPolygons = [0.25, 0.5, 0.75, 1].map((ratio) =>
    Array.from({ length: count }).map((_, index) => {
      const angle = -Math.PI / 2 + angleStep * index;
      return {
        x: center + Math.cos(angle) * radius * ratio,
        y: center + Math.sin(angle) * radius * ratio,
      };
    }),
  );

  const axisLines = Array.from({ length: count }).map((_, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  const positionedLabels = Array.from({ length: count }).map((_, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;
    const anchor: CanvasTextAlign = x > center + 4 ? 'left' : x < center - 4 ? 'right' : 'center';
    const dy = y > center + 4 ? 12 : y < center - 4 ? -4 : 4;

    return {
      text: labels[index] ?? '',
      x,
      y,
      anchor,
      dy,
    };
  });

  return {
    canvasSize,
    center,
    points,
    gridPolygons,
    axisLines,
    labels: positionedLabels,
  };
};

export const drawSurveyRadarOnCanvas = (
  context: CanvasRenderingContext2D,
  model: SurveyRadarModel,
  offsetX = 0,
  offsetY = 0,
) => {
  const { canvasSize, center, points, gridPolygons, axisLines, labels } = model;
  const gradient = context.createLinearGradient(offsetX, offsetY, offsetX + canvasSize, offsetY + canvasSize);
  gradient.addColorStop(0, SURVEY_RADAR_COLORS.fillStart);
  gradient.addColorStop(1, SURVEY_RADAR_COLORS.fillEnd);

  gridPolygons.forEach((polygon, index) => {
    context.beginPath();
    polygon.forEach((point, pointIndex) => {
      const x = offsetX + point.x;
      const y = offsetY + point.y;
      if (pointIndex === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.closePath();
    context.strokeStyle = SURVEY_RADAR_COLORS.grid;
    context.lineWidth = 1;
    if (index !== gridPolygons.length - 1) {
      context.setLineDash([4, 4]);
    } else {
      context.setLineDash([]);
    }
    context.stroke();
  });

  context.setLineDash([]);

  axisLines.forEach((axis) => {
    context.beginPath();
    context.moveTo(offsetX + center, offsetY + center);
    context.lineTo(offsetX + axis.x, offsetY + axis.y);
    context.strokeStyle = SURVEY_RADAR_COLORS.grid;
    context.lineWidth = 1;
    context.stroke();
  });

  if (points.length > 0) {
    context.beginPath();
    points.forEach((point, index) => {
      const x = offsetX + point.x;
      const y = offsetY + point.y;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.closePath();
    context.fillStyle = gradient;
    context.globalAlpha = 0.3;
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = SURVEY_RADAR_COLORS.stroke;
    context.lineWidth = 2;
    context.stroke();
  }

  context.fillStyle = SURVEY_RADAR_COLORS.label;
  context.font = '11px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, "Yu Gothic", sans-serif';
  labels.forEach((label) => {
    context.textAlign = label.anchor;
    context.textBaseline = 'alphabetic';
    context.fillText(label.text, offsetX + label.x, offsetY + label.y + label.dy);
  });
};
