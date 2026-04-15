import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
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
import VrmStage, { type StageModelId } from './VrmStage';
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
  getInitialDetailStepLabel,
  INITIAL_REQUIRED_SHIRP_DETAIL_STEPS,
  SHIRP_DETAIL_FIELDS,
  SHIRP_DETAIL_PROMPT_HINTS,
} from '../lib/shirp';
import { SHIRP_KEYS } from '../types';
import type {
  ContinuousMode,
  ConversationMessage,
  DemoUserState,
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
const MEETING_FINALIZE_RESPONSE_SCHEMA_NAME = 'meeting_room_finalize_response';
const SHIRP_SCHEMA_PROPERTIES = {
  S: { type: ['string', 'null'] },
  H: { type: ['string', 'null'] },
  I: { type: ['string', 'null'] },
  R: { type: ['string', 'null'] },
  P: { type: ['string', 'null'] },
  '#': { type: ['string', 'null'] },
} as const;
const SHIRP_DETAIL_SCHEMA_PROPERTIES = {
  S: {
    type: 'object',
    additionalProperties: false,
    properties: {
      organizationFit: { type: ['string', 'null'] },
      selfEvaluation: { type: ['string', 'null'] },
      relationshipQuality: { type: ['string', 'null'] },
      otherCurrent: { type: ['string', 'null'] },
    },
    required: ['organizationFit', 'selfEvaluation', 'relationshipQuality', 'otherCurrent'],
  },
  H: {
    type: 'object',
    additionalProperties: false,
    properties: {
      desiredIncome: { type: ['string', 'null'] },
      desiredWork: { type: ['string', 'null'] },
      desiredWorkStyle: { type: ['string', 'null'] },
      otherHope: { type: ['string', 'null'] },
    },
    required: ['desiredIncome', 'desiredWork', 'desiredWorkStyle', 'otherHope'],
  },
  I: {
    type: 'object',
    additionalProperties: false,
    properties: {
      skillIssue: { type: ['string', 'null'] },
      healthIssue: { type: ['string', 'null'] },
      ageIssue: { type: ['string', 'null'] },
      familyIssue: { type: ['string', 'null'] },
      otherIssue: { type: ['string', 'null'] },
    },
    required: ['skillIssue', 'healthIssue', 'ageIssue', 'familyIssue', 'otherIssue'],
  },
  R: {
    type: 'object',
    additionalProperties: false,
    properties: {
      strengthQualification: { type: ['string', 'null'] },
      strengthExperience: { type: ['string', 'null'] },
      supporters: { type: ['string', 'null'] },
      timeOrMoney: { type: ['string', 'null'] },
      otherResource: { type: ['string', 'null'] },
    },
    required: ['strengthQualification', 'strengthExperience', 'supporters', 'timeOrMoney', 'otherResource'],
  },
} as const;
const INTERNAL_REPLY_PATTERNS = [
  /["“”']updated_shirp["“”']\s*:/i,
  /["“”']updated_shirp_details["“”']\s*:/i,
  /["“”']is_complete["“”']\s*:/i,
  /["“”']feedback["“”']\s*:/i,
  /(?:\{|\[)\s*["“”']reply["“”']\s*:/i,
];

const SHIRP_GUIDE = `
S (Satisfaction/現状):
- 組織適応
- 自身への評価
- 良好な人間関係
- #そのほかの現状
H (Hope/希望):
- 希望する収入
- 希望する仕事内容
- 希望する勤務形態
- #そのほかの希望
I (Issue/課題):
- スキルの課題
- 健康上の課題
- 年齢の課題
- 家庭の課題
- #そのほかの課題
R (Resource/資源):
- 強みとなる資格
- 強みとなる経験
- 強みとなる協力者
- 強みとなる時間や資金
- #そのほかの強み
P (Plan/プラン):
- S〜Rの情報を元に、AIが解決に向けたプランを生成する。
# (その他):
- S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄。
`;

type InitialDetailStep = (typeof INITIAL_REQUIRED_SHIRP_DETAIL_STEPS)[number];

const greetingForMeeting = (meetingType: MeetingType) =>
  meetingType === 'initial'
    ? 'こんにちは。キャリアメンターです。まずは組織適応から伺います。今の職場や組織の雰囲気、働きやすさについて、どのように感じていますか。なお、この対話は事前準備であり、実際の面談が本番です。'
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
    ['氏名', karte.demographics.name],
    ['年齢', karte.demographics.age],
    ['所属企業', karte.demographics.company],
    ['職種', karte.demographics.jobTitle],
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
      const categoryDetails = shirpDetails[step.category] as Record<string, string | null>;
      return categoryDetails[step.field] ? acc + 1 : acc;
    },
    0,
  );
  return Math.round((filled / total) * 100);
};

const getNextInitialDetailStep = (shirpDetails: ShirpDetailsData): InitialDetailStep | null =>
  INITIAL_REQUIRED_SHIRP_DETAIL_STEPS.find((step) => {
    const categoryDetails = shirpDetails[step.category] as Record<string, string | null>;
    return !categoryDetails[step.field];
  }) ?? null;

const buildInitialPrompt = (karte: KarteData, nextStep: InitialDetailStep | null) => {
  const currentCategory = nextStep?.category ?? 'S';
  const currentField = nextStep?.field;
  const currentStepLabel = currentField
    ? getInitialDetailStepLabel(currentCategory, currentField)
    : 'P. プラン生成と全体整理';
  const currentPromptHint = currentField
    ? (SHIRP_DETAIL_PROMPT_HINTS[currentCategory] as Record<string, string>)[currentField]
    : '全体要約とプラン生成';
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

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーの発話から情報を抽出し、updated_shirp でトップレベル要約を、updated_shirp_details で詳細項目を更新してください。
2. 今回は「${currentStepLabel}」だけを深掘りする質問を1つだけ行ってください。
3. otherCurrent / otherHope / otherIssue / otherResource は、会話中の補足があれば必要に応じて更新して構いません。
4. 必須詳細項目がすべて埋まった場合は、P(プラン)を生成し、面談のまとめを返してください。
5. 4の完了時は、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して初回面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を reply に含めてください。
6. トップレベルの S/H/I/R は、詳細項目を踏まえた要約文にしてください。
7. 余談やS〜Pに当てはまらない内容は#に記録してください。
8. response_format の JSON Schema に厳密に従って出力してください。
9. reply にはユーザーに見せる自然な返答だけを書いてください。
10. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
11. デモグラフィックは既知情報として理解しつつ、断定や過剰な言及は避けてください。
12. 既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
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
2. ユーザーの発話から得た情報で、トップレベル要約と必要な詳細項目の両方を部分更新してください。
3. response_format の JSON Schema に厳密に従って出力してください。
4. reply にはユーザーに見せる自然な返答だけを書いてください。
5. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
6. デモグラフィックは既知情報として扱いますが、返答トーンは現状の自然さを維持してください。
7. 既知のプロフィール情報と矛盾しない前提で応答し、不足分は自然に確認してください。
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
1. 会話履歴から情報を抽出し、SHIRPのトップレベル要約と詳細項目を可能な限り埋めてください。
2. 足りない項目は補足し、P(プラン)を生成してください。
3. 面談後のキャリアに関する簡単なフィードバックを80~120文字で作成してください。
4. reply の最後に、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を含めてください。
5. response_format の JSON Schema に厳密に従って出力してください。
6. reply にはユーザーに見せる自然な返答だけを書いてください。
7. reply に JSON 断片、キー名(updated_shirp / updated_shirp_details / is_complete / feedback)、補足説明は含めないでください。
8. デモグラフィックは整合性確認のために使い、返答のトーンや構成は大きく変えないでください。
9. 既知のプロフィール情報と矛盾しない前提で整理し、不足分は会話履歴ベースで補ってください。
`.trim();

const createMeetingResponseSchema = (finalize: boolean) => ({
  name: finalize ? MEETING_FINALIZE_RESPONSE_SCHEMA_NAME : MEETING_RESPONSE_SCHEMA_NAME,
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
        required: ['S', 'H', 'I', 'R'],
      },
      is_complete: {
        type: 'boolean',
      },
      ...(finalize
        ? {
            feedback: {
              type: 'string',
            },
          }
        : {}),
    },
    required: finalize
      ? ['reply', 'updated_shirp', 'updated_shirp_details', 'feedback', 'is_complete']
      : ['reply', 'updated_shirp', 'updated_shirp_details', 'is_complete'],
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasSuspiciousReplyContent = (reply: string) =>
  INTERNAL_REPLY_PATTERNS.some((pattern) => pattern.test(reply));

const parseStructuredLlmResponse = (content: string, finalize: boolean): LlmResponse => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI応答のJSON解析に失敗しました。');
  }

  if (!isRecord(parsed)) {
    throw new Error('AI応答の形式が不正です。');
  }

  const allowedTopLevelKeys = finalize
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
    if (!Object.keys(SHIRP_DETAIL_FIELDS).includes(categoryKey)) {
      throw new Error('AI応答のupdated_shirp_detailsに許可されていないカテゴリがあります。');
    }
    if (!isRecord(detailValue)) {
      throw new Error('AI応答のupdated_shirp_detailsの形式が不正です。');
    }
    const category = categoryKey as ShirpDetailCategoryKey;
    const allowedFields = SHIRP_DETAIL_FIELDS[category] as readonly string[];
    const nextCategoryUpdates: Record<string, string> = {};

    Object.entries(detailValue).forEach(([fieldKey, fieldContent]) => {
      if (!allowedFields.includes(fieldKey)) {
        throw new Error('AI応答のupdated_shirp_detailsに許可されていない詳細キーがあります。');
      }
      if (fieldContent !== null && typeof fieldContent !== 'string') {
        throw new Error('AI応答のupdated_shirp_detailsの値が不正です。');
      }
      if (typeof fieldContent === 'string') {
        nextCategoryUpdates[fieldKey] = fieldContent;
      }
    });

    validatedDetailUpdates[category] = nextCategoryUpdates as ShirpDetailUpdates[typeof category];
  });

  if (finalize) {
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
  };

  Object.entries(updates).forEach(([categoryKey, categoryUpdates]) => {
    if (!categoryUpdates) return;
    const category = categoryKey as ShirpDetailCategoryKey;
    const categoryDetails = nextShirpDetails[category] as Record<string, string | null>;
    Object.entries(categoryUpdates).forEach(([detailKey, detailValue]) => {
      if (typeof detailValue === 'string' && detailValue.trim()) {
        categoryDetails[detailKey] = detailValue;
      }
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
  const [selectedModelId, setSelectedModelId] = useState<StageModelId>('sample');

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ConversationMessage[]>(messages);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceUrlRef = useRef<string | null>(null);
  const audioResumePositionRef = useRef<number>(0);
  const shouldResumeAudioRef = useRef(false);

  const isInitialMeeting = meetingType === 'initial';
  const isTurnTakingMode = !isInitialMeeting && continuousMode === 'turn';
  const draftAction = searchParams.get('draft');
  const maxApiCalls = isInitialMeeting ? 10 : 7; // 初回面談は10回、継続面談は7回までAPI呼び出し可能（フィードバック生成を含む）
  const conversationQuotaLimit = Math.max(isInitialMeeting ? maxApiCalls : maxApiCalls - 1, 0);
  const hasConversationQuota = apiUsageCount < conversationQuotaLimit;
  const hasApiBudget = apiUsageCount < maxApiCalls;
  const hasUsedApi = hasSessionStarted || apiUsageCount > 0;
  const remainingMessages = Math.max(conversationQuotaLimit - apiUsageCount, 0);
  const isBusy = Boolean(processingText);
  const stressAnalysisEnabled = isStressAnalysisEnabled(userState);
  const latestCondition = useMemo(() => getLatestConditionRecord(userState), [userState]);
  const textareaPlaceholder = useMemo(() => {
    if (apiUsageCount === 0) {
      return 'テキスト入力はこちら...';
    }
    if (remainingMessages === 0) {
      return 'これ以上のテキストは送信することができません';
    }
    return `あと${remainingMessages}回メッセージを送信できます`;
  }, [apiUsageCount, remainingMessages]);

  const initialProgress = useMemo(() => getInitialProgress(karte.shirpDetails), [karte.shirpDetails]);

  const saveUserState = useCallback((nextState: DemoUserState) => {
    setUserState(nextState);
    saveDemoUserState(nextState);
  }, []);

  const disposeActiveAudio = useCallback(() => {
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
    setIsSpeaking(false);
  }, []);

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
      setApiUsageCount(currentDraft.apiUsageCount);
      setConversationStarted(currentDraft.conversationStarted);
      setSessionStarted(currentDraft.hasSessionStarted);
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
            setIsSpeaking(true);
          })
          .catch(() => {
            if (activeAudioRef.current === audio) {
              disposeActiveAudio();
            }
          });
      } else {
        setIsSpeaking(true);
      }
    }
  }, [disposeActiveAudio, isKarteModalOpen]);

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
              messages,
              karte,
              apiUsageCount,
              feedbackText,
              conversationStarted,
              hasSessionStarted,
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
    hasSessionStarted,
    isInitialMeeting,
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
    async (blob: Blob, playbackRate: number) => {
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
        return;
      }

      try {
        await audio.play();
        setIsSpeaking(true);
      } catch (playError) {
        if (activeAudioRef.current === audio) {
          disposeActiveAudio();
        } else {
          URL.revokeObjectURL(url);
        }
        throw playError;
      }
    },
    [disposeActiveAudio, isKarteModalOpen],
  );

  const playWithOpenAiTts = useCallback(
    async (text: string) => {
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
      await playAudioBlob(blob, 1.2);
    },
    [openAiApiKey, playAudioBlob],
  );

  const playWithGeminiTts = useCallback(
    async (text: string) => {
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
      await playAudioBlob(wavBlob, 1.0);
    },
    [geminiApiKey, playAudioBlob, selectedModelId],
  );

  const playTextToSpeech = useCallback(
    async (text: string) => {
      if (!openAiApiKey || !text) return;

      try {
        if (geminiApiKey) {
          try {
            await playWithGeminiTts(text);
            return;
          } catch (geminiError) {
            console.error(geminiError);
            await playWithOpenAiTts(text);
            return;
          }
        }

        await playWithOpenAiTts(text);
      } catch (error) {
        console.error(error);
        toast({
          title: '音声再生に失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 4000,
        });
      }
    },
    [geminiApiKey, openAiApiKey, playWithGeminiTts, playWithOpenAiTts, toast],
  );

  const runLLMProcess = useCallback(
    async (history: ConversationMessage[], finalize = false) => {
      if (!ensureApiKey()) return;
      const nextStep = isInitialMeeting ? getNextInitialDetailStep(karte.shirpDetails) : null;
      const systemPrompt = isInitialMeeting
        ? buildInitialPrompt(karte, nextStep)
        : finalize
          ? buildContinuousFinalizePrompt(karte)
          : buildContinuousPrompt(karte);

      setProcessingText(finalize ? 'カルテとフィードバックを整理しています...' : 'AI思考中...');
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
              json_schema: createMeetingResponseSchema(finalize),
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

        const parsed = parseStructuredLlmResponse(content, finalize);

        setKarte((prev) => updateShirpDetails(updateShirp(prev, parsed.updated_shirp), parsed.updated_shirp_details));

        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: parsed.reply,
        };
        setMessages((prev) => {
          const updated = [...prev, assistantMessage];
          messagesRef.current = updated;
          return updated;
        });

        if (finalize && parsed.feedback) {
          setFeedbackText(parsed.feedback);
        }

        setProcessingText('音声生成中...');
        await playTextToSpeech(parsed.reply);
      } catch (error) {
        console.error(error);
        toast({
          title: 'AIの呼び出しに失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 5000,
        });
      } finally {
        setProcessingText('');
      }
    },
    [ensureApiKey, isInitialMeeting, karte, maxApiCalls, openAiApiKey, playTextToSpeech, toast],
  );

  const handleUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!hasConversationQuota) {
        notifyApiLimit(
          isInitialMeeting ? undefined : `継続面談は${conversationQuotaLimit}回までメッセージを送信できます。`,
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
    [apiUsageCount, conversationQuotaLimit, ensureApiKey, hasConversationQuota, isInitialMeeting, notifyApiLimit, runLLMProcess],
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

  const handleFinalizeContinuous = useCallback(async () => {
    if (isInitialMeeting) return;
    if (!hasApiBudget) {
      notifyApiLimit('API制限に達したためフィードバックを生成できません。');
      return;
    }
    if (!ensureApiKey()) return;
    const finalInputHistory = isTurnTakingMode ? getTurnTakingConversationHistory() : messagesRef.current;
    await runLLMProcess(finalInputHistory, true);
    setKarteModalOpen(true);
  }, [ensureApiKey, getTurnTakingConversationHistory, hasApiBudget, isInitialMeeting, isTurnTakingMode, notifyApiLimit, runLLMProcess]);

  const handleSubmitKarte = useCallback(() => {
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
  }, [continuousMode, disposeActiveAudio, feedbackText, isInitialMeeting, karte, meetingType, navigate, saveUserState, toast]);

  const apiStatusLabel = openAiApiKey
    ? geminiApiKey
      ? 'OpenAI/Gemini Key: 設定済'
      : 'OpenAI Key: 設定済 / Gemini Key: 未設定'
    : 'OpenAI Key: 未設定';
  const apiStatusColor = openAiApiKey ? 'green' : 'gray';

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
                  <Button size="sm" variant="outline" onClick={() => setApiModalOpen(true)}>
                    API設定
                  </Button>
                </Flex>
                {stressAnalysisEnabled && (
                  <Box w="full" bg="orange.50" borderRadius="lg" px={3} py={2} borderWidth="1px" borderColor="orange.200">
                    <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} gap={3} direction={{ base: 'column', sm: 'row' }}>
                      <Stack spacing={0}>
                        <Text fontSize="xs" color="orange.700" fontWeight="bold">
                          面談前コンディション
                        </Text>
                        <Text fontSize="xs" color="orange.700">
                          {latestCondition
                            ? `緊張度スコア ${latestCondition.score} / 100 (${latestCondition.level})`
                            : '緊張度スコア 未測定'}
                        </Text>
                      </Stack>
                      <Button size="xs" variant="outline" colorScheme="orange" onClick={() => navigate('/user/condition-check')}>
                        チェックへ
                      </Button>
                    </Flex>
                  </Box>
                )}
                {!isInitialMeeting && !hasStoredKarte && (
                  <Box bg="orange.50" borderRadius="lg" px={3} py={2} borderWidth="1px" borderColor="orange.200">
                    <Text fontSize="xs" color="orange.700">
                      初回面談のカルテが未保存のため、空のカルテで開始します。
                    </Text>
                  </Box>
                )}
              </Flex>
              <Button mt={6} colorScheme="blue" size="md" w="full" onClick={() => setSessionStarted(true)} isDisabled={hasUsedApi}>
                {isInitialMeeting ? '初回面談を開始する' : '継続面談を開始する'}
              </Button>
            </Box>

            <VrmStage
              isSpeaking={isSpeaking}
              conversationStarted={conversationStarted}
              progress={initialProgress}
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
            <Button w="full" colorScheme="blue" onClick={handleCloseKarteModal}>
              トークに戻る
            </Button>
            <Button w="full" variant="outline" colorScheme="purple" onClick={handleSubmitKarte}>
              このカルテを保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MeetingRoom;
