import { jsPDF } from 'jspdf';
import { drawSurveyRadarOnCanvas, createSurveyRadarModel } from './surveyRadar';
import {
  SHIRP_DETAIL_CATEGORY_KEYS,
  SHIRP_DETAIL_FIELDS,
  SHIRP_DETAIL_LABELS,
  SHIRP_LABELS,
} from './shirp';
import { SHIRP_KEYS } from '../types';
import type { KarteData, MeetingType, SurveyFactorKey } from '../types';

const SURVEY_LABELS: Record<SurveyFactorKey, string> = {
  growth_orientation: '成長志向',
  problem_solving_orientation: '課題解決志向',
  organization_contribution_orientation: '組織貢献志向',
  interpersonal_adaptation_orientation: '対人適応志向',
  emotional_response_tendency: '情動反応傾向',
};

const SURVEY_FACTOR_KEYS: SurveyFactorKey[] = [
  'growth_orientation',
  'problem_solving_orientation',
  'organization_contribution_orientation',
  'interpersonal_adaptation_orientation',
  'emotional_response_tendency',
];

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PAGE_MARGIN = 84;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const PAGE_FOOTER_SPACE = 60;
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, "Yu Gothic", sans-serif';

type ExportMeta = {
  meetingType: MeetingType | null;
  createdAt: string | null;
  updatedAt: string | null;
  feedback: string | null;
};

export type KarteExportPayload = {
  karte: KarteData;
  meta: ExportMeta;
};

type CsvRow = {
  section: string;
  item: string;
  value: string;
};

type CanvasPage = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  cursorY: number;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};

const toDateSuffix = () =>
  new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replaceAll('/', '-');

const buildFileName = (extension: 'csv' | 'pdf') => `career-karte-${toDateSuffix()}.${extension}`;

const formatMeetingType = (meetingType: MeetingType | null) => {
  if (meetingType === 'initial') return '初回面談';
  if (meetingType === 'continuous') return '継続面談';
  return '未設定';
};

const formatPlainValue = (value: string | number | null | undefined, fallback = '未入力') => {
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
};

const formatKarteValue = (value: string | null | undefined) => formatPlainValue(value, '未聴取');
const formatSurveyValue = (value: number | null | undefined) => (typeof value === 'number' ? `${value}` : '未回答');
const formatConditionValue = (value: string | number | null | undefined) => formatPlainValue(value, '未測定');

const hasSurveyResponses = (karte: KarteData) =>
  SURVEY_FACTOR_KEYS.some((key) => typeof karte.survey.factors[key] === 'number' && (karte.survey.factors[key] ?? 0) > 0);

const buildCsvRows = ({ karte, meta }: KarteExportPayload): CsvRow[] => {
  const rows: CsvRow[] = [
    { section: 'meta', item: '面談種別', value: formatMeetingType(meta.meetingType) },
    { section: 'meta', item: '作成日', value: formatPlainValue(meta.createdAt, '未保存') },
    { section: 'meta', item: '最終更新日', value: formatPlainValue(meta.updatedAt, '未保存') },
  ];

  const demographicsRows: Array<[string, string | null]> = [
    ['氏名', karte.demographics.name],
    ['年齢', karte.demographics.age],
    ['所属企業', karte.demographics.company],
    ['職種', karte.demographics.jobTitle],
    ['勤務地(都道府県)', karte.demographics.workLocationPrefecture],
    ['転職歴(回数)', karte.demographics.jobChangeCount],
    ['勤続年数(年)', karte.demographics.yearsOfService],
    ['性別', karte.demographics.gender],
    ['現在の婚姻関係', karte.demographics.maritalStatus],
    ['子供の有無(人)', karte.demographics.childrenCount],
    ['末子の年齢(歳)', karte.demographics.youngestChildAge],
  ];
  demographicsRows.forEach(([item, value]) => rows.push({ section: 'profile', item, value: formatPlainValue(value) }));

  SHIRP_KEYS.forEach((key) => {
    rows.push({
      section: 'shirp_summary',
      item: SHIRP_LABELS[key],
      value: formatKarteValue(karte.shirp[key]),
    });
  });

  SHIRP_DETAIL_CATEGORY_KEYS.forEach((category) => {
    const detailLabels = SHIRP_DETAIL_LABELS[category] as Record<string, string>;
    const detailValues = karte.shirpDetails[category] as Record<string, string | null>;
    SHIRP_DETAIL_FIELDS[category].forEach((field) => {
      rows.push({
        section: 'shirp_detail',
        item: `${SHIRP_LABELS[category]} / ${detailLabels[field]}`,
        value: formatKarteValue(detailValues[field]),
      });
    });
  });

  rows.push({
    section: 'feedback',
    item: '面談フィードバック',
    value: formatPlainValue(meta.feedback, 'なし'),
  });

  rows.push({
    section: 'survey',
    item: '最終更新',
    value: formatPlainValue(karte.survey.lastUpdated, '未回答'),
  });
  SURVEY_FACTOR_KEYS.forEach((key) => {
    rows.push({
      section: 'survey',
      item: SURVEY_LABELS[key],
      value: formatSurveyValue(karte.survey.factors[key]),
    });
  });

  rows.push({
    section: 'condition',
    item: '緊張度スコア',
    value: karte.conditionSummary ? `${karte.conditionSummary.score} / 100` : '未測定',
  });
  rows.push({
    section: 'condition',
    item: 'レベル',
    value: formatConditionValue(karte.conditionSummary?.level),
  });
  rows.push({
    section: 'condition',
    item: '測定日時',
    value: formatConditionValue(karte.conditionSummary?.measuredAt),
  });

  return rows;
};

const escapeCsvValue = (value: string) => `"${value.replaceAll('"', '""')}"`;

export const downloadKarteCsv = (payload: KarteExportPayload) => {
  const rows = buildCsvRows(payload);
  const header = 'section,item,value';
  const body = rows.map((row) => [row.section, row.item, row.value].map(escapeCsvValue).join(',')).join('\r\n');
  const csv = `\uFEFF${header}\r\n${body}`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), buildFileName('csv'));
};

const createCanvasPage = (): CanvasPage => {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('PDF出力用のキャンバスを初期化できませんでした。');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.fillStyle = '#0f172a';
  context.textBaseline = 'top';

  return {
    canvas,
    context,
    cursorY: PAGE_MARGIN,
  };
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    let currentLine = '';
    Array.from(paragraph).forEach((char) => {
      const candidate = currentLine + char;
      if (currentLine && context.measureText(candidate).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = candidate;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
};

const ensureSpace = (pages: CanvasPage[], requiredHeight: number) => {
  let page = pages[pages.length - 1];
  if (page.cursorY + requiredHeight > PAGE_HEIGHT - PAGE_MARGIN - PAGE_FOOTER_SPACE) {
    page = createCanvasPage();
    pages.push(page);
  }
  return page;
};

const setFont = (context: CanvasRenderingContext2D, weight: 400 | 600 | 700, size: number) => {
  context.font = `${weight} ${size}px ${FONT_FAMILY}`;
};

const drawTitleBlock = (pages: CanvasPage[], payload: KarteExportPayload) => {
  const page = pages[pages.length - 1];
  const { context } = page;

  setFont(context, 700, 36);
  context.fillStyle = '#0f172a';
  context.fillText('キャリアカルテ', PAGE_MARGIN, page.cursorY);
  page.cursorY += 56;

  const metaRows = [
    `面談種別: ${formatMeetingType(payload.meta.meetingType)}`,
    `作成日: ${formatPlainValue(payload.meta.createdAt, '未保存')}`,
    `最終更新日: ${formatPlainValue(payload.meta.updatedAt, '未保存')}`,
  ];

  setFont(context, 400, 22);
  context.fillStyle = '#334155';
  metaRows.forEach((row) => {
    context.fillText(row, PAGE_MARGIN, page.cursorY);
    page.cursorY += 32;
  });
  page.cursorY += 16;
};

const drawSectionTitle = (pages: CanvasPage[], title: string) => {
  const page = ensureSpace(pages, 54);
  const { context } = page;

  setFont(context, 700, 26);
  context.fillStyle = '#0f172a';
  context.fillText(title, PAGE_MARGIN, page.cursorY);
  page.cursorY += 38;
  context.strokeStyle = '#cbd5e1';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(PAGE_MARGIN, page.cursorY);
  context.lineTo(PAGE_WIDTH - PAGE_MARGIN, page.cursorY);
  context.stroke();
  page.cursorY += 18;
};

const drawField = (pages: CanvasPage[], label: string, value: string) => {
  let page = ensureSpace(pages, 84);
  let { context } = page;

  setFont(context, 700, 20);
  const labelLines = wrapText(context, label, CONTENT_WIDTH);
  setFont(context, 400, 20);
  const valueLines = wrapText(context, value, CONTENT_WIDTH - 20);
  const blockHeight = labelLines.length * 28 + valueLines.length * 28 + 18;
  page = ensureSpace(pages, blockHeight);
  context = page.context;

  setFont(context, 700, 20);
  context.fillStyle = '#475569';
  labelLines.forEach((line) => {
    context.fillText(line, PAGE_MARGIN, page.cursorY);
    page.cursorY += 28;
  });

  setFont(context, 400, 20);
  context.fillStyle = '#0f172a';
  valueLines.forEach((line) => {
    context.fillText(line, PAGE_MARGIN + 20, page.cursorY);
    page.cursorY += 28;
  });

  page.cursorY += 18;
};

const drawSurveySection = (pages: CanvasPage[], karte: KarteData) => {
  drawSectionTitle(pages, 'アンケート');

  if (!hasSurveyResponses(karte)) {
    drawField(pages, 'アンケート結果', '未回答');
    return;
  }

  const chartSize = 340;
  const page = ensureSpace(pages, chartSize + 40);
  const model = createSurveyRadarModel(
    SURVEY_FACTOR_KEYS.map((key) => SURVEY_LABELS[key]),
    SURVEY_FACTOR_KEYS.map((key) => karte.survey.factors[key] ?? 0),
    100,
    chartSize,
  );
  const chartX = PAGE_MARGIN + Math.round((CONTENT_WIDTH - model.canvasSize) / 2);
  drawSurveyRadarOnCanvas(page.context, model, chartX, page.cursorY);
  page.cursorY += model.canvasSize + 24;

  drawField(pages, '最終更新', formatPlainValue(karte.survey.lastUpdated, '未回答'));
  SURVEY_FACTOR_KEYS.forEach((key) => {
    drawField(pages, SURVEY_LABELS[key], `${formatSurveyValue(karte.survey.factors[key])}点 / 100点`);
  });
};

export const downloadKartePdf = async (payload: KarteExportPayload) => {
  const pages = [createCanvasPage()];
  const { karte, meta } = payload;

  drawTitleBlock(pages, payload);

  drawSectionTitle(pages, '基本情報');
  [
    ['氏名', formatPlainValue(karte.demographics.name)],
    ['年齢', formatPlainValue(karte.demographics.age)],
    ['所属企業', formatPlainValue(karte.demographics.company)],
    ['職種', formatPlainValue(karte.demographics.jobTitle)],
    ['勤務地(都道府県)', formatPlainValue(karte.demographics.workLocationPrefecture)],
    ['転職歴(回数)', formatPlainValue(karte.demographics.jobChangeCount)],
    ['勤続年数(年)', formatPlainValue(karte.demographics.yearsOfService)],
    ['性別', formatPlainValue(karte.demographics.gender)],
    ['現在の婚姻関係', formatPlainValue(karte.demographics.maritalStatus)],
    ['子供の有無(人)', formatPlainValue(karte.demographics.childrenCount)],
    ['末子の年齢(歳)', formatPlainValue(karte.demographics.youngestChildAge)],
  ].forEach(([label, value]) => drawField(pages, label, value));

  drawSectionTitle(pages, '電子カルテ要約');
  SHIRP_KEYS.forEach((key) => {
    drawField(pages, SHIRP_LABELS[key], formatKarteValue(karte.shirp[key]));
  });

  drawSectionTitle(pages, '電子カルテ詳細');
  SHIRP_DETAIL_CATEGORY_KEYS.forEach((category) => {
    const detailLabels = SHIRP_DETAIL_LABELS[category] as Record<string, string>;
    const detailValues = karte.shirpDetails[category] as Record<string, string | null>;
    SHIRP_DETAIL_FIELDS[category].forEach((field) => {
      drawField(pages, `${SHIRP_LABELS[category]} / ${detailLabels[field]}`, formatKarteValue(detailValues[field]));
    });
  });

  drawSectionTitle(pages, '面談フィードバック');
  drawField(pages, 'フィードバック', formatPlainValue(meta.feedback, 'なし'));

  drawSurveySection(pages, karte);

  drawSectionTitle(pages, '面談前コンディション');
  drawField(
    pages,
    '緊張度スコア',
    karte.conditionSummary ? `${karte.conditionSummary.score} / 100` : '未測定',
  );
  drawField(pages, 'レベル', formatConditionValue(karte.conditionSummary?.level));
  drawField(pages, '測定日時', formatConditionValue(karte.conditionSummary?.measuredAt));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(page.canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  });

  pdf.save(buildFileName('pdf'));
};
