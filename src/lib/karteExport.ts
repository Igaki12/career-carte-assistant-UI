import { jsPDF } from 'jspdf';
import { drawSurveyRadarOnCanvas, createSurveyRadarModel } from './surveyRadar';
import {
  getShirpDetailFieldEntries,
  getShirpDetailItemEntries,
  SHIRP_DETAIL_CATEGORY_KEYS,
  SHIRP_LABELS,
} from './shirp';
import { SHIRP_KEYS } from '../types';
import type { KarteData, MeetingType, ShirpDetailCategoryKey, SurveyFactorKey } from '../types';

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
const PAGE_MARGIN_X = 86;
const PAGE_TOP = 84;
const PAGE_BOTTOM = 150;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const FONT_SERIF = '"Times New Roman", "Yu Mincho", "Hiragino Mincho ProN", serif';
const FONT_SANS = '"Hiragino Sans", "Yu Gothic", "Helvetica Neue", Arial, sans-serif';

const PDF_THEME = {
  paper: '#fbfaf7',
  panel: '#f4efe6',
  text: '#182031',
  muted: '#8d96a6',
  rule: '#ded8ca',
  ruleStrong: '#1b2536',
  copper: '#944d3f',
  dash: '#d7d0c2',
};

const CATEGORY_META: Record<
  ShirpDetailCategoryKey,
  { letter: ShirpDetailCategoryKey; title: string; english: string; description: string; color: string }
> = {
  S: {
    letter: 'S',
    title: '現状',
    english: 'Satisfaction',
    description: '現在の状態をめぐる満足/不満足の構造',
    color: '#3f6684',
  },
  H: {
    letter: 'H',
    title: '希望',
    english: 'Hope',
    description: '本人が望むキャリアと働き方の方向性',
    color: '#82743e',
  },
  I: {
    letter: 'I',
    title: '課題',
    english: 'Issue',
    description: '希望実現にあたって直面している障壁',
    color: '#944d3f',
  },
  R: {
    letter: 'R',
    title: '資源',
    english: 'Resource',
    description: '活用しうる能力・対人・心理・環境のリソース',
    color: '#386f60',
  },
  P: {
    letter: 'P',
    title: '計画',
    english: 'Plan',
    description: '現状から希望へ向かう探索・学習・実行の道筋',
    color: '#613b72',
  },
};

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

export type KarteBatchExportPayload = KarteExportPayload & {
  employeeName?: string;
  employeeId?: string;
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

const buildFileName = (extension: 'csv' | 'pdf', prefix = 'career-karte') => `${prefix}-${toDateSuffix()}.${extension}`;

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

const padDatePart = (value: string | number) => String(value).padStart(2, '0');

const formatPdfDateTime = (value: string | null | undefined, fallback = '未保存') => {
  const raw = formatPlainValue(value, fallback);
  if (raw === fallback) return raw;

  const dateTimeMatch = raw.match(
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s]+(\d{1,2})(?::?(\d{2}))?)?/,
  );
  if (dateTimeMatch) {
    const [, year, month, day, hour = '0', minute = '0'] = dateTimeMatch;
    return `${year}/${padDatePart(month)}/${padDatePart(day)} ${padDatePart(hour)}:${padDatePart(minute)}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return [
    `${parsed.getFullYear()}/${padDatePart(parsed.getMonth() + 1)}/${padDatePart(parsed.getDate())}`,
    `${padDatePart(parsed.getHours())}:${padDatePart(parsed.getMinutes())}`,
  ].join(' ');
};

const hasSurveyResponses = (karte: KarteData) =>
  SURVEY_FACTOR_KEYS.some((key) => typeof karte.survey.factors[key] === 'number' && (karte.survey.factors[key] ?? 0) > 0);

const buildCsvRows = ({ karte, meta }: KarteExportPayload): CsvRow[] => {
  const rows: CsvRow[] = [
    { section: 'meta', item: '面談種別', value: formatMeetingType(meta.meetingType) },
    { section: 'meta', item: '作成日', value: formatPlainValue(meta.createdAt, '未保存') },
    { section: 'meta', item: '最終更新日', value: formatPlainValue(meta.updatedAt, '未保存') },
  ];

  const demographicsRows: Array<[string, string | null]> = [
    ['ID', karte.demographics.accountId],
    ['氏名', karte.demographics.name],
    ['フリガナ', karte.demographics.nameKana],
    ['メール', karte.demographics.email],
    ['会社名', karte.demographics.company],
    ['部署', karte.demographics.department],
    ['職種', karte.demographics.jobTitle],
    ['権限', karte.demographics.permission],
    ['生年月日', karte.demographics.birthDate],
    ['勤務地(都道府県)', karte.demographics.workLocationPrefecture],
    ['転職歴(回数)', karte.demographics.jobChangeCount],
    ['勤続年数(年)', karte.demographics.yearsOfService],
    ['性別', karte.demographics.gender],
    ['現在の婚姻関係', karte.demographics.maritalStatus],
    ['子供の有無(人)', karte.demographics.childrenCount],
    ['末子の年齢(歳)', karte.demographics.youngestChildAge],
    ['過去のマネージャー経験', karte.demographics.managerExperience],
    ['現在マネージャーか', karte.demographics.currentManager],
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
    getShirpDetailFieldEntries(category).forEach(([field, definition]) => {
      const detailValue = karte.shirpDetails[category]?.[field];
      rows.push({
        section: 'shirp_detail',
        item: `${SHIRP_LABELS[category]} / ${definition.label}`,
        value: formatKarteValue(detailValue?.summary),
      });
      getShirpDetailItemEntries(category, field).forEach(([itemKey, itemLabel]) => {
        rows.push({
          section: 'shirp_detail',
          item: `${SHIRP_LABELS[category]} / ${definition.label} / ${itemLabel}`,
          value: formatPlainValue(detailValue?.items?.[itemKey], '未記載'),
        });
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

export const downloadKarteCsvBatch = (payloads: KarteBatchExportPayload[]) => {
  if (payloads.length === 0) return;
  const header = 'employeeId,employeeName,section,item,value';
  const body = payloads
    .flatMap((payload) =>
      buildCsvRows(payload).map((row) => [
        payload.employeeId ?? '',
        payload.employeeName ?? '',
        row.section,
        row.item,
        row.value,
      ]),
    )
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n');
  const csv = `\uFEFF${header}\r\n${body}`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), buildFileName('csv', 'career-karte-batch'));
};

const createCanvasPage = (): CanvasPage => {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('PDF出力用のキャンバスを初期化できませんでした。');
  }

  context.fillStyle = PDF_THEME.paper;
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.fillStyle = PDF_THEME.text;
  context.textBaseline = 'top';

  return {
    canvas,
    context,
    cursorY: PAGE_TOP,
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
  if (page.cursorY + requiredHeight > PAGE_HEIGHT - PAGE_BOTTOM) {
    page = createCanvasPage();
    pages.push(page);
  }
  return page;
};

const setFont = (
  context: CanvasRenderingContext2D,
  weight: 400 | 500 | 600 | 700,
  size: number,
  family = FONT_SANS,
  style: 'normal' | 'italic' = 'normal',
) => {
  context.font = `${style} ${weight} ${size}px ${family}`;
};

const drawLine = (
  context: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color = PDF_THEME.rule,
  width = 2,
  dashed = false,
) => {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  if (dashed) context.setLineDash([3, 5]);
  context.beginPath();
  context.moveTo(x1, y);
  context.lineTo(x2, y);
  context.stroke();
  context.restore();
};

const drawFooter = (page: CanvasPage, pageIndex: number, totalPages: number) => {
  const { context } = page;
  setFont(context, 400, 20, FONT_SERIF, 'italic');
  context.fillStyle = PDF_THEME.muted;
  const text = `Career Karte - page ${pageIndex + 1} / ${totalPages}`;
  context.fillText(text, PAGE_WIDTH - PAGE_MARGIN_X - context.measureText(text).width, PAGE_HEIGHT - 62);
};

const addPage = (pages: CanvasPage[]) => {
  const page = createCanvasPage();
  pages.push(page);
  return page;
};

const drawFirstPageHeader = (page: CanvasPage, payload: KarteBatchExportPayload) => {
  const { context } = page;
  drawLine(context, PAGE_MARGIN_X, 62, PAGE_WIDTH - PAGE_MARGIN_X, '#263856', 5);

  setFont(context, 400, 44, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText('HRdock', PAGE_MARGIN_X, 76);

  setFont(context, 400, 16, FONT_SERIF);
  context.fillStyle = PDF_THEME.muted;
  context.letterSpacing = '12px';
  context.fillText('CAREER KARTE', PAGE_MARGIN_X, 150);
  context.letterSpacing = '0px';

  const metaX = PAGE_WIDTH - PAGE_MARGIN_X - 300;
  setFont(context, 600, 18, FONT_SANS);
  context.fillStyle = PDF_THEME.muted;
  context.fillText('面 談 種 別', metaX, 90);
  context.fillText('作 成 日', metaX + 230, 90);

  setFont(context, 400, 24, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText(formatMeetingType(payload.meta.meetingType), metaX, 128);
  context.fillText(formatPdfDateTime(payload.meta.createdAt, '未保存'), metaX + 150, 128);

  drawLine(context, PAGE_MARGIN_X, 214, PAGE_WIDTH - PAGE_MARGIN_X, PDF_THEME.rule, 2);
  page.cursorY = 250;
};

const drawDocumentIntro = (page: CanvasPage) => {
  const { context } = page;
  setFont(context, 400, 18, FONT_SERIF, 'italic');
  context.fillStyle = PDF_THEME.copper;
  context.fillText('Career Dialogue Report - SHIRP Framework', PAGE_MARGIN_X, page.cursorY);
  page.cursorY += 58;

  setFont(context, 700, 42, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText('キャリアカルテ', PAGE_MARGIN_X, page.cursorY);
  page.cursorY += 66;

  setFont(context, 600, 21, FONT_SANS);
  context.fillStyle = '#566174';
  const lines = wrapText(
    context,
    '本ドキュメントは、SHIRPフレームワーク（現状／希望／課題／資源／計画）に基づき、対話で得られた情報を構造化したキャリア面談の記録である。',
    CONTENT_WIDTH,
  );
  lines.forEach((line) => {
    context.fillText(line, PAGE_MARGIN_X, page.cursorY);
    page.cursorY += 34;
  });
  page.cursorY += 34;
  drawLine(context, PAGE_MARGIN_X, page.cursorY, PAGE_WIDTH - PAGE_MARGIN_X, PDF_THEME.rule, 2);
  page.cursorY += 38;
};

const drawProfileSection = (page: CanvasPage, payload: KarteBatchExportPayload) => {
  const { context } = page;
  const { demographics } = payload.karte;
  const y = page.cursorY;
  const height = 600;
  context.fillStyle = PDF_THEME.panel;
  context.fillRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height);
  context.fillStyle = '#263856';
  context.fillRect(PAGE_MARGIN_X, y, 5, height);
  drawLine(context, PAGE_MARGIN_X, y, PAGE_WIDTH - PAGE_MARGIN_X, PDF_THEME.rule, 2);
  drawLine(context, PAGE_MARGIN_X, y + height, PAGE_WIDTH - PAGE_MARGIN_X, PDF_THEME.rule, 2);

  const leftX = PAGE_MARGIN_X + 58;
  const rightX = PAGE_MARGIN_X + Math.round(CONTENT_WIDTH * 0.56);
  setFont(context, 400, 15, FONT_SERIF);
  context.fillStyle = PDF_THEME.muted;
  context.letterSpacing = '8px';
  context.fillText('PROFILE', leftX, y + 56);
  context.letterSpacing = '0px';

  setFont(context, 700, 34, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText(formatPlainValue(payload.employeeName ?? demographics.name), leftX, y + 108);

  drawLine(context, rightX, y + 72, PAGE_WIDTH - PAGE_MARGIN_X - 40, PDF_THEME.rule, 2);
  setFont(context, 400, 19, FONT_SERIF);
  context.fillStyle = PDF_THEME.muted;
  context.fillText('基 本 情 報', rightX, y + 104);

  const leftRows: Array<[string, string]> = [
    ['氏名', formatPlainValue(demographics.name)],
    ['フリガナ', formatPlainValue(demographics.nameKana)],
    ['会社名', formatPlainValue(demographics.company)],
    ['部署', formatPlainValue(demographics.department)],
    ['職種', formatPlainValue(demographics.jobTitle)],
    ['権限', formatPlainValue(demographics.permission)],
  ];
  const rightRows: Array<[string, string]> = [
    ['生年月日', formatPlainValue(demographics.birthDate)],
    ['性別', formatPlainValue(demographics.gender)],
    ['勤続年数(年)', formatPlainValue(demographics.yearsOfService)],
    ['転職歴(回数)', formatPlainValue(demographics.jobChangeCount)],
    ['勤務地(都道府県)', formatPlainValue(demographics.workLocationPrefecture)],
    ['現在の婚姻関係', formatPlainValue(demographics.maritalStatus)],
    ['子供の有無(人)', formatPlainValue(demographics.childrenCount, '-')],
    ['末子の年齢(歳)', formatPlainValue(demographics.youngestChildAge, '-')],
    ['過去のマネージャー経験', formatPlainValue(demographics.managerExperience, '-')],
    ['現在マネージャーか', formatPlainValue(demographics.currentManager, '-')],
  ];

  const drawProfileGrid = (
    rows: Array<[string, string]>,
    x: number,
    startY: number,
    columnWidth: number,
    columnGap: number,
    columns = 2,
  ) => {
    let rowY = startY;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += columns) {
      const rowCells = rows.slice(rowIndex, rowIndex + columns);
      setFont(context, 400, 20, FONT_SERIF);
      const wrappedValues = rowCells.map(([, value]) => wrapText(context, value, columnWidth));
      const rowHeight = Math.max(76, Math.max(...wrappedValues.map((lines) => lines.length)) * 27 + 50);

      rowCells.forEach(([label], columnIndex) => {
        const cellX = x + columnIndex * (columnWidth + columnGap);
        setFont(context, 600, 17, FONT_SANS);
        context.fillStyle = PDF_THEME.muted;
        context.fillText(label, cellX, rowY);
        setFont(context, 400, 20, FONT_SERIF);
        context.fillStyle = PDF_THEME.text;
        (wrappedValues[columnIndex] ?? ['-']).forEach((line, lineIndex) => {
          context.fillText(line, cellX, rowY + 28 + lineIndex * 27);
        });
        drawLine(context, cellX, rowY + rowHeight - 8, cellX + columnWidth, PDF_THEME.rule, 1, true);
      });

      rowY += rowHeight + 8;
    }
  };

  drawProfileGrid(leftRows, leftX, y + 198, 220, 42);
  drawProfileGrid(rightRows, rightX, y + 166, 210, 40);

  page.cursorY = y + height + 34;
};

const drawChapterTitle = (page: CanvasPage, chapter: string, title: string, subtitle: string) => {
  const { context } = page;
  setFont(context, 700, 36, FONT_SERIF, 'italic');
  context.fillStyle = PDF_THEME.copper;
  context.fillText(chapter, PAGE_MARGIN_X, page.cursorY);

  setFont(context, 700, 42, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText(title, PAGE_MARGIN_X + 76, page.cursorY - 4);

  setFont(context, 600, 24, FONT_SANS);
  context.fillStyle = '#566174';
  context.fillText(subtitle, PAGE_MARGIN_X + 76, page.cursorY + 76);

  drawLine(context, PAGE_MARGIN_X, page.cursorY + 130, PAGE_WIDTH - PAGE_MARGIN_X, PDF_THEME.ruleStrong, 4);
  page.cursorY += 172;
};

const drawMutedRule = (context: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) => {
  drawLine(context, x, y, x + width, PDF_THEME.rule, 2);
  drawLine(context, x, y, x + 50, color, 4);
};

const SUMMARY_BODY_FONT_SIZE = 20;
const SUMMARY_BODY_LINE_HEIGHT = 28;
const SUMMARY_BODY_TOP_OFFSET = 238;
const SUMMARY_CARD_BOTTOM_PADDING = 36;

const measureSummaryCardHeight = (
  context: CanvasRenderingContext2D,
  value: string,
  width: number,
  minHeight: number,
) => {
  setFont(context, 400, SUMMARY_BODY_FONT_SIZE, FONT_SANS);
  const lineCount = Math.max(1, wrapText(context, value, width - 72).length);
  return Math.max(minHeight, SUMMARY_BODY_TOP_OFFSET + lineCount * SUMMARY_BODY_LINE_HEIGHT + SUMMARY_CARD_BOTTOM_PADDING);
};

const drawSummaryCard = (
  page: CanvasPage,
  category: ShirpDetailCategoryKey,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
) => {
  const { context } = page;
  const meta = CATEGORY_META[category];
  context.fillStyle = PDF_THEME.paper;
  context.fillRect(x, y, width, height);
  context.strokeStyle = PDF_THEME.rule;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.fillStyle = meta.color;
  context.fillRect(x, y, 7, height);

  setFont(context, 700, 56, FONT_SERIF);
  context.fillStyle = meta.color;
  context.fillText(meta.letter, x + 50, y + 54);

  setFont(context, 700, 32, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText(meta.title, x + 132, y + 56);
  setFont(context, 400, 22, FONT_SERIF, 'italic');
  context.fillStyle = PDF_THEME.muted;
  context.fillText(meta.english, x + 132, y + 96);

  setFont(context, 600, 20, FONT_SANS);
  context.fillStyle = PDF_THEME.muted;
  context.fillText(meta.description, x + 36, y + 156);
  drawMutedRule(context, x + 36, y + 202, width - 72, meta.color);

  setFont(context, 400, SUMMARY_BODY_FONT_SIZE, FONT_SANS);
  context.fillStyle = PDF_THEME.text;
  const lines = wrapText(context, value, width - 72);
  lines.forEach((line, index) => {
    context.fillText(line, x + 36, y + SUMMARY_BODY_TOP_OFFSET + index * SUMMARY_BODY_LINE_HEIGHT);
  });
};

const drawSummaryPage = (pages: CanvasPage[], karte: KarteData) => {
  const page = addPage(pages);
  drawChapterTitle(page, '01', 'SHIRP サマリー', '対話全体から抽出された5つの観点ごとの要約');

  const gap = 24;
  const cardWidth = Math.floor((CONTENT_WIDTH - gap) / 2);
  const left = PAGE_MARGIN_X;
  const right = PAGE_MARGIN_X + cardWidth + gap;
  const top = page.cursorY + 8;
  const summaryValues = {
    S: formatKarteValue(karte.shirp.S),
    H: formatKarteValue(karte.shirp.H),
    I: formatKarteValue(karte.shirp.I),
    R: formatKarteValue(karte.shirp.R),
    P: formatKarteValue(karte.shirp.P),
  } satisfies Record<ShirpDetailCategoryKey, string>;
  const firstRowHeight = Math.max(
    measureSummaryCardHeight(page.context, summaryValues.S, cardWidth, 340),
    measureSummaryCardHeight(page.context, summaryValues.H, cardWidth, 340),
  );
  const secondRowHeight = Math.max(
    measureSummaryCardHeight(page.context, summaryValues.I, cardWidth, 340),
    measureSummaryCardHeight(page.context, summaryValues.R, cardWidth, 340),
  );
  drawSummaryCard(page, 'S', left, top, cardWidth, firstRowHeight, summaryValues.S);
  drawSummaryCard(page, 'H', right, top, cardWidth, firstRowHeight, summaryValues.H);
  drawSummaryCard(page, 'I', left, top + firstRowHeight + gap, cardWidth, secondRowHeight, summaryValues.I);
  drawSummaryCard(page, 'R', right, top + firstRowHeight + gap, cardWidth, secondRowHeight, summaryValues.R);

  const pHeight = measureSummaryCardHeight(page.context, summaryValues.P, CONTENT_WIDTH, 300);
  let pPage = page;
  let pTop = top + firstRowHeight + gap + secondRowHeight + gap;
  if (pTop + pHeight > PAGE_HEIGHT - PAGE_BOTTOM) {
    pPage = addPage(pages);
    drawChapterTitle(pPage, '01', 'SHIRP サマリー', '計画の要約');
    pTop = pPage.cursorY + 8;
  }
  drawSummaryCard(pPage, 'P', left, pTop, CONTENT_WIDTH, pHeight, summaryValues.P);
};

const drawCategoryBand = (pages: CanvasPage[], category: ShirpDetailCategoryKey) => {
  const page = ensureSpace(pages, 170);
  const meta = CATEGORY_META[category];
  const { context } = page;
  const y = page.cursorY;
  context.fillStyle = meta.color;
  context.fillRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, 150);
  context.strokeStyle = meta.color;
  context.lineWidth = 2;
  context.strokeRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, 150);

  const letterBoxX = PAGE_MARGIN_X + 28;
  const letterBoxY = y + 32;
  const letterBoxWidth = 50;
  const letterBoxHeight = 84;
  context.strokeStyle = 'rgba(255,255,255,0.5)';
  context.lineWidth = 2;
  context.strokeRect(letterBoxX, letterBoxY, letterBoxWidth, letterBoxHeight);

  setFont(context, 700, 44, FONT_SERIF);
  context.fillStyle = '#ffffff';
  context.fillText(meta.letter, letterBoxX + (letterBoxWidth - context.measureText(meta.letter).width) / 2 - 2, y + 52);

  setFont(context, 700, 34, FONT_SERIF);
  context.fillText(meta.title, PAGE_MARGIN_X + 110, y + 36);
  setFont(context, 400, 24, FONT_SERIF, 'italic');
  context.fillText(`/ ${meta.english}`, PAGE_MARGIN_X + 196, y + 42);
  setFont(context, 400, 22, FONT_SANS);
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.fillText(meta.description, PAGE_MARGIN_X + 110, y + 88);
  page.cursorY += 190;
};

const drawDetailField = (
  pages: CanvasPage[],
  category: ShirpDetailCategoryKey,
  index: number,
  title: string,
  summary: string,
  items: Array<[string, string]>,
) => {
  const meta = CATEGORY_META[category];
  let page = ensureSpace(pages, 160);
  let { context } = page;

  setFont(context, 700, 22, FONT_SERIF, 'italic');
  context.fillStyle = meta.color;
  context.fillText(String(index).padStart(2, '0'), PAGE_MARGIN_X + 30, page.cursorY + 10);
  setFont(context, 700, 30, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText(title, PAGE_MARGIN_X + 74, page.cursorY);
  drawMutedRule(context, PAGE_MARGIN_X + 74, page.cursorY + 56, CONTENT_WIDTH - 104, meta.color);
  page.cursorY += 88;

  setFont(context, 700, 25, FONT_SANS);
  context.fillStyle = PDF_THEME.text;
  wrapText(context, summary, CONTENT_WIDTH - 74).forEach((line) => {
    page = ensureSpace(pages, 36);
    setFont(page.context, 700, 25, FONT_SANS);
    page.context.fillStyle = PDF_THEME.text;
    page.context.fillText(line, PAGE_MARGIN_X + 74, page.cursorY);
    page.cursorY += 36;
  });
  page.cursorY += 22;

  items.forEach(([label, value]) => {
    setFont(page.context, 400, 22, FONT_SANS);
    const valueLines = wrapText(page.context, value, CONTENT_WIDTH - 330);
    const rowHeight = Math.max(54, valueLines.length * 32 + 18);
    page = ensureSpace(pages, rowHeight + 8);
    context = page.context;
    setFont(context, 400, 22, FONT_SANS);
    context.fillStyle = meta.color;
    context.fillText('-', PAGE_MARGIN_X + 74, page.cursorY + 4);
    context.fillStyle = '#566174';
    context.fillText(label, PAGE_MARGIN_X + 98, page.cursorY);
    context.fillStyle = PDF_THEME.text;
    valueLines.forEach((line, lineIndex) => {
      context.fillText(line, PAGE_MARGIN_X + 330, page.cursorY + lineIndex * 32);
    });
    drawLine(context, PAGE_MARGIN_X + 74, page.cursorY + rowHeight - 8, PAGE_WIDTH - PAGE_MARGIN_X - 30, PDF_THEME.dash, 1, true);
    page.cursorY += rowHeight;
  });

  page.cursorY += 36;
};

const drawDetailPages = (pages: CanvasPage[], karte: KarteData) => {
  const firstPage = addPage(pages);
  drawChapterTitle(firstPage, '02', 'SHIRP 詳細', 'SHIRPの各観点について、中カテゴリ／小項目単位で記載');

  SHIRP_DETAIL_CATEGORY_KEYS.forEach((category) => {
    drawCategoryBand(pages, category);
    getShirpDetailFieldEntries(category).forEach(([field, definition], index) => {
      const detailValue = karte.shirpDetails[category]?.[field];
      const items = getShirpDetailItemEntries(category, field).map(([itemKey, itemLabel]) => [
        itemLabel,
        formatPlainValue(detailValue?.items?.[itemKey], '-'),
      ] as [string, string]);
      drawDetailField(pages, category, index + 1, definition.label, formatKarteValue(detailValue?.summary), items);
    });
  });
};

const drawSupplementSectionTitle = (pages: CanvasPage[], title: string, accent = PDF_THEME.ruleStrong) => {
  const page = ensureSpace(pages, 120);
  const { context } = page;
  setFont(context, 700, 30, FONT_SERIF);
  context.fillStyle = PDF_THEME.text;
  context.fillText(title, PAGE_MARGIN_X + 74, page.cursorY);
  drawMutedRule(context, PAGE_MARGIN_X + 74, page.cursorY + 58, CONTENT_WIDTH - 104, accent);
  page.cursorY += 92;
};

const drawParagraphBlock = (pages: CanvasPage[], text: string, accent = PDF_THEME.ruleStrong) => {
  let page = ensureSpace(pages, 90);
  const lines = wrapText(page.context, text, CONTENT_WIDTH - 148);
  lines.forEach((line) => {
    page = ensureSpace(pages, 36);
    setFont(page.context, 600, 24, FONT_SANS);
    page.context.fillStyle = PDF_THEME.text;
    page.context.fillText(line, PAGE_MARGIN_X + 74, page.cursorY);
    page.cursorY += 36;
  });
  drawLine(page.context, PAGE_MARGIN_X + 74, page.cursorY + 16, PAGE_WIDTH - PAGE_MARGIN_X - 30, accent, 1);
  page.cursorY += 46;
};

const drawSimpleRows = (pages: CanvasPage[], rows: Array<[string, string]>, accent = PDF_THEME.ruleStrong) => {
  rows.forEach(([label, value]) => {
    let page = ensureSpace(pages, 60);
    setFont(page.context, 400, 22, FONT_SANS);
    const valueLines = wrapText(page.context, value, CONTENT_WIDTH - 330);
    const rowHeight = Math.max(56, valueLines.length * 32 + 18);
    page = ensureSpace(pages, rowHeight + 6);
    const { context } = page;
    setFont(context, 400, 22, FONT_SANS);
    context.fillStyle = accent;
    context.fillText('-', PAGE_MARGIN_X + 74, page.cursorY + 4);
    context.fillStyle = '#566174';
    context.fillText(label, PAGE_MARGIN_X + 98, page.cursorY);
    context.fillStyle = PDF_THEME.text;
    valueLines.forEach((line, index) => {
      context.fillText(line, PAGE_MARGIN_X + 330, page.cursorY + index * 32);
    });
    drawLine(context, PAGE_MARGIN_X + 74, page.cursorY + rowHeight - 8, PAGE_WIDTH - PAGE_MARGIN_X - 30, PDF_THEME.dash, 1, true);
    page.cursorY += rowHeight;
  });
  pages[pages.length - 1].cursorY += 24;
};

const drawSurveySupplement = (pages: CanvasPage[], karte: KarteData) => {
  drawSupplementSectionTitle(pages, 'アンケート', '#566174');

  if (!hasSurveyResponses(karte)) {
    drawSimpleRows(pages, [['アンケート結果', '未回答']], '#566174');
    return;
  }

  const chartSize = 340;
  const page = ensureSpace(pages, chartSize + 58);
  const model = createSurveyRadarModel(
    SURVEY_FACTOR_KEYS.map((key) => SURVEY_LABELS[key]),
    SURVEY_FACTOR_KEYS.map((key) => karte.survey.factors[key] ?? 0),
    100,
    chartSize,
  );
  const chartX = PAGE_MARGIN_X + Math.round((CONTENT_WIDTH - model.canvasSize) / 2);
  drawSurveyRadarOnCanvas(page.context, model, chartX, page.cursorY);
  page.cursorY += model.canvasSize + 32;

  drawSimpleRows(
    pages,
    [
      ['最終更新', formatPlainValue(karte.survey.lastUpdated, '未回答')],
      ...SURVEY_FACTOR_KEYS.map((key) => [SURVEY_LABELS[key], `${formatSurveyValue(karte.survey.factors[key])}点 / 100点`] as [string, string]),
    ],
    '#566174',
  );
};

const buildKartePdfPages = (payload: KarteBatchExportPayload) => {
  const pages = [createCanvasPage()];
  const { karte, meta } = payload;

  drawFirstPageHeader(pages[0], payload);
  drawDocumentIntro(pages[0]);
  drawProfileSection(pages[0], payload);

  drawSummaryPage(pages, karte);
  drawDetailPages(pages, karte);

  const supplementPage = addPage(pages);
  drawChapterTitle(supplementPage, '03', '補足情報', 'その他、フィードバック、アンケート、面談前コンディション');
  drawSupplementSectionTitle(pages, 'その他', '#566174');
  drawParagraphBlock(pages, formatKarteValue(karte.shirp['#']), '#566174');

  drawSupplementSectionTitle(pages, '面談フィードバック', '#566174');
  drawParagraphBlock(pages, formatPlainValue(meta.feedback, 'なし'), '#566174');

  drawSurveySupplement(pages, karte);

  drawSupplementSectionTitle(pages, '面談前コンディション', PDF_THEME.copper);
  drawSimpleRows(
    pages,
    [
      ['緊張度スコア', karte.conditionSummary ? `${karte.conditionSummary.score} / 100` : '未測定'],
      ['レベル', formatConditionValue(karte.conditionSummary?.level)],
      ['測定日時', formatConditionValue(karte.conditionSummary?.measuredAt)],
      ['注意', '表情から面談前後の緊張傾向を参考値として表示するもので、医療・心理診断ではありません。'],
    ],
    PDF_THEME.copper,
  );

  const totalPages = pages.length;
  pages.forEach((page, index) => drawFooter(page, index, totalPages));

  return pages;
};

const addCanvasPagesToPdf = (pdf: jsPDF, pages: CanvasPage[], hasExistingPage: boolean) => {
  pages.forEach((page, index) => {
    if (hasExistingPage || index > 0) {
      pdf.addPage();
    }
    pdf.addImage(page.canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  });
};

export const downloadKartePdf = async (payload: KarteExportPayload) => {
  const pages = buildKartePdfPages(payload);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addCanvasPagesToPdf(pdf, pages, false);

  pdf.save(buildFileName('pdf'));
};

export const downloadKartePdfBatch = async (payloads: KarteBatchExportPayload[]) => {
  if (payloads.length === 0) return;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  payloads.forEach((payload, index) => {
    addCanvasPagesToPdf(pdf, buildKartePdfPages(payload), index > 0);
  });

  pdf.save(buildFileName('pdf', 'career-karte-batch'));
};

export const printKartePayloads = async (payloads: KarteBatchExportPayload[]) => {
  if (payloads.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) {
    throw new Error('印刷用ウィンドウを開けませんでした。ポップアップブロックを確認してください。');
  }

  const imageTags = payloads
    .flatMap((payload) => buildKartePdfPages(payload).map((page) => page.canvas.toDataURL('image/png')))
    .map((src) => `<img class="page" src="${src}" alt="キャリアカルテ" />`)
    .join('');

  printWindow.document.open();
  printWindow.document.write(`
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>キャリアカルテ印刷</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f1f5f9; }
      .page {
        display: block;
        width: 210mm;
        height: 297mm;
        margin: 0 auto;
        page-break-after: always;
        background: white;
      }
      .page:last-child { page-break-after: auto; }
      @media print {
        body { background: white; }
        .page { margin: 0; }
      }
    </style>
  </head>
  <body>${imageTags}</body>
</html>
`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 300);
};
