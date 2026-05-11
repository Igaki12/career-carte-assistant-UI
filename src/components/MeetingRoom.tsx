import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { FaMicrophone, FaPaperPlane, FaUpDown, FaUserDoctor, FaWandMagicSparkles } from 'react-icons/fa6';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ApiKeyModal from './ApiKeyModal';
import KartePanel from './KartePanel';
import ProcessingIndicator from './ProcessingIndicator';
import VrmStage, { type SpeechMotionFrame, type StageModelId } from './VrmStage';
import {
  applyDemographicsToKarte,
  applyConditionToKarte,
  createEmptyKarte,
  getLatestConditionRecord,
  isStressAnalysisEnabled,
  loadDemoUserState,
  saveDemoUserState,
} from '../lib/demoUserState';
import {
  consumeCompanyApiUsage,
  getDemoUsageQuota,
  getMeetingQuotaSummary,
  subscribeDemoUsageQuota,
  type DemoUsageQuota,
} from '../lib/demoUsageQuota';
import {
  getInitialDetailStepLabel,
  INITIAL_REQUIRED_SHIRP_DETAIL_STEPS,
  SHIRP_DETAIL_CATEGORY_KEYS,
  SHIRP_DETAIL_DEFINITIONS,
  SHIRP_DETAIL_FIELDS,
  SHIRP_DETAIL_ITEM_LABELS,
  SHIRP_DETAIL_PROMPT_HINTS,
  SHIRP_LABELS,
} from '../lib/shirp';
import { INITIAL_PROMPT_VARIANTS, SHIRP_KEYS } from '../types';
import type {
  ContinuousMode,
  ConversationMessage,
  DemoUserState,
  InitialPromptVariant,
  KarteData,
  LlmResponse,
  MeetingType,
  ShirpDetailCategoryKey,
  ShirpDetailUpdates,
  ShirpDetailsData,
  ShirpKey,
  StoredKarteRecord,
} from '../types';

type Props = {
  meetingType: MeetingType;
  continuousMode?: ContinuousMode;
};

type LlmProcessMode = 'normal' | 'initialFinalize' | 'continuousFinalize';

const LEGACY_LOCAL_STORAGE_OPENAI_KEY = 'cca-api-key';
const LOCAL_STORAGE_OPENAI_KEY = 'cca-openai-api-key';
const LOCAL_STORAGE_GEMINI_KEY = 'cca-gemini-api-key';
const OPENAI_MEETING_MODEL = 'gpt-4o-2024-11-20';
const GEMINI_TTS_PROMPT_PREFIX = 'Read aloud in a warm and friendly tone: ';
const GEMINI_VOICE_BY_MODEL: Record<StageModelId, string> = {
  sample: 'Kore',
  trial2: 'Zephyr',
  youngCounsil: 'Zephyr',
};
const MEETING_RESPONSE_SCHEMA_NAME = 'meeting_room_response';
const MEETING_INITIAL_FINALIZE_RESPONSE_SCHEMA_NAME = 'meeting_room_initial_finalize_response';
const MEETING_FINALIZE_RESPONSE_SCHEMA_NAME = 'meeting_room_finalize_response';
const SHIRP_SCHEMA_PROPERTIES = {
  S: { type: ['string', 'null'] },
  H: { type: ['string', 'null'] },
  I: { type: ['string', 'null'] },
  R: { type: ['string', 'null'] },
  P: { type: ['string', 'null'] },
  '#': { type: ['string', 'null'] },
} as const;

const buildShirpDetailFieldSchema = (category: ShirpDetailCategoryKey, field: string) => {
  const items = Object.keys(SHIRP_DETAIL_ITEM_LABELS[category][field]);
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: ['string', 'null'] },
      items: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(items.map((itemKey) => [itemKey, { type: ['string', 'null'] }])),
        required: items,
      },
    },
    required: ['summary', 'items'],
  };
};

const SHIRP_DETAIL_SCHEMA_PROPERTIES = Object.freeze(
  Object.fromEntries(
    SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [
      category,
      {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(
          SHIRP_DETAIL_FIELDS[category].map((field) => [field, buildShirpDetailFieldSchema(category, field)]),
        ),
        required: [...SHIRP_DETAIL_FIELDS[category]],
      },
    ]),
  ),
) as Record<ShirpDetailCategoryKey, unknown>;
const INTERNAL_REPLY_PATTERNS = [
  /["“”']updated_shirp["“”']\s*:/i,
  /["“”']updated_shirp_details["“”']\s*:/i,
  /["“”']is_complete["“”']\s*:/i,
  /["“”']feedback["“”']\s*:/i,
  /(?:\{|\[)\s*["“”']reply["“”']\s*:/i,
];

const SHIRP_GUIDE = `
${(['S', 'H', 'I', 'R', 'P'] as const)
  .map((category) => {
    const lines = SHIRP_DETAIL_FIELDS[category].map((field) => {
      const definition = SHIRP_DETAIL_DEFINITIONS[category][field];
      const itemLabels = Object.values(definition.items).join(' / ');
      return `- ${definition.label}: ${itemLabels}`;
    });
    return `${SHIRP_LABELS[category]}:\n${lines.join('\n')}`;
  })
  .join('\n')}
# (その他):
- S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄。
`;

type InitialDetailStep = (typeof INITIAL_REQUIRED_SHIRP_DETAIL_STEPS)[number];

const greetingForMeeting = (meetingType: MeetingType) =>
  meetingType === 'initial'
    ? 'こんにちは。キャリアメンターです。まずは現状の働く条件から伺います。今の収入や労働時間、勤務形態、作業環境などについて、どのように感じていますか。なお、この対話は事前準備であり、実際の面談が本番です。'
    : 'こんにちは。キャリアメンターです。今日は自由にお話しください。必要に応じて、前回のカルテ内容を更新していきます。なお、この対話は事前準備であり、実際の面談が本番です。';

const AI_RESPONSE_GUIDELINES = `
# AI応答ガイドライン
- トーンは「安心感」「共感」「フラット」を徹底してください。
- この会話は事前準備であり、実際の面談が本番であることを必ず明示してください。
- 次の禁止事項を厳守してください:
  1) 転職を直接推奨しない
  2) 法律・医療の断定をしない
  3) 会社批判への誘導をしない
`;

type InitialPromptInstructionContext = {
  currentStepLabel: string;
  followingStepLabel: string;
};

type InitialPromptVariantOption = {
  value: InitialPromptVariant;
  label: string;
  description: string;
  buildInstructions: (context: InitialPromptInstructionContext) => string;
};

const buildCurrentInitialPromptInstructions = ({
  currentStepLabel,
  followingStepLabel,
}: InitialPromptInstructionContext) => `
# 指示
1. ユーザーの発話から情報を抽出し、updated_shirp でトップレベル要約を、updated_shirp_details で二段目要約と分かる範囲の三段目項目を更新してください。
2. reply は「短い受け止め + すぐ次の1問」で構成してください。冗長なまとめ、前置き、励まし、次回予告は不要です。
3. 今回の「${currentStepLabel}」が今回の発話で十分に埋まる場合は、reply の最後で次の候補「${followingStepLabel}」について自然に1問だけ聞いてください。
4. 今回の「${currentStepLabel}」がまだ不十分な場合だけ、同じ項目を追加で1問深掘りしてください。
5. is_complete は、必須詳細項目17件の二段目要約がすべて埋まった時だけ true にしてください。それまでは false にしてください。
6. 必須詳細項目がすべて埋まった場合は、P(計画)や保存案内を作らず、「必要項目が揃いました。カルテと今後のプランを整理します。」という趣旨の短い返答にしてください。
7. P(計画)のトップレベル要約、詳細計画、最終的な提出案内は、この後に実行される最終分析プロンプトが担当します。
8. トップレベルの S/H/I/R は、詳細項目を踏まえた短い要約文にしてください。
9. 三段目項目は会話から自然に読み取れるものだけ埋め、判断できないものは null のままにしてください。S〜Pに当てはまらない内容は#に記録してください。
10. reply は原則2文以内、かつ最後は必ず1つの質問文で終えてください。is_complete が true の完了時だけは質問で終えないでください。
11. 「次回の面談で」「後ほど」「この調子で」「引き続きよろしくお願いします」など、流れを止める定型文は使わないでください。
12. response_format の JSON Schema に厳密に従って出力してください。reply にはユーザーに見せる自然な返答だけを書いてください。
13. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
14. デモグラフィックは既知情報として理解しつつ、断定や過剰な言及は避けてください。既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
`.trim();

const buildFrontLightInitialPromptInstructions = (context: InitialPromptInstructionContext) => `
${buildCurrentInitialPromptInstructions(context)}
15. 前半(S/H)では、トップレベル要約は短く保ち、二段目summaryに必要十分な要約を置いてください。三段目項目は明確に言及された内容だけ更新してください。
16. 後半(I/R)でも前半と同じ粒度を維持し、現在フォーカスしている項目の二段目summaryは毎ターン必ず更新候補として返してください。
17. 前半で細部を詰めすぎず、後半の課題・資源の抽出に同じ注意量を残す前提で質問してください。
18. すでに十分な前半情報がある場合は追加で掘りすぎず、自然に次の項目へ進めてください。
`.trim();

const buildLateFocusInitialPromptInstructions = (context: InitialPromptInstructionContext) => `
${buildCurrentInitialPromptInstructions(context)}
15. 面談後半でも集中度を落とさず、現在フォーカスしている項目の二段目summaryを空欄にしないことを優先してください。
16. ユーザー発話から自然に読み取れる三段目項目が1つ以上ある場合は、必ず少なくとも1つ更新候補に含めてください。
17. 現在項目の根拠が曖昧な場合は、次項目へ進まず同じ項目を1問だけ深掘りしてください。
18. 前半のテンポは現行と同じに保ちつつ、I/Rでは課題・資源の具体性が落ちないようにしてください。
`.trim();

const buildCoverageFirstInitialPromptInstructions = (context: InitialPromptInstructionContext) => `
${buildCurrentInitialPromptInstructions(context)}
15. カルテ充足を優先し、現在フォーカスしている項目の二段目summaryと最低限の根拠が取れるまでは次項目へ進まないでください。
16. 「十分に埋まった」と判断する条件は、現在項目についてユーザーの状況・希望・課題・資源のいずれかが具体的に要約できることです。
17. 情報が広すぎる場合は、次項目へ進む前に1つだけ確認質問を挟んで、summaryに残せる粒度まで具体化してください。
18. reply は2文以内を維持し、質問は1つだけにしてください。会話ターン数が増えても、空欄を減らすことを優先してください。
`.trim();

const INITIAL_PROMPT_VARIANT_OPTIONS: readonly InitialPromptVariantOption[] = Object.freeze([
  {
    value: 'current',
    label: '現行',
    description: '現在の初回面談プロンプトをそのまま使う比較用ベースラインです。',
    buildInstructions: buildCurrentInitialPromptInstructions,
  },
  {
    value: 'front_light',
    label: '前半軽量',
    description: 'S/Hを詰めすぎず、I/Rまで同じ粒度で記録しやすくします。',
    buildInstructions: buildFrontLightInitialPromptInstructions,
  },
  {
    value: 'late_focus',
    label: '後半集中',
    description: '後半でもsummaryと三段目候補を落とさないようにします。',
    buildInstructions: buildLateFocusInitialPromptInstructions,
  },
  {
    value: 'coverage_first',
    label: '充足優先',
    description: '空欄を減らすため、現在項目をやや丁寧に埋めてから進みます。',
    buildInstructions: buildCoverageFirstInitialPromptInstructions,
  },
]);

const getInitialPromptVariantOption = (variant: InitialPromptVariant) =>
  INITIAL_PROMPT_VARIANT_OPTIONS.find((option) => option.value === variant) ?? INITIAL_PROMPT_VARIANT_OPTIONS[0];

const normalizeInitialPromptVariant = (value: unknown): InitialPromptVariant =>
  typeof value === 'string' && INITIAL_PROMPT_VARIANTS.includes(value as InitialPromptVariant)
    ? (value as InitialPromptVariant)
    : 'current';

const formatDraftTimestamp = () =>
  new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildDemographicPromptContext = (karte: KarteData) => {
  const demographicPairs = [
    // 面談内容の推論に直接使いにくい識別・連絡・権限情報は、AI応答プロンプトには含めない。
    // ['ID', karte.demographics.accountId],
    // ['氏名', karte.demographics.name],
    // ['メール', karte.demographics.email],
    ['会社名', karte.demographics.company],
    ['部署', karte.demographics.department],
    ['職種', karte.demographics.jobTitle],
    // ['権限', karte.demographics.permission],
    ['年齢', karte.demographics.age],
    ['勤務地', karte.demographics.workLocationPrefecture],
    ['転職歴', karte.demographics.jobChangeCount],
    ['勤続年数', karte.demographics.yearsOfService],
    ['性別', karte.demographics.gender],
    ['婚姻', karte.demographics.maritalStatus],
    ['子供', karte.demographics.childrenCount],
    ['末子年齢', karte.demographics.youngestChildAge],
  ].filter(([, value]) => typeof value === 'string' && value.trim().length > 0);

  if (demographicPairs.length === 0) {
    return '';
  }

  return `
# 事前設定されたデモグラフィック
${demographicPairs.map(([label, value]) => `- ${label}: ${value}`).join('\n')}
`;
};

const getInitialProgress = (shirpDetails: ShirpDetailsData) => {
  const total = INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.length;
  const filled = INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.reduce(
    (acc, step) => {
      const summary = shirpDetails[step.category]?.[step.field]?.summary;
      return summary ? acc + 1 : acc;
    },
    0,
  );
  return Math.round((filled / total) * 100);
};

const getInitialProgressCount = (shirpDetails: ShirpDetailsData) =>
  INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.reduce((acc, step) => {
    const summary = shirpDetails[step.category]?.[step.field]?.summary;
    return summary ? acc + 1 : acc;
  }, 0);

const getNextInitialDetailStep = (shirpDetails: ShirpDetailsData): InitialDetailStep | null =>
  INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.find((step) => {
    const summary = shirpDetails[step.category]?.[step.field]?.summary;
    return !summary;
  }) ?? null;

const getFollowingInitialDetailStep = (step: InitialDetailStep | null): InitialDetailStep | null => {
  if (!step) return null;
  const currentIndex = INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.findIndex(
    (candidate) => candidate.category === step.category && candidate.field === step.field,
  );
  if (currentIndex < 0) return null;
  return INITIAL_REQUIRED_SHIRP_DETAIL_STEPS[currentIndex + 1] ?? null;
};

const createSilentSpeechMotion = (): SpeechMotionFrame => ({
  speaking: false,
  rms: 0,
  low: 0,
  mid: 0,
  high: 0,
  updatedAt: 0,
});

const buildInitialPrompt = (karte: KarteData, nextStep: InitialDetailStep | null, variant: InitialPromptVariant) => {
  const currentCategory = nextStep?.category ?? 'S';
  const currentField = nextStep?.field;
  const followingStep = getFollowingInitialDetailStep(nextStep);
  const currentStepLabel = currentField
    ? getInitialDetailStepLabel(currentCategory, currentField)
    : 'P. 計画生成と全体整理';
  const currentPromptHint = currentField
    ? SHIRP_DETAIL_PROMPT_HINTS[currentCategory][currentField]
    : '全体要約と計画生成';
  const followingStepLabel =
    followingStep ? getInitialDetailStepLabel(followingStep.category, followingStep.field) : 'P. 計画生成と全体整理';
  const variantOption = getInitialPromptVariantOption(variant);
  return `
あなたは経験豊富なキャリアメンターです。初回面談ではSHIRP形式のうち、S→H→I→Rの順で詳細項目を1つずつ埋めます。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

# 今回フォーカスする詳細項目
- 項目: ${currentStepLabel}
- 確認したい内容: ${currentPromptHint}

# この項目が十分に埋まった場合に次に聞く候補
- ${followingStepLabel}

${AI_RESPONSE_GUIDELINES}

${variantOption.buildInstructions({ currentStepLabel, followingStepLabel })}
`.trim();
};

const buildContinuousPrompt = (karte: KarteData) => `
あなたはキャリアメンターとして自由対話モードでユーザーに寄り添います。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーが自由に話せるように傾聴し、深掘り質問やプロービングを行います。
2. ユーザーの発話から得た情報で、トップレベル要約と必要な二段目要約・三段目項目を部分更新してください。P は面談終了時に更新する前提で構いません。
3. response_format の JSON Schema に厳密に従って出力してください。
4. reply にはユーザーに見せる自然な返答だけを書いてください。
5. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
6. デモグラフィックは既知情報として扱いますが、返答トーンは現状の自然さを維持してください。
7. 既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
`.trim();

const buildInitialFinalizePrompt = (karte: KarteData) => `
あなたは初回面談の会話内容を分析し、SHIRPカルテのP(計画)を作成して面談を締めます。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. 会話履歴と現在のカルテを分析し、SHIRPのトップレベル要約と二段目要約・三段目項目を必要に応じて補強してください。
2. S/H/I/Rの必須詳細17項目は、既存の二段目summaryを尊重し、不足や矛盾が明確な場合だけ補正してください。
3. P(計画)のトップレベル要約と詳細計画を生成してください。探索行動、学習行動、実行行動、実行管理を、会話内容から無理なく導ける範囲で具体化してください。
4. reply は追加質問をせず、面談終了を促す短い案内にしてください。
5. reply には「本日はありがとうございました。カルテ確認 → カルテ保存ボタンを押してカルテを提出してください。内容はあとでユーザーページから編集することができます」という趣旨を自然な日本語で必ず含めてください。
6. is_complete は true にしてください。
7. response_format の JSON Schema に厳密に従って出力してください。
8. reply にはユーザーに見せる自然な返答だけを書いてください。
9. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
10. デモグラフィックは整合性確認のために使い、断定や過剰な言及は避けてください。
`.trim();

const buildContinuousFinalizePrompt = (karte: KarteData) => `
あなたは自由対話の内容を整理し、SHIRPカルテを更新して簡単なフィードバックを提示します。

# SHIRPガイド
${SHIRP_GUIDE}

${buildDemographicPromptContext(karte)}

# 現在のカルテ(SHIRP)
${JSON.stringify(karte.shirp, null, 2)}

# 現在のカルテ(SHIRP詳細)
${JSON.stringify(karte.shirpDetails, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. 会話履歴から情報を抽出し、SHIRPのトップレベル要約と二段目要約・三段目項目を可能な限り埋めてください。
2. 足りない項目は補足し、P(計画)のトップレベル要約と詳細計画を生成してください。
3. 面談後のキャリアに関する簡単なフィードバックを80~120文字で作成してください。
4. reply の最後に、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を含めてください。
5. response_format の JSON Schema に厳密に従って出力してください。
6. reply にはユーザーに見せる自然な返答だけを書いてください。
7. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
8. デモグラフィックは整合性確認のために使い、返答のトーンや構成は大きく変えないでください。
9. 既知のプロフィール情報と矛盾しない前提で整理し、不足分は会話履歴ベースで補ってください。
`.trim();

const getMeetingResponseSchemaName = (mode: LlmProcessMode) => {
  if (mode === 'continuousFinalize') return MEETING_FINALIZE_RESPONSE_SCHEMA_NAME;
  if (mode === 'initialFinalize') return MEETING_INITIAL_FINALIZE_RESPONSE_SCHEMA_NAME;
  return MEETING_RESPONSE_SCHEMA_NAME;
};

const createMeetingResponseSchema = (mode: LlmProcessMode) => {
  const requiresFeedback = mode === 'continuousFinalize';

  return {
    name: getMeetingResponseSchemaName(mode),
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        reply: {
          type: 'string',
        },
        updated_shirp: {
          type: 'object',
          additionalProperties: false,
          properties: SHIRP_SCHEMA_PROPERTIES,
          required: SHIRP_KEYS,
        },
        updated_shirp_details: {
          type: 'object',
          additionalProperties: false,
          properties: SHIRP_DETAIL_SCHEMA_PROPERTIES,
          required: [...SHIRP_DETAIL_CATEGORY_KEYS],
        },
        is_complete: {
          type: 'boolean',
        },
        ...(requiresFeedback
          ? {
              feedback: {
                type: 'string',
              },
            }
          : {}),
      },
      required: requiresFeedback
        ? ['reply', 'updated_shirp', 'updated_shirp_details', 'feedback', 'is_complete']
        : ['reply', 'updated_shirp', 'updated_shirp_details', 'is_complete'],
    },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasSuspiciousReplyContent = (reply: string) =>
  INTERNAL_REPLY_PATTERNS.some((pattern) => pattern.test(reply));

const parseStructuredLlmResponse = (content: string, mode: LlmProcessMode): LlmResponse => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI応答のJSON解析に失敗しました。');
  }

  if (!isRecord(parsed)) {
    throw new Error('AI応答の形式が不正です。');
  }

  const requiresFeedback = mode === 'continuousFinalize';
  const allowedTopLevelKeys = requiresFeedback
    ? new Set(['reply', 'updated_shirp', 'updated_shirp_details', 'feedback', 'is_complete'])
    : new Set(['reply', 'updated_shirp', 'updated_shirp_details', 'is_complete']);

  Object.keys(parsed).forEach((key) => {
    if (!allowedTopLevelKeys.has(key)) {
      throw new Error('AI応答の形式が不正です。');
    }
  });

  const reply = parsed.reply;
  if (typeof reply !== 'string' || !reply.trim()) {
    throw new Error('AI応答のreplyが不正です。');
  }
  if (hasSuspiciousReplyContent(reply)) {
    throw new Error('AI応答のreplyに内部データが混在しています。');
  }

  const updatedShirp = parsed.updated_shirp;
  if (!isRecord(updatedShirp)) {
    throw new Error('AI応答のupdated_shirpが不正です。');
  }

  const validatedUpdates: Partial<Record<ShirpKey, string>> = {};
  Object.entries(updatedShirp).forEach(([key, value]) => {
    if (!SHIRP_KEYS.includes(key as ShirpKey)) {
      throw new Error('AI応答のupdated_shirpに許可されていないキーがあります。');
    }
    if (value !== null && typeof value !== 'string') {
      throw new Error('AI応答のupdated_shirpの値が不正です。');
    }
    if (typeof value === 'string') {
      validatedUpdates[key as ShirpKey] = value;
    }
  });

  const isComplete = parsed.is_complete;
  if (typeof isComplete !== 'boolean') {
    throw new Error('AI応答のis_completeが不正です。');
  }

  const updatedShirpDetails = parsed.updated_shirp_details;
  if (!isRecord(updatedShirpDetails)) {
    throw new Error('AI応答のupdated_shirp_detailsが不正です。');
  }

  const validatedDetailUpdates: ShirpDetailUpdates = {};
  Object.entries(updatedShirpDetails).forEach(([categoryKey, detailValue]) => {
    if (!SHIRP_DETAIL_CATEGORY_KEYS.includes(categoryKey as ShirpDetailCategoryKey)) {
      throw new Error('AI応答のupdated_shirp_detailsに許可されていないカテゴリがあります。');
    }
    if (!isRecord(detailValue)) {
      throw new Error('AI応答のupdated_shirp_detailsの形式が不正です。');
    }
    const category = categoryKey as ShirpDetailCategoryKey;
    const allowedFields = SHIRP_DETAIL_FIELDS[category];
    const nextCategoryUpdates: Record<string, { summary?: string; items?: Record<string, string | null> }> = {};

    Object.entries(detailValue).forEach(([fieldKey, fieldContent]) => {
      if (!allowedFields.includes(fieldKey)) {
        throw new Error('AI応答のupdated_shirp_detailsに許可されていない詳細キーがあります。');
      }
      if (!isRecord(fieldContent)) {
        throw new Error('AI応答のupdated_shirp_detailsの値が不正です。');
      }

      const nextFieldUpdates: { summary?: string; items?: Record<string, string | null> } = {};

      if (fieldContent.summary !== null && fieldContent.summary !== undefined && typeof fieldContent.summary !== 'string') {
        throw new Error('AI応答のupdated_shirp_details.summaryが不正です。');
      }
      if (typeof fieldContent.summary === 'string') {
        nextFieldUpdates.summary = fieldContent.summary;
      }

      if (!isRecord(fieldContent.items)) {
        throw new Error('AI応答のupdated_shirp_details.itemsが不正です。');
      }
      const allowedItems = Object.keys(SHIRP_DETAIL_ITEM_LABELS[category][fieldKey]);
      const nextItemUpdates: Record<string, string | null> = {};
      Object.entries(fieldContent.items).forEach(([itemKey, itemContent]) => {
        if (!allowedItems.includes(itemKey)) {
          throw new Error('AI応答のupdated_shirp_details.itemsに許可されていないキーがあります。');
        }
        if (itemContent !== null && typeof itemContent !== 'string') {
          throw new Error('AI応答のupdated_shirp_details.itemsの値が不正です。');
        }
        nextItemUpdates[itemKey] = itemContent as string | null;
      });
      nextFieldUpdates.items = nextItemUpdates;
      nextCategoryUpdates[fieldKey] = nextFieldUpdates;
    });

    validatedDetailUpdates[category] = nextCategoryUpdates as ShirpDetailUpdates[typeof category];
  });

  if (requiresFeedback) {
    const feedback = parsed.feedback;
    if (typeof feedback !== 'string' || !feedback.trim()) {
      throw new Error('AI応答のfeedbackが不正です。');
    }
    return {
      reply: reply.trim(),
      updated_shirp: validatedUpdates,
      updated_shirp_details: validatedDetailUpdates,
      feedback: feedback.trim(),
      is_complete: isComplete,
    };
  }

  return {
    reply: reply.trim(),
    updated_shirp: validatedUpdates,
    updated_shirp_details: validatedDetailUpdates,
    is_complete: isComplete,
  };
};

const updateShirp = (prev: KarteData, updates?: Partial<Record<ShirpKey, string>>) => {
  if (!updates) return prev;
  const nextShirp = { ...prev.shirp };
  SHIRP_KEYS.forEach((key) => {
    const value = updates[key];
    if (value) {
      nextShirp[key] = value;
    }
  });
  return { ...prev, shirp: nextShirp };
};

const updateShirpDetails = (prev: KarteData, updates?: ShirpDetailUpdates) => {
  if (!updates) return prev;
  const nextShirpDetails: ShirpDetailsData = {
    S: { ...prev.shirpDetails.S },
    H: { ...prev.shirpDetails.H },
    I: { ...prev.shirpDetails.I },
    R: { ...prev.shirpDetails.R },
    P: { ...prev.shirpDetails.P },
  };

  Object.entries(updates).forEach(([categoryKey, categoryUpdates]) => {
    if (!categoryUpdates) return;
    const category = categoryKey as ShirpDetailCategoryKey;
    Object.entries(categoryUpdates).forEach(([detailKey, detailValue]) => {
      if (!detailValue) return;
      const currentField = nextShirpDetails[category][detailKey] ?? {
        summary: null,
        items: {},
      };
      nextShirpDetails[category][detailKey] = {
        summary:
          typeof detailValue.summary === 'string' && detailValue.summary.trim()
            ? detailValue.summary
            : currentField.summary,
        items: {
          ...currentField.items,
        },
      };
      Object.entries(detailValue.items ?? {}).forEach(([itemKey, itemValue]) => {
        if (typeof itemValue === 'string' && itemValue.trim()) {
          nextShirpDetails[category][detailKey].items[itemKey] = itemValue;
        }
      });
    });
  });

  return { ...prev, shirpDetails: nextShirpDetails };
};

const decodeBase64ToUint8Array = (base64: string) => {
  const normalized = base64.replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const buildWavBlobFromMonoPcm16 = (pcmBytes: Uint8Array, sampleRate = 24000) => {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const channels = 1;
  const bytesPerSample = 2;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const pcmBuffer = new Uint8Array(pcmBytes).buffer;

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmBytes.byteLength, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmBuffer.byteLength, true);

  return new Blob([wavHeader, pcmBuffer], { type: 'audio/wav' });
};

const MeetingRoom = ({ meetingType, continuousMode = 'normal' }: Props) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isApiModalOpen, setApiModalOpen] = useState(false);
  const [userState, setUserState] = useState<DemoUserState>(() => loadDemoUserState());
  const [usageQuota, setUsageQuota] = useState<DemoUsageQuota>(() => getDemoUsageQuota());
  const [karte, setKarte] = useState<KarteData>(createEmptyKarte);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'assistant', content: greetingForMeeting(meetingType) },
  ]);
  const [textValue, setTextValue] = useState('');
  const [processingText, setProcessingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTextareaExpanded, setTextareaExpanded] = useState(false);
  const [isKarteModalOpen, setKarteModalOpen] = useState(false);
  const [apiUsageCount, setApiUsageCount] = useState(0);
  const [hasSessionStarted, setSessionStarted] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [hasInitializedState, setHasInitializedState] = useState(false);
  const [hasStoredKarte, setHasStoredKarte] = useState(false);
  const [hasPassedStartGate, setHasPassedStartGate] = useState(() => getMeetingQuotaSummary(getDemoUsageQuota(), meetingType).canStartMeeting);
  const [initialPromptVariant, setInitialPromptVariant] = useState<InitialPromptVariant>('current');
  const [hasFinalizedInitial, setHasFinalizedInitial] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<StageModelId>('sample');
  const [speechMotion, setSpeechMotion] = useState<SpeechMotionFrame>(createSilentSpeechMotion);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ConversationMessage[]>(messages);
  const hasShownQuotaBlockToastRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceUrlRef = useRef<string | null>(null);
  const audioResumePositionRef = useRef<number>(0);
  const shouldResumeAudioRef = useRef(false);
  const pendingAudioPlaybackStartRef = useRef<(() => void) | null>(null);
  const isInitialFinalizeRunningRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioAnalysisFrameRef = useRef<number | null>(null);
  const audioAnalysisAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioTimeDomainRef = useRef<Float32Array | null>(null);
  const audioFrequencyDataRef = useRef<Uint8Array | null>(null);
  const lastSpeechMotionCommitRef = useRef(0);

  const isInitialMeeting = meetingType === 'initial';
  const isTurnTakingMode = !isInitialMeeting && continuousMode === 'turn';
  const draftAction = searchParams.get('draft');
  const meetingQuota = getMeetingQuotaSummary(usageQuota, meetingType);
  const maxApiCalls = meetingQuota.llmCallsPerInterview;
  const reservedFinalizeCalls = isInitialMeeting ? 1 : 0;
  const conversationQuotaLimit = Math.max(maxApiCalls - reservedFinalizeCalls, 0);
  const hasCompanyApiQuota = meetingQuota.remaining > 0;
  const hasConversationQuota =
    hasCompanyApiQuota && conversationQuotaLimit > 0 && apiUsageCount < conversationQuotaLimit && !hasFinalizedInitial;
  const hasApiBudget = apiUsageCount < maxApiCalls;
  const hasUsedApi = hasSessionStarted || apiUsageCount > 0;
  const remainingMessages = Math.max(conversationQuotaLimit - apiUsageCount, 0);
  const isBusy = Boolean(processingText);
  const stressAnalysisEnabled = isStressAnalysisEnabled(userState);
  const textareaPlaceholder = useMemo(() => {
    if (remainingMessages === 0) {
      return 'これ以上のテキストは送信することができません';
    }
    if (apiUsageCount === 0) {
      return 'テキスト入力はこちら...';
    }
    return `あと${remainingMessages}回メッセージを送信できます`;
  }, [apiUsageCount, remainingMessages]);

  const initialProgress = useMemo(() => getInitialProgress(karte.shirpDetails), [karte.shirpDetails]);
  const initialProgressCount = useMemo(() => getInitialProgressCount(karte.shirpDetails), [karte.shirpDetails]);
  const nextInitialStep = useMemo(() => getNextInitialDetailStep(karte.shirpDetails), [karte.shirpDetails]);
  const initialProgressLabel = useMemo(
    () =>
      nextInitialStep
        ? getInitialDetailStepLabel(nextInitialStep.category, nextInitialStep.field)
        : 'P. 計画生成と全体整理',
    [nextInitialStep],
  );
  const initialProgressCountLabel = `${initialProgressCount} / ${INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.length} 項目完了`;
  const canSubmitKarte = !isInitialMeeting || initialProgress >= 50;
  const selectedInitialPromptVariantOption = getInitialPromptVariantOption(initialPromptVariant);

  const saveUserState = useCallback((nextState: DemoUserState) => {
    setUserState(nextState);
    saveDemoUserState(nextState);
  }, []);

  useEffect(() => subscribeDemoUsageQuota(setUsageQuota), []);

  useEffect(() => {
    if (meetingQuota.canStartMeeting) {
      setHasPassedStartGate(true);
    }
  }, [meetingQuota.canStartMeeting]);

  const resetSpeechMotion = useCallback(() => {
    setSpeechMotion(createSilentSpeechMotion());
    lastSpeechMotionCommitRef.current = 0;
  }, []);

  const stopAudioAnalysis = useCallback(
    (preserveGraph = false) => {
      if (audioAnalysisFrameRef.current !== null) {
        cancelAnimationFrame(audioAnalysisFrameRef.current);
        audioAnalysisFrameRef.current = null;
      }

      if (!preserveGraph) {
        audioSourceNodeRef.current?.disconnect();
        audioAnalyserRef.current?.disconnect();
        audioSourceNodeRef.current = null;
        audioAnalyserRef.current = null;
        audioAnalysisAudioRef.current = null;
        audioTimeDomainRef.current = null;
        audioFrequencyDataRef.current = null;

        const context = audioContextRef.current;
        if (context && context.state !== 'closed') {
          void context.close().catch(() => undefined);
        }
        audioContextRef.current = null;
      }

      resetSpeechMotion();
    },
    [resetSpeechMotion],
  );

  const startAudioAnalysis = useCallback(
    async (audio: HTMLAudioElement) => {
      if (typeof window === 'undefined') return;

      const AudioContextCtor = window.AudioContext
        ?? (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        return;
      }

      let context = audioContextRef.current;
      let sourceNode = audioSourceNodeRef.current;
      let analyser = audioAnalyserRef.current;

      if (audioAnalysisAudioRef.current !== audio || !context || !sourceNode || !analyser) {
        stopAudioAnalysis();
        context = new AudioContextCtor();
        analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.55;
        sourceNode = context.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(context.destination);

        audioContextRef.current = context;
        audioSourceNodeRef.current = sourceNode;
        audioAnalyserRef.current = analyser;
        audioAnalysisAudioRef.current = audio;
        audioTimeDomainRef.current = new Float32Array(analyser.fftSize);
        audioFrequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      if (context.state === 'suspended') {
        await context.resume();
      }

      const sampleTimeDomain = audioTimeDomainRef.current;
      const sampleFrequency = audioFrequencyDataRef.current;
      const activeAnalyser = audioAnalyserRef.current;
      if (!sampleTimeDomain || !sampleFrequency || !activeAnalyser) {
        resetSpeechMotion();
        return;
      }

      if (audioAnalysisFrameRef.current !== null) {
        cancelAnimationFrame(audioAnalysisFrameRef.current);
      }

      const updateMotionFrame = () => {
        const currentAudio = audioAnalysisAudioRef.current;
        const currentAnalyser = audioAnalyserRef.current;
        const currentContext = audioContextRef.current;
        if (currentAudio !== audio || !currentAnalyser || !currentContext) {
          audioAnalysisFrameRef.current = null;
          resetSpeechMotion();
          return;
        }

        if (audio.paused || audio.ended) {
          audioAnalysisFrameRef.current = null;
          resetSpeechMotion();
          return;
        }

        (currentAnalyser as AnalyserNode & {
          getFloatTimeDomainData: (array: Float32Array) => void;
          getByteFrequencyData: (array: Uint8Array) => void;
        }).getFloatTimeDomainData(sampleTimeDomain as unknown as Float32Array);
        (currentAnalyser as AnalyserNode & {
          getFloatTimeDomainData: (array: Float32Array) => void;
          getByteFrequencyData: (array: Uint8Array) => void;
        }).getByteFrequencyData(sampleFrequency as unknown as Uint8Array);

        let sumSquares = 0;
        for (let index = 0; index < sampleTimeDomain.length; index += 1) {
          const value = sampleTimeDomain[index];
          sumSquares += value * value;
        }
        const rms = Math.min(Math.sqrt(sumSquares / sampleTimeDomain.length) * 2.2, 1);

        const nyquist = currentContext.sampleRate / 2;
        const binSize = nyquist / sampleFrequency.length;
        let lowTotal = 0;
        let midTotal = 0;
        let highTotal = 0;
        let lowCount = 0;
        let midCount = 0;
        let highCount = 0;

        for (let index = 0; index < sampleFrequency.length; index += 1) {
          const frequency = index * binSize;
          const value = sampleFrequency[index];
          if (frequency < 400) {
            lowTotal += value;
            lowCount += 1;
          } else if (frequency < 1600) {
            midTotal += value;
            midCount += 1;
          } else if (frequency < 4200) {
            highTotal += value;
            highCount += 1;
          }
        }

        const now = performance.now();
        const nextFrame: SpeechMotionFrame = {
          speaking: true,
          rms,
          low: lowCount > 0 ? lowTotal / lowCount / 255 : 0,
          mid: midCount > 0 ? midTotal / midCount / 255 : 0,
          high: highCount > 0 ? highTotal / highCount / 255 : 0,
          updatedAt: Date.now(),
        };

        if (
          now - lastSpeechMotionCommitRef.current >= 48
          || Math.abs(nextFrame.rms - speechMotion.rms) >= 0.035
          || Math.abs(nextFrame.low - speechMotion.low) >= 0.05
          || Math.abs(nextFrame.mid - speechMotion.mid) >= 0.05
          || Math.abs(nextFrame.high - speechMotion.high) >= 0.05
        ) {
          lastSpeechMotionCommitRef.current = now;
          setSpeechMotion((prev) => {
            if (
              Math.abs(nextFrame.rms - prev.rms) < 0.02
              && Math.abs(nextFrame.low - prev.low) < 0.03
              && Math.abs(nextFrame.mid - prev.mid) < 0.03
              && Math.abs(nextFrame.high - prev.high) < 0.03
              && prev.speaking === nextFrame.speaking
            ) {
              return prev;
            }
            return nextFrame;
          });
        }

        audioAnalysisFrameRef.current = requestAnimationFrame(updateMotionFrame);
      };

      audioAnalysisFrameRef.current = requestAnimationFrame(updateMotionFrame);
    },
    [resetSpeechMotion, speechMotion.high, speechMotion.low, speechMotion.mid, speechMotion.rms, stopAudioAnalysis],
  );

  const disposeActiveAudio = useCallback(() => {
    stopAudioAnalysis();
    const current = activeAudioRef.current;
    if (current) {
      current.pause();
    }
    if (audioSourceUrlRef.current) {
      URL.revokeObjectURL(audioSourceUrlRef.current);
      audioSourceUrlRef.current = null;
    }
    activeAudioRef.current = null;
    audioResumePositionRef.current = 0;
    shouldResumeAudioRef.current = false;
    pendingAudioPlaybackStartRef.current = null;
    setIsSpeaking(false);
  }, [stopAudioAnalysis]);

  useEffect(() => {
    messagesRef.current = messages;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedOpenAiKey = window.localStorage.getItem(LOCAL_STORAGE_OPENAI_KEY);
    const savedGeminiKey = window.localStorage.getItem(LOCAL_STORAGE_GEMINI_KEY);
    const legacyOpenAiKey = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_OPENAI_KEY);
    const resolvedOpenAiKey = savedOpenAiKey || legacyOpenAiKey || '';

    if (resolvedOpenAiKey) {
      setOpenAiApiKey(resolvedOpenAiKey);
    }
    if (savedGeminiKey) {
      setGeminiApiKey(savedGeminiKey);
    }
    if (legacyOpenAiKey && !savedOpenAiKey) {
      window.localStorage.setItem(LOCAL_STORAGE_OPENAI_KEY, legacyOpenAiKey);
      window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_OPENAI_KEY);
    }
    if (!resolvedOpenAiKey) {
      setApiModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (openAiApiKey) {
      window.localStorage.setItem(LOCAL_STORAGE_OPENAI_KEY, openAiApiKey);
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_OPENAI_KEY);
    }
  }, [openAiApiKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (geminiApiKey) {
      window.localStorage.setItem(LOCAL_STORAGE_GEMINI_KEY, geminiApiKey);
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
    }
  }, [geminiApiKey]);

  useEffect(() => {
    const nextUserState = loadDemoUserState();
    const currentDraft = meetingType === 'initial' ? nextUserState.draftSessions.initial : nextUserState.draftSessions.continuous;
    const greeting = greetingForMeeting(meetingType);
    const initialHistory: ConversationMessage[] = [{ role: 'assistant', content: greeting }];
    const shouldResumeDraft = draftAction !== 'fresh' && currentDraft;
    const latestConditionRecord = getLatestConditionRecord(nextUserState);
    const baseKarte = applyConditionToKarte(
      meetingType === 'continuous'
        ? applyDemographicsToKarte(nextUserState.latestKarte ?? createEmptyKarte(), nextUserState.demographics)
        : applyDemographicsToKarte(createEmptyKarte(), nextUserState.demographics),
      latestConditionRecord ?? nextUserState.latestKarte?.conditionSummary ?? null,
    );

    setUserState(nextUserState);
    setProcessingText('');
    setKarteModalOpen(false);
    setTextValue('');
    setTextareaExpanded(false);
    setHasStoredKarte(Boolean(nextUserState.latestKarte));

    if (shouldResumeDraft) {
      setMessages(currentDraft.messages);
      messagesRef.current = currentDraft.messages;
      setKarte(currentDraft.karte);
      setApiUsageCount(0);
      setConversationStarted(currentDraft.conversationStarted);
      setSessionStarted(currentDraft.hasSessionStarted);
      setInitialPromptVariant(
        meetingType === 'initial' ? normalizeInitialPromptVariant(currentDraft.initialPromptVariant) : 'current',
      );
      setHasFinalizedInitial(meetingType === 'initial' ? currentDraft.hasFinalizedInitial === true : false);
      setFeedbackText(currentDraft.feedbackText);
    } else {
      if (draftAction === 'fresh' && currentDraft) {
        saveUserState({
          ...nextUserState,
          draftSessions: {
            ...nextUserState.draftSessions,
            [meetingType]: null,
          },
        });
      }
      setMessages(initialHistory);
      messagesRef.current = initialHistory;
      setKarte(baseKarte);
      setConversationStarted(false);
      setApiUsageCount(0);
      setSessionStarted(false);
      setInitialPromptVariant('current');
      setHasFinalizedInitial(false);
      setFeedbackText('');
    }

    setHasInitializedState(true);
  }, [draftAction, meetingType, saveUserState]);

  useEffect(() => {
    if (!openAiApiKey) {
      setApiModalOpen(true);
    }
  }, [openAiApiKey]);

  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      disposeActiveAudio();
    },
    [disposeActiveAudio],
  );

  useEffect(() => {
    const audio = activeAudioRef.current;
    if (!audio) return;
    if (isKarteModalOpen) {
      if (!audio.paused) {
        audioResumePositionRef.current = audio.currentTime;
        shouldResumeAudioRef.current = true;
        audio.pause();
        stopAudioAnalysis(true);
        setIsSpeaking(false);
      }
      return;
    }
    if (shouldResumeAudioRef.current) {
      audio.currentTime = audioResumePositionRef.current;
      const playPromise = audio.play();
      shouldResumeAudioRef.current = false;
      if (playPromise) {
        playPromise
          .then(() => {
            pendingAudioPlaybackStartRef.current?.();
            pendingAudioPlaybackStartRef.current = null;
            setIsSpeaking(true);
            void startAudioAnalysis(audio);
          })
          .catch(() => {
            if (activeAudioRef.current === audio) {
              disposeActiveAudio();
            }
          });
      } else {
        pendingAudioPlaybackStartRef.current?.();
        pendingAudioPlaybackStartRef.current = null;
        setIsSpeaking(true);
        void startAudioAnalysis(audio);
      }
    }
  }, [disposeActiveAudio, isKarteModalOpen, startAudioAnalysis, stopAudioAnalysis]);

  useEffect(() => {
    if (!hasInitializedState) return;

    const shouldPersistDraft =
      hasSessionStarted || conversationStarted || apiUsageCount > 0 || messages.length > 1 || Boolean(feedbackText);
    const currentState = loadDemoUserState();

    const nextState: DemoUserState = {
      ...currentState,
      demographics: karte.demographics,
      latestKarte:
        meetingType === 'continuous'
          ? applyDemographicsToKarte(karte, karte.demographics)
          : currentState.latestKarte,
      draftSessions: {
        ...currentState.draftSessions,
        [meetingType]: shouldPersistDraft
          ? {
              meetingType,
              continuousMode: isInitialMeeting ? null : continuousMode,
              initialPromptVariant: isInitialMeeting ? initialPromptVariant : null,
              messages,
              karte,
              apiUsageCount,
              feedbackText,
              conversationStarted,
              hasSessionStarted,
              hasFinalizedInitial: isInitialMeeting ? hasFinalizedInitial : false,
              updatedAt: formatDraftTimestamp(),
            }
          : null,
      },
    };

    saveUserState(nextState);
  }, [
    apiUsageCount,
    continuousMode,
    conversationStarted,
    feedbackText,
    hasInitializedState,
    hasFinalizedInitial,
    hasSessionStarted,
    isInitialMeeting,
    initialPromptVariant,
    karte,
    meetingType,
    messages,
    saveUserState,
  ]);

  const toggleTextareaExpanded = useCallback(() => {
    setTextareaExpanded((prev) => !prev);
  }, []);

  const notifyApiLimit = useCallback(
    (customMessage?: string) => {
      toast({
        title: 'API使用制限に達しました',
        description: customMessage || 'これ以上メッセージを送信できません。',
        status: 'warning',
        duration: 4000,
      });
    },
    [toast],
  );

  const ensureApiKey = useCallback(() => {
    if (openAiApiKey) return true;
    toast({
      title: 'APIキーが必要です',
      description: '先にOpenAIのAPIキーを設定してください。',
      status: 'warning',
      duration: 4000,
    });
    setApiModalOpen(true);
    return false;
  }, [openAiApiKey, toast]);

  const playAudioBlob = useCallback(
    async (blob: Blob, playbackRate: number, onPlaybackStart?: () => void) => {
      const url = URL.createObjectURL(blob);
      disposeActiveAudio();
      const audio = new Audio(url);
      audio.playbackRate = playbackRate;
      activeAudioRef.current = audio;
      audioSourceUrlRef.current = url;
      audioResumePositionRef.current = 0;
      shouldResumeAudioRef.current = false;

      const handleAudioComplete = () => {
        if (activeAudioRef.current === audio) {
          disposeActiveAudio();
        } else {
          URL.revokeObjectURL(url);
        }
      };

      audio.onended = handleAudioComplete;
      audio.onerror = handleAudioComplete;

      if (isKarteModalOpen) {
        shouldResumeAudioRef.current = true;
        pendingAudioPlaybackStartRef.current = onPlaybackStart ?? null;
        return;
      }

      try {
        await audio.play();
        pendingAudioPlaybackStartRef.current = null;
        onPlaybackStart?.();
        setIsSpeaking(true);
        await startAudioAnalysis(audio);
      } catch (playError) {
        pendingAudioPlaybackStartRef.current = null;
        if (activeAudioRef.current === audio) {
          disposeActiveAudio();
        } else {
          URL.revokeObjectURL(url);
        }
        throw playError;
      }
    },
    [disposeActiveAudio, isKarteModalOpen, startAudioAnalysis],
  );

  const playWithOpenAiTts = useCallback(
    async (text: string, onPlaybackStart?: () => void) => {
      if (!openAiApiKey || !text) {
        throw new Error('OpenAI APIキーが設定されていません。');
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'sage',
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAIの音声生成リクエストに失敗しました。');
      }

      const blob = await response.blob();
      await playAudioBlob(blob, 1.2, onPlaybackStart);
    },
    [openAiApiKey, playAudioBlob],
  );

  const playWithGeminiTts = useCallback(
    async (text: string, onPlaybackStart?: () => void) => {
      if (!geminiApiKey || !text) {
        throw new Error('Gemini APIキーが設定されていません。');
      }

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [
              {
                parts: [
                  {
                    text: `${GEMINI_TTS_PROMPT_PREFIX}${text}`,
                  },
                ],
              },
            ],
            generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName: GEMINI_VOICE_BY_MODEL[selectedModelId],
                      },
                    },
                  },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Geminiの音声生成リクエストに失敗しました。');
      }

      const data = await response.json();
      const inlineAudio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data as string | undefined;
      if (!inlineAudio) {
        throw new Error('Geminiの音声データが取得できませんでした。');
      }

      const pcmBytes = decodeBase64ToUint8Array(inlineAudio);
      const wavBlob = buildWavBlobFromMonoPcm16(pcmBytes);
      await playAudioBlob(wavBlob, 1.0, onPlaybackStart);
    },
    [geminiApiKey, playAudioBlob, selectedModelId],
  );

  const playTextToSpeech = useCallback(
    async (text: string, onPlaybackStart?: () => void) => {
      if (!openAiApiKey || !text) return false;

      try {
        if (geminiApiKey) {
          try {
            await playWithGeminiTts(text, onPlaybackStart);
            return true;
          } catch (geminiError) {
            console.error(geminiError);
            await playWithOpenAiTts(text, onPlaybackStart);
            return true;
          }
        }

        await playWithOpenAiTts(text, onPlaybackStart);
        return true;
      } catch (error) {
        console.error(error);
        toast({
          title: '音声再生に失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 4000,
        });
        return false;
      }
    },
    [geminiApiKey, openAiApiKey, playWithGeminiTts, playWithOpenAiTts, toast],
  );

  const runLLMProcess = useCallback(
    async (history: ConversationMessage[], mode: LlmProcessMode = 'normal') => {
      if (!ensureApiKey()) return false;
      const nextStep = isInitialMeeting ? getNextInitialDetailStep(karte.shirpDetails) : null;
      const isFinalizeMode = mode !== 'normal';
      const systemPrompt =
        mode === 'initialFinalize'
          ? buildInitialFinalizePrompt(karte)
          : mode === 'continuousFinalize'
            ? buildContinuousFinalizePrompt(karte)
            : isInitialMeeting
              ? buildInitialPrompt(karte, nextStep, initialPromptVariant)
              : buildContinuousPrompt(karte);
      if (!consumeCompanyApiUsage(1)) {
        notifyApiLimit('企業のAPI残枠がないため、AIを呼び出せません。');
        return false;
      }

      setProcessingText(isFinalizeMode ? 'カルテとプランを整理しています...' : 'AI思考中...');
      setApiUsageCount((prev) => Math.min(prev + 1, maxApiCalls));

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENAI_MEETING_MODEL,
            messages: [{ role: 'system', content: systemPrompt }, ...history],
            response_format: {
              type: 'json_schema',
              json_schema: createMeetingResponseSchema(mode),
            },
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          const apiErrorMessage = data?.error?.message as string | undefined;
          throw new Error(apiErrorMessage || 'OpenAIからの応答がありませんでした。');
        }
        const refusal = data.choices?.[0]?.message?.refusal as string | undefined;
        if (refusal) {
          throw new Error('AIがこのリクエストへの応答を拒否しました。');
        }

        const content = data.choices?.[0]?.message?.content as string | undefined;
        if (!content) throw new Error('AI応答の形式が不正です。');

        const parsed = parseStructuredLlmResponse(content, mode);

        setKarte((prev) => updateShirpDetails(updateShirp(prev, parsed.updated_shirp), parsed.updated_shirp_details));

        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: parsed.reply,
        };
        let hasDisplayedAssistantMessage = false;
        const displayAssistantMessage = () => {
          if (hasDisplayedAssistantMessage) return;
          hasDisplayedAssistantMessage = true;
          setMessages((prev) => {
            const updated = [...prev, assistantMessage];
            messagesRef.current = updated;
            return updated;
          });
        };

        if (mode === 'continuousFinalize' && parsed.feedback) {
          setFeedbackText(parsed.feedback);
        }

        setProcessingText('音声生成中...');
        const didStartSpeech = await playTextToSpeech(parsed.reply, displayAssistantMessage);
        if (!didStartSpeech) {
          displayAssistantMessage();
        }
        return true;
      } catch (error) {
        console.error(error);
        toast({
          title: 'AIの呼び出しに失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 5000,
        });
        return false;
      } finally {
        setProcessingText('');
      }
    },
    [ensureApiKey, initialPromptVariant, isInitialMeeting, karte, maxApiCalls, notifyApiLimit, openAiApiKey, playTextToSpeech, toast],
  );

  useEffect(() => {
    if (!hasInitializedState || !isInitialMeeting || hasFinalizedInitial || initialProgress < 100) return;
    if (isBusy) return;
    if (isInitialFinalizeRunningRef.current) return;
    if (!hasApiBudget) {
      notifyApiLimit('API制限に達したため、カルテとプランの最終整理を生成できません。');
      return;
    }
    if (!openAiApiKey) {
      setApiModalOpen(true);
      return;
    }

    isInitialFinalizeRunningRef.current = true;
    void (async () => {
      const success = await runLLMProcess(messagesRef.current, 'initialFinalize');
      if (success) {
        setHasFinalizedInitial(true);
        setKarteModalOpen(true);
      }
      isInitialFinalizeRunningRef.current = false;
    })();
  }, [
    hasApiBudget,
    hasFinalizedInitial,
    hasInitializedState,
    initialProgress,
    isBusy,
    isInitialMeeting,
    notifyApiLimit,
    openAiApiKey,
    runLLMProcess,
  ]);

  const handleUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!hasConversationQuota) {
        notifyApiLimit(
          meetingQuota.remaining <= 0
            ? '企業のAPI残枠がないため、これ以上メッセージを送信できません。'
            : conversationQuotaLimit <= 0
              ? '初回面談の最終整理用API回数を確保できないため、メッセージを送信できません。'
            : `${isInitialMeeting ? '初回面談' : '継続面談'}は1セッション${conversationQuotaLimit}ターンまで送信できます。`,
        );
        return;
      }
      if (!ensureApiKey()) return;
      const nextUsageCount = apiUsageCount + 1;
      if (conversationQuotaLimit > 0 && nextUsageCount === conversationQuotaLimit) {
        notifyApiLimit('今回の送信が最後のメッセージです。');
      }
      const sanitized = content.trim();
      const updatedHistory: ConversationMessage[] = [
        ...messagesRef.current,
        { role: 'user', content: sanitized },
      ];
      setMessages(updatedHistory);
      messagesRef.current = updatedHistory;
      setConversationStarted(true);
      setTextValue('');
      await runLLMProcess(updatedHistory);
    },
    [
      apiUsageCount,
      conversationQuotaLimit,
      ensureApiKey,
      hasConversationQuota,
      isInitialMeeting,
      meetingQuota.remaining,
      notifyApiLimit,
      runLLMProcess,
    ],
  );

  const insertTextAtCursor = useCallback((incomingText: string) => {
    if (!incomingText) return;
    const textarea = textareaRef.current;
    const shouldPreserveFocus = textarea ? document.activeElement === textarea : false;
    setTextValue((prev) => {
      if (!textarea) {
        return `${prev}${incomingText}`;
      }
      const selectionStart = shouldPreserveFocus ? (textarea.selectionStart ?? prev.length) : prev.length;
      const selectionEnd = shouldPreserveFocus ? (textarea.selectionEnd ?? prev.length) : prev.length;
      const nextValue = prev.slice(0, selectionStart) + incomingText + prev.slice(selectionEnd);

      requestAnimationFrame(() => {
        if (!shouldPreserveFocus) return;
        const cursorPosition = selectionStart + incomingText.length;
        textarea.selectionStart = cursorPosition;
        textarea.selectionEnd = cursorPosition;
      });

      return nextValue;
    });
  }, []);

  const processAudio = useCallback(
    async (blob: Blob) => {
      if (!ensureApiKey()) return;
      setProcessingText('音声を文字に変換中...');
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ja');

      try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('音声認識リクエストに失敗しました。');
        }

        const data = await response.json();
        const text = (data.text as string)?.trim();
        setProcessingText('');
        if (!text) {
          toast({
            title: '音声を認識できませんでした',
            status: 'warning',
          });
          return;
        }

        if (isTurnTakingMode) {
          await handleUserMessage(text);
        } else {
          insertTextAtCursor(text);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: '音声認識に失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 4000,
        });
        setProcessingText('');
      }
    },
    [ensureApiKey, handleUserMessage, insertTextAtCursor, isTurnTakingMode, openAiApiKey, toast],
  );

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      return;
    }

    if (!ensureApiKey()) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'マイクが利用できません',
        description: 'ブラウザが録音に対応していないようです。',
        status: 'error',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        processAudio(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      toast({
        title: 'マイクの使用が拒否されました',
        status: 'error',
        duration: 4000,
      });
    }
  };

  const getTurnTakingConversationHistory = useCallback(() => {
    return messagesRef.current.filter((message, index) => !(index === 0 && message.role === 'assistant'));
  }, []);

  const handleOpenKarteModal = useCallback(() => {
    if (isBusy) {
      toast({
        title: 'AIが処理中です',
        description: '結果を待ってからもう一度お試しください。',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    setKarteModalOpen(true);
  }, [isBusy, toast]);

  const handleCloseKarteModal = useCallback(() => {
    setKarteModalOpen(false);
  }, []);

  const handleSaveDraft = useCallback(
    (returnHome = false) => {
      if (returnHome) {
        disposeActiveAudio();
      }
      const currentState = loadDemoUserState();
      const nextState: DemoUserState = {
        ...currentState,
        demographics: karte.demographics,
        latestKarte:
          meetingType === 'continuous'
            ? applyDemographicsToKarte(karte, karte.demographics)
            : currentState.latestKarte,
        draftSessions: {
          ...currentState.draftSessions,
          [meetingType]: {
            meetingType,
            continuousMode: isInitialMeeting ? null : continuousMode,
            initialPromptVariant: isInitialMeeting ? initialPromptVariant : null,
            messages: messagesRef.current,
            karte,
            apiUsageCount,
            feedbackText,
            conversationStarted,
            hasSessionStarted,
            hasFinalizedInitial: isInitialMeeting ? hasFinalizedInitial : false,
            updatedAt: formatDraftTimestamp(),
          },
        },
      };

      saveUserState(nextState);
      toast({
        title: '面談を一時保存しました',
        description: returnHome ? 'ユーザホームから続きの面談を再開できます。' : '現在の会話とカルテを下書きに保存しました。',
        status: 'success',
        duration: 2600,
        isClosable: true,
      });
      if (returnHome) {
        navigate('/user');
      }
    },
    [
      apiUsageCount,
      conversationStarted,
      continuousMode,
      disposeActiveAudio,
      feedbackText,
      hasFinalizedInitial,
      hasSessionStarted,
      initialPromptVariant,
      isInitialMeeting,
      karte,
      meetingType,
      navigate,
      saveUserState,
      toast,
    ],
  );

  const handleFinalizeContinuous = useCallback(async () => {
    if (isInitialMeeting) return;
    if (!hasApiBudget) {
      notifyApiLimit('API制限に達したためフィードバックを生成できません。');
      return;
    }
    if (!ensureApiKey()) return;
    const finalInputHistory = isTurnTakingMode ? getTurnTakingConversationHistory() : messagesRef.current;
    await runLLMProcess(finalInputHistory, 'continuousFinalize');
    setKarteModalOpen(true);
  }, [ensureApiKey, getTurnTakingConversationHistory, hasApiBudget, isInitialMeeting, isTurnTakingMode, notifyApiLimit, runLLMProcess]);

  const handleSubmitKarte = useCallback(() => {
    if (!canSubmitKarte) {
      toast({
        title: 'カルテ保存には50%以上の完成が必要です',
        description: `現在の完成度は${initialProgress}%です。一時保存して中断できます。`,
        status: 'warning',
        duration: 3500,
        isClosable: true,
      });
      return;
    }
    disposeActiveAudio();
    const currentState = loadDemoUserState();
    const timestamp = formatDraftTimestamp();
    const latestConditionRecord = getLatestConditionRecord(currentState);
    const nextKarte = applyConditionToKarte(
      applyDemographicsToKarte(karte, karte.demographics),
      latestConditionRecord ?? karte.conditionSummary ?? null,
    );
    const nextRecord: StoredKarteRecord = {
      id: `karte-${Date.now()}`,
      atCreated: timestamp,
      atUpdated: timestamp,
      statusLabel: isInitialMeeting ? '初回面談保存済み' : '継続面談保存済み',
      data: nextKarte,
      meetingType,
      continuousMode: isInitialMeeting ? null : continuousMode,
      initialPromptVariant: isInitialMeeting ? initialPromptVariant : null,
      feedback: feedbackText || null,
      conversationLog: messagesRef.current,
    };

    saveUserState({
      ...currentState,
      demographics: nextKarte.demographics,
      latestKarte: nextKarte,
      karteRecords: [nextRecord, ...currentState.karteRecords],
      draftSessions: {
        ...currentState.draftSessions,
        [meetingType]: null,
      },
    });
    setKarteModalOpen(false);
    toast({
      title: 'カルテを保存しました',
      description: '面談を終了し、ユーザホームへ移動します。',
      status: 'success',
      duration: 2500,
    });
    navigate('/user');
  }, [
    canSubmitKarte,
    continuousMode,
    disposeActiveAudio,
    feedbackText,
    initialProgress,
    initialPromptVariant,
    isInitialMeeting,
    karte,
    meetingType,
    navigate,
    saveUserState,
    toast,
  ]);

  const apiStatusLabel = openAiApiKey
    ? geminiApiKey
      ? 'OpenAI/Gemini Key: 設定済'
      : 'OpenAI Key: 設定済 / Gemini Key: 未設定'
    : 'OpenAI Key: 未設定';
  const apiStatusColor = openAiApiKey ? 'green' : 'gray';

  useEffect(() => {
    if (hasPassedStartGate) {
      hasShownQuotaBlockToastRef.current = false;
      return;
    }
    if (hasShownQuotaBlockToastRef.current) return;
    hasShownQuotaBlockToastRef.current = true;
    toast({
      title: '企業のAPI残枠が不足しています',
      description: `面談開始には企業API残枠が${meetingQuota.perMeetingTurnLimit}回以上必要です。現在の残枠は${meetingQuota.remaining}回です。`,
      status: 'warning',
      duration: 5000,
      isClosable: true,
    });
  }, [hasPassedStartGate, meetingQuota.perMeetingTurnLimit, meetingQuota.remaining, toast]);

  if (!hasPassedStartGate) {
    return (
      <Box bg="gray.100" minH="100dvh" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
        <Box maxW="640px" mx="auto" bg="white" borderRadius="2xl" borderWidth="1px" borderColor="gray.200" boxShadow="sm" p={{ base: 6, md: 8 }}>
          <Stack spacing={4}>
            <Heading size="md">
              企業のAPI残枠が不足しています
            </Heading>
            <Text color="gray.600">
              面談開始には企業API残枠が{meetingQuota.perMeetingTurnLimit}回以上必要です。現在の使用状況は
              {meetingQuota.usageLabel}、残枠は{meetingQuota.remaining}回です。
            </Text>
            <Button colorScheme="blue" alignSelf="flex-start" onClick={() => navigate('/user')}>
              ユーザホームへ戻る
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg="gray.100" minH="100dvh" h="100dvh" py={{ base: 4, md: 6 }} px={{ base: 3, md: 6 }} overflow="hidden">
      <ApiKeyModal
        isOpen={isApiModalOpen}
        openAiApiKey={openAiApiKey}
        geminiApiKey={geminiApiKey}
        onSave={(value) => {
          setOpenAiApiKey(value.openAiApiKey);
          setGeminiApiKey(value.geminiApiKey);
          setApiModalOpen(false);
        }}
      />

      <Flex direction="column" maxW="1200px" mx="auto" gap={4} bg="transparent" h="100%" minH={0} overflow="hidden">
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} flex="1" minH={0} overflow="hidden">
          <Box
            flexShrink={0}
            w="full"
            maxW={{ base: '100%', md: '45%' }}
            flex={{ base: 'none', md: '0 0 45%' }}
            minH={0}
            display="flex"
            flexDirection="column"
            gap={4}
          >
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="gray.200"
              boxShadow="sm"
              p={{ base: 4, md: 6 }}
              display={!hasUsedApi ? 'block' : { base: 'none', md: 'block' }}
              flexShrink={0}
            >
              <Flex direction="column" align={{ base: 'flex-start', md: 'center' }} gap={4}>
                <HStack spacing={3}>
                  <Icon as={FaUserDoctor} color="blue.500" boxSize={6} />
                  <Box>
                    <Text fontWeight="bold" fontSize="lg">
                      {isInitialMeeting ? '初回面談ルーム' : '継続面談ルーム'}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {isInitialMeeting
                        ? 'SHIRPの順次ヒアリングでカルテを作成します'
                        : '自由対話でカルテを更新し、フィードバックをまとめます'}
                    </Text>
                  </Box>
                </HStack>
                <Flex align={{ base: 'flex-start', md: 'center' }} gap={3} wrap="wrap">
                  <Badge colorScheme={apiStatusColor}>{apiStatusLabel}</Badge>
                  {!isInitialMeeting && (
                    <Badge colorScheme={continuousMode === 'turn' ? 'purple' : 'blue'}>
                      {continuousMode === 'turn' ? 'ターンテイキングモード (Realtime API・未実装)' : '通常モード'}
                    </Badge>
                  )}
                  {isInitialMeeting && hasUsedApi && (
                    <Badge colorScheme="purple">プロンプト: {selectedInitialPromptVariantOption.label}</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setApiModalOpen(true)}>
                    API設定
                  </Button>
                </Flex>
                {!isInitialMeeting && !hasStoredKarte && (
                  <Box bg="orange.50" borderRadius="lg" px={3} py={2} borderWidth="1px" borderColor="orange.200">
                    <Text fontSize="xs" color="orange.700">
                      初回面談のカルテが未保存のため、空のカルテで開始します。
                    </Text>
                  </Box>
                )}
              </Flex>
              {isInitialMeeting && !hasUsedApi && (
                <Box w="full" mt={5}>
                  <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                    初回面談プロンプト
                  </Text>
                  <RadioGroup
                    value={initialPromptVariant}
                    onChange={(value) => setInitialPromptVariant(normalizeInitialPromptVariant(value))}
                  >
                    <Stack spacing={2}>
                      {INITIAL_PROMPT_VARIANT_OPTIONS.map((option) => (
                        <Box
                          key={option.value}
                          cursor="pointer"
                          borderWidth="1px"
                          borderColor={initialPromptVariant === option.value ? 'purple.300' : 'gray.200'}
                          bg={initialPromptVariant === option.value ? 'purple.50' : 'white'}
                          px={3}
                          py={2}
                          onClick={() => setInitialPromptVariant(option.value)}
                        >
                          <Radio value={option.value} colorScheme="purple">
                            <Text as="span" fontSize="sm" fontWeight="bold">
                              {option.label}
                            </Text>
                          </Radio>
                          <Text fontSize="xs" color="gray.600" mt={1} pl={6}>
                            {option.description}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  </RadioGroup>
                </Box>
              )}
              <Button mt={6} colorScheme="blue" size="md" w="full" onClick={() => setSessionStarted(true)} isDisabled={hasUsedApi}>
                {isInitialMeeting ? '初回面談を開始する' : '継続面談を開始する'}
              </Button>
            </Box>

            <VrmStage
              isSpeaking={isSpeaking}
              speechMotion={speechMotion}
              conversationStarted={conversationStarted}
              progress={initialProgress}
              progressLabel={initialProgressLabel}
              progressCountLabel={initialProgressCountLabel}
              onModelChange={setSelectedModelId}
              showProgress={isInitialMeeting}
            />
          </Box>

          <Flex
            direction="column"
            flex="1"
            gap={4}
            minH={0}
            display={hasUsedApi ? 'flex' : { base: 'none', md: 'flex' }}
          >
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="gray.200"
              boxShadow="lg"
              display="flex"
              flexDirection="column"
              flex="1"
              minH={0}
              overflow="hidden"
            >
              {isTurnTakingMode ? (
                <Box flex="1" minH={0} overflowY="auto" px={{ base: 3, md: 4 }} py={4} bg="gray.50">
                  <Stack spacing={3}>
                    <Box bg="purple.50" borderRadius="lg" px={3} py={2} borderWidth="1px" borderColor="purple.200">
                      <Text fontSize="xs" color="purple.700">
                        Realtime APIは未実装です。現在は音声入力ベースで会話し、終了時に会話履歴とカルテを使って1回だけ更新します。
                      </Text>
                    </Box>
                    <KartePanel data={karte} showCondition={stressAnalysisEnabled} />
                  </Stack>
                </Box>
              ) : (
                <Box ref={chatContainerRef} flex="1" minH={0} overflowY="auto" px={{ base: 3, md: 4 }} py={4} bg="gray.50">
                  {messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    return (
                      <Flex key={`${message.role}-${index}-${message.content.slice(0, 8)}`} justify={isUser ? 'flex-end' : 'flex-start'} mb={3}>
                        <Box
                          bg={isUser ? 'blue.600' : 'white'}
                          color={isUser ? 'white' : 'gray.800'}
                          borderRadius="2xl"
                          borderTopRightRadius={isUser ? '0' : '2xl'}
                          borderTopLeftRadius={isUser ? '2xl' : '0'}
                          px={4}
                          py={3}
                          boxShadow="sm"
                          maxW="80%"
                          fontSize="sm"
                          whiteSpace="pre-wrap"
                        >
                          {message.content}
                        </Box>
                      </Flex>
                    );
                  })}
                </Box>
              )}
              <ProcessingIndicator message={processingText} />
              <Box borderTopWidth="1px" borderColor="gray.100" p={4}>
                <Stack spacing={3}>
                  {isTurnTakingMode ? (
                    <Flex gap={3} align="center" justify="center">
                      <IconButton
                        aria-label="音声入力"
                        icon={<FaMicrophone />}
                        colorScheme={isRecording ? 'red' : 'blue'}
                        isDisabled={isBusy || !hasConversationQuota}
                        onClick={toggleRecording}
                        isRound
                        minW="56px"
                        h="56px"
                      />
                      <Text fontSize="sm" color="gray.600">
                        マイクで話すと自動で送信されます（残り{remainingMessages}回）
                      </Text>
                    </Flex>
                  ) : (
                    <Flex gap={3} align="center">
                      <IconButton
                        aria-label="音声入力"
                        icon={<FaMicrophone />}
                        colorScheme={isRecording ? 'red' : 'blue'}
                        isDisabled={isBusy || !hasConversationQuota}
                        onClick={toggleRecording}
                        isRound
                        minW="56px"
                        h="56px"
                      />
                      <Box position="relative" flex="1">
                        <Textarea
                          ref={textareaRef}
                          value={textValue}
                          onChange={(e) => setTextValue(e.target.value)}
                          placeholder={textareaPlaceholder}
                          borderRadius="xl"
                          bg="white"
                          borderColor="gray.200"
                          resize="none"
                          rows={isTextareaExpanded ? 6 : 2}
                          flex="1"
                          pr="2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.shiftKey || e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleUserMessage(textValue);
                            }
                          }}
                          isDisabled={isBusy}
                        />
                        <IconButton
                          aria-label={isTextareaExpanded ? 'テキストエリアを縮小' : 'テキストエリアを拡張'}
                          icon={<FaUpDown />}
                          onClick={toggleTextareaExpanded}
                          variant="solid"
                          colorScheme="blackAlpha"
                          opacity={0.6}
                          _hover={{ opacity: 0.9 }}
                          size="sm"
                          position="absolute"
                          top="2"
                          right="2"
                          borderRadius="lg"
                        />
                      </Box>
                      <IconButton
                        aria-label="送信"
                        icon={<FaPaperPlane />}
                        colorScheme="blue"
                        onClick={() => handleUserMessage(textValue)}
                        isDisabled={!textValue.trim() || isBusy || !hasConversationQuota}
                        borderRadius="full"
                        minW="56px"
                        h="56px"
                      />
                    </Flex>
                  )}
                  <Stack spacing={2}>
                    {!isTurnTakingMode && (
                      <Button leftIcon={<FaWandMagicSparkles />} variant="ghost" colorScheme="purple" onClick={handleOpenKarteModal} isDisabled={messages.length <= 1 || isBusy}>
                        カルテを確認
                      </Button>
                    )}
                    {!isInitialMeeting && (
                      <Button variant="solid" colorScheme="teal" onClick={handleFinalizeContinuous} isDisabled={messages.length <= 1 || isBusy}>
                        面談を終了してフィードバックを見る
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </Flex>

      <Modal isOpen={isKarteModalOpen} onClose={handleCloseKarteModal} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl" mx={{ base: 3, md: 0 }} maxH="90dvh" display="flex" flexDirection="column">
          <ModalHeader>
            <Flex align="center" justify="left" gap={3} wrap="wrap">
              <Text fontSize="lg" fontWeight="bold">
                キャリアカルテを確認
              </Text>
              {isInitialMeeting && (
                <Badge colorScheme={initialProgress >= 100 ? 'green' : 'purple'} borderRadius="md" size="lg">
                  {initialProgress}%
                </Badge>
              )}
            </Flex>
            <Text fontSize="sm" color="gray.500" mt={1}>
              作成されたカルテをスクロールしながら確認してください
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pt={0}>
            <Stack spacing={4}>
              {!isInitialMeeting && feedbackText && (
                <Box bg="teal.50" borderRadius="lg" borderWidth="1px" borderColor="teal.200" p={4}>
                  <Text fontSize="sm" fontWeight="bold" color="teal.700" mb={2}>
                    面談フィードバック
                  </Text>
                  <Text fontSize="sm" color="teal.800">
                    {feedbackText}
                  </Text>
                </Box>
              )}
              <KartePanel data={karte} showCondition={stressAnalysisEnabled} />
            </Stack>
          </ModalBody>
          <ModalFooter flexDir={{ base: 'column', sm: 'row' }} gap={3}>
            <Button w="full" variant="outline" colorScheme="blue" onClick={() => handleSaveDraft(true)}>
              一時保存して中断
            </Button>
            <Button
              w="full"
              variant="outline"
              colorScheme="purple"
              onClick={handleSubmitKarte}
              isDisabled={!canSubmitKarte}
            >
              このカルテを保存
            </Button>
          </ModalFooter>
          {isInitialMeeting && !canSubmitKarte && (
            <Box px={6} pb={4}>
              <Text fontSize="xs" color="gray.500">
                初回カルテの正式保存には50%以上の完成が必要です。現在は{initialProgress}%のため、一時保存して中断してください。
              </Text>
            </Box>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MeetingRoom;
