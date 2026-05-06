import {
  Badge,
  Box,
  Button,
  Collapse,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FiActivity, FiBookOpen, FiClipboard, FiPlayCircle, FiRefreshCw } from 'react-icons/fi';
import { Navigate, useNavigate } from 'react-router-dom';
import KartePanel from '../components/KartePanel';
import PrimaryButton from '../components/PrimaryButton';
import SurveyRadar from '../components/SurveyRadar';
import {
  applyDemographicsToKarte,
  applyConditionToKarte,
  canEnterWithDemographics,
  createEmptyKarte,
  createEmptySurvey,
  getLatestConditionRecord,
  hasSavedDemographics,
  isStressAnalysisEnabled,
  loadDemoUserState,
  saveDemoUserState,
} from '../lib/demoUserState';
import {
  getCompanyApiUsageSummary,
  getDemoUsageQuota,
  subscribeDemoUsageQuota,
  type DemoUsageQuota,
} from '../lib/demoUsageQuota';
import { downloadKarteCsv, downloadKartePdf } from '../lib/karteExport';
import {
  cloneShirpDetails,
  createEmptyShirpDetails,
  getShirpDetailFieldEntries,
  getShirpDetailItemEntries,
  isShirpDetailCategoryKey,
  SHIRP_HINTS,
  SHIRP_LABELS,
} from '../lib/shirp';
import { SHIRP_KEYS } from '../types';
import type {
  ContinuousMode,
  DemoUserState,
  MeetingType,
  ShirpDetailsData,
  ShirpData,
  SurveyFactorKey,
  SurveyResult,
} from '../types';

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

const LIKERT_OPTIONS = ['全くそう思わない', 'そう思わない', 'どちらでもない', 'そう思う', 'とてもそう思う'];
const USER_HOME_HERO_BACKGROUNDS = [
  `${import.meta.env.BASE_URL}hero/user-home-hero-a.jpg`,
  `${import.meta.env.BASE_URL}hero/user-home-hero-b.jpg`,
];

const heroReveal = keyframes`
  from {
    opacity: 0;
    transform: scale(1.04);
    filter: blur(10px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
`;

const heroContentSlide = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 28px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

const decoratedPanelProps = {
  bg: 'transparent',
  color: 'white',
  borderRadius: '0',
  borderWidth: '0',
  p: 6,
  position: 'relative',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
  sx: { backdropFilter: 'blur(14px)' },
  _before: {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '6px',
    bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.72), rgba(226, 232, 240, 0.88), transparent)',
  },
} as const;

const translucentPanelProps = {
  borderWidth: '1px',
  borderColor: 'whiteAlpha.200',
  bg: 'whiteAlpha.100',
  borderRadius: 'md',
} as const;

const mutedTextColor = 'whiteAlpha.800';

type SurveyQuestion = {
  id: string;
  index: number;
  label: string;
  type: 'likert';
  options: string[];
};

type ProfileView = {
  id: string;
  name: string;
  email: string;
  company: string;
  department: string;
  jobTitle: string;
  permission: string;
  age: string;
  workLocationPrefecture: string;
  jobChangeCount: string;
  yearsOfService: string;
  gender: string;
  maritalStatus: string;
  childrenCount: string;
  youngestChildAge: string;
  statusSummary: string;
  statusDetails: Array<{
    label: string;
    colorScheme: string;
  }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  logs: number;
  companyApiLimit: number;
  companyApiUsed: number;
  companyApiRemaining: number;
  companyApiUsageLabel: string;
  perMeetingTurnLimit: number;
  canStartMeeting: boolean;
};

type PendingStart = {
  meetingType: MeetingType;
  continuousMode: ContinuousMode | null;
};

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 'q6_59', index: 1, label: '自分のこれからのキャリアにとって環境変化に能動的に対応している', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_42', index: 2, label: '仕事のために新しいことを色々と勉強している', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_56', index: 3, label: 'キャリア設計は自分にとって重要な課題である', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_58', index: 4, label: '自分が望むキャリアを歩むためなら努力を惜しまない', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_55', index: 5, label: 'これからのキャリアをより充実したものにしたいと強く思う', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_94', index: 6, label: '新しい仕事があったら積極的にそれをやりたいと願い出る', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_109', index: 7, label: '新しいことを学ぶ機会は私にとって重要である', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_39', index: 8, label: '常に仕事上の行動には責任をとっている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_82', index: 9, label: '嫌な出来事があった時、その問題を解決するための情報を集める', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_8', index: 10, label: '問題やミスをすぐに上司に報告している', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_166', index: 11, label: '自分が何が得意で何が不得手かをわかっている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_105', index: 12, label: '私は困難なことを達成できなかった場合、もう一度行う時には前よりも一層熱心に取り組むようにしている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_207', index: 13, label: '私の職位にふさわしい言動をするように心がけている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_9', index: 14, label: '自身に与えられた役割を受け入れている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_137', index: 15, label: '自分のスキルや貢献が今の職場では十分に報酬に反映されていると思う', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_142', index: 16, label: '今の会社に勤めていることは自分の誇りである', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_140', index: 17, label: '今の会社には単なる会社以上の思い入れがある', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_23', index: 18, label: '今の会社で得られるものは努力に値するものだと思う', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_22', index: 19, label: '周囲のメンバーと良い関係を築けている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_123', index: 20, label: '社内外の人から信頼を得られている', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_11', index: 21, label: '困ったときに相談できる人がいる', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_14', index: 22, label: '仕事でストレスを感じたとき、うまく気分転換できる', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_13', index: 23, label: '落ち込んだときに自分で気持ちを立て直せる', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_126', index: 24, label: 'ネガティブな感情を必要以上に引きずらない', type: 'likert', options: LIKERT_OPTIONS },
  { id: 'q6_134', index: 25, label: '自分の感情の変化に気づきやすい', type: 'likert', options: LIKERT_OPTIONS },
];

const createDefaultSurveyAnswers = () =>
  SURVEY_QUESTIONS.reduce<Record<string, string>>((acc, question) => {
    acc[question.id] = question.options[2] ?? '';
    return acc;
  }, {});

const calculateSurveyFactors = (answers: Record<string, string>): SurveyResult => {
  const groups = SURVEY_FACTOR_KEYS.map((key, groupIndex) => {
    const start = groupIndex * 5;
    const items = SURVEY_QUESTIONS.slice(start, start + 5);
    const scores = items.map((question) => {
      const selected = answers[question.id];
      const index = question.options.indexOf(selected);
      return index >= 0 ? index : 0;
    });
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const normalized = Math.round((average / 4) * 100);
    return { key, value: normalized };
  });

  return {
    factors: groups.reduce<SurveyResult['factors']>((acc, entry) => {
      acc[entry.key] = entry.value;
      return acc;
    }, createEmptySurvey().factors),
    lastUpdated: new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
  };
};

const formatShortDate = () =>
  new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const getDraftMetaLabel = (meetingType: MeetingType) => (meetingType === 'initial' ? '初回面談の下書き' : '継続面談の下書き');

const resolveProfile = (userState: DemoUserState, usageQuota: DemoUsageQuota): ProfileView => {
  const latestRecord = userState.karteRecords[0];
  const hasDraft = Boolean(userState.draftSessions.initial || userState.draftSessions.continuous);
  const demographics = userState.demographics;
  const hasInitialCompleted = userState.karteRecords.some((record) => record.meetingType === 'initial');
  const hasContinuousCompleted = userState.karteRecords.some((record) => record.meetingType === 'continuous');
  const hasProfileSaved = hasSavedDemographics(userState);
  const statusDetails: ProfileView['statusDetails'] = [];

  if (hasProfileSaved) {
    statusDetails.push({ label: 'プロフィール保存済み', colorScheme: 'orange' });
  } else if (userState.demographicsSkipped) {
    statusDetails.push({ label: 'プロフィール未設定（デモスキップ中）', colorScheme: 'gray' });
  }
  if (hasInitialCompleted) {
    statusDetails.push({ label: '初回面談完了', colorScheme: 'blue' });
  }
  if (hasContinuousCompleted) {
    statusDetails.push({ label: '継続面談完了', colorScheme: 'teal' });
  }
  if (hasDraft) {
    statusDetails.push({ label: '面談下書きあり', colorScheme: 'purple' });
  }

  const statusSummary = hasDraft
    ? '進行中の面談あり'
    : hasContinuousCompleted
      ? '継続面談まで完了'
      : hasInitialCompleted
        ? '初回面談まで完了'
        : hasProfileSaved
          ? 'プロフィール保存済み'
          : userState.demographicsSkipped
            ? 'デモスキップ中'
          : '面談準備中';
  const apiUsage = getCompanyApiUsageSummary(usageQuota);

  return {
    id: demographics.accountId || 'USR-2024-021',
    name: demographics.name || '未設定',
    email: demographics.email || 'hanako.yamada@example.com',
    company: demographics.company || 'Career Carte Assistant Demo',
    department: demographics.department || '未設定',
    jobTitle: demographics.jobTitle || '未設定',
    permission: demographics.permission || '一般ユーザー',
    age: demographics.age || '未設定',
    workLocationPrefecture: demographics.workLocationPrefecture || '未設定',
    jobChangeCount: demographics.jobChangeCount || '未設定',
    yearsOfService: demographics.yearsOfService || '未設定',
    gender: demographics.gender || '未設定',
    maritalStatus: demographics.maritalStatus || '未設定',
    childrenCount: demographics.childrenCount || '未設定',
    youngestChildAge: demographics.youngestChildAge || '未設定',
    statusSummary,
    statusDetails,
    tags: [demographics.company, demographics.department, demographics.jobTitle, demographics.workLocationPrefecture].filter(
      (value): value is string => Boolean(value),
    ),
    createdAt: '2024-09-05 10:20',
    updatedAt:
      userState.draftSessions.continuous?.updatedAt ||
      userState.draftSessions.initial?.updatedAt ||
      latestRecord?.atUpdated ||
      '未更新',
    logs: userState.karteRecords.reduce((sum, record) => sum + record.conversationLog.length, 0),
    companyApiLimit: apiUsage.totalLimit,
    companyApiUsed: apiUsage.used,
    companyApiRemaining: apiUsage.remaining,
    companyApiUsageLabel: apiUsage.usageLabel,
    perMeetingTurnLimit: apiUsage.perMeetingTurnLimit,
    canStartMeeting: apiUsage.canStartMeeting,
  };
};

function UserHome() {
  const toast = useToast();
  const navigate = useNavigate();
  const accountDisclosure = useDisclosure();
  const karteModalDisclosure = useDisclosure();
  const conversationLogDisclosure = useDisclosure();
  const resetModalDisclosure = useDisclosure();
  const surveyModalDisclosure = useDisclosure();
  const continuousModeDisclosure = useDisclosure();
  const resumeDraftDisclosure = useDisclosure();

  const [userState, setUserState] = useState<DemoUserState>(() => loadDemoUserState());
  const [usageQuota, setUsageQuota] = useState<DemoUsageQuota>(() => getDemoUsageQuota());
  const [continuousMode, setContinuousMode] = useState<ContinuousMode>('normal');
  const [pendingStart, setPendingStart] = useState<PendingStart | null>(null);
  const [isEditingLatest, setIsEditingLatest] = useState(false);
  const [heroBackground] = useState(
    () => USER_HOME_HERO_BACKGROUNDS[Math.floor(Math.random() * USER_HOME_HERO_BACKGROUNDS.length)] ?? USER_HOME_HERO_BACKGROUNDS[0],
  );
  const [latestDraft, setLatestDraft] = useState<ShirpData>({
    S: '',
    H: '',
    I: '',
    R: '',
    P: '',
    '#': '',
  });
  const [latestDetailDraft, setLatestDetailDraft] = useState<ShirpDetailsData>(() => createEmptyShirpDetails());
  const defaultSurveyAnswers = useMemo(() => createDefaultSurveyAnswers(), []);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>(() => defaultSurveyAnswers);
  const [lastSurveyAnswers, setLastSurveyAnswers] = useState<Record<string, string>>(() => defaultSurveyAnswers);

  useEffect(() => subscribeDemoUsageQuota(setUsageQuota), []);

  const profile = useMemo(() => resolveProfile(userState, usageQuota), [usageQuota, userState]);
  const stressAnalysisEnabled = isStressAnalysisEnabled(userState);
  const latestCondition = useMemo(() => getLatestConditionRecord(userState), [userState]);
  const latestKarte = useMemo(
    () =>
      applyConditionToKarte(
        applyDemographicsToKarte(userState.latestKarte ?? createEmptyKarte(), userState.demographics),
        latestCondition ?? userState.latestKarte?.conditionSummary ?? null,
      ),
    [latestCondition, userState.demographics, userState.latestKarte],
  );
  const latestRecord = userState.karteRecords[0] ?? null;
  const surveyScores = SURVEY_FACTOR_KEYS.map((key) => latestKarte.survey.factors[key] ?? 0);
  const hasSurvey = surveyScores.some((score) => score > 0);

  if (!canEnterWithDemographics(userState)) {
    return <Navigate to="/user/demographics?returnTo=%2Fuser" replace />;
  }

  const persistUserState = (nextState: DemoUserState) => {
    setUserState(nextState);
    saveDemoUserState(nextState);
  };

  const startMeeting = (meetingType: MeetingType, mode: ContinuousMode | null, draftAction?: 'resume' | 'fresh') => {
    const query = new URLSearchParams();
    if (mode) {
      query.set('mode', mode);
    }
    if (draftAction) {
      query.set('draft', draftAction);
    }
    const path = meetingType === 'initial' ? '/app/initial' : '/app/continuous';
    navigate(query.size > 0 ? `${path}?${query.toString()}` : path);
  };

  const handleOpenResumeDraft = (meetingType: MeetingType, mode: ContinuousMode | null) => {
    setPendingStart({ meetingType, continuousMode: mode });
    resumeDraftDisclosure.onOpen();
  };

  const handleStartInitial = () => {
    if (!profile.canStartMeeting) {
      toast({
        title: '企業のAPI残枠が不足しています',
        description: `面談開始には企業API残枠が${profile.perMeetingTurnLimit}回以上必要です。現在の使用状況は${profile.companyApiUsageLabel}です。`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (userState.draftSessions.initial) {
      handleOpenResumeDraft('initial', null);
      return;
    }
    startMeeting('initial', null);
  };

  const handleStartContinuous = () => {
    if (!profile.canStartMeeting) {
      toast({
        title: '企業のAPI残枠が不足しています',
        description: `面談開始には企業API残枠が${profile.perMeetingTurnLimit}回以上必要です。現在の使用状況は${profile.companyApiUsageLabel}です。`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    continuousModeDisclosure.onOpen();
  };

  const handleConfirmContinuous = () => {
    continuousModeDisclosure.onClose();
    if (userState.draftSessions.continuous) {
      handleOpenResumeDraft('continuous', continuousMode);
      return;
    }
    startMeeting('continuous', continuousMode);
  };

  const handleResumeDraft = () => {
    if (!pendingStart) return;
    const draft =
      pendingStart.meetingType === 'initial' ? userState.draftSessions.initial : userState.draftSessions.continuous;
    const mode = pendingStart.meetingType === 'continuous' ? draft?.continuousMode ?? pendingStart.continuousMode ?? 'normal' : null;
    resumeDraftDisclosure.onClose();
    startMeeting(pendingStart.meetingType, mode, 'resume');
  };

  const handleStartFresh = () => {
    if (!pendingStart) return;
    const nextState: DemoUserState = {
      ...userState,
      draftSessions: {
        ...userState.draftSessions,
        [pendingStart.meetingType]: null,
      },
    };
    persistUserState(nextState);
    const mode = pendingStart.meetingType === 'continuous' ? pendingStart.continuousMode ?? 'normal' : null;
    resumeDraftDisclosure.onClose();
    startMeeting(pendingStart.meetingType, mode, 'fresh');
  };

  const handleDownload = async (type: 'csv' | 'pdf') => {
    if (!latestRecord) {
      toast({
        title: type === 'csv' ? 'CSV出力できません' : 'PDF出力できません',
        description: '保存済みの最新カルテがありません。カルテを保存してから再度お試しください。',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const payload = {
      karte: latestKarte,
      meta: {
        meetingType: latestRecord.meetingType,
        createdAt: latestRecord.atCreated,
        updatedAt: latestRecord.atUpdated,
        feedback: latestRecord.feedback,
      },
    };

    try {
      if (type === 'csv') {
        downloadKarteCsv(payload);
      } else {
        await downloadKartePdf(payload);
      }
      toast({
        title: type === 'csv' ? 'CSVをダウンロードしました' : 'PDFをダウンロードしました',
        status: 'success',
        duration: 2400,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: type === 'csv' ? 'CSV出力に失敗しました' : 'PDF出力に失敗しました',
        description: (error as Error).message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleSurveySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const surveyResult = calculateSurveyFactors(surveyAnswers);
    const nextLatestKarte = {
      ...latestKarte,
      survey: surveyResult,
    };

    const nextState: DemoUserState = {
      ...userState,
      latestKarte: nextLatestKarte,
      karteRecords:
        userState.karteRecords.length > 0
          ? [
              {
                ...userState.karteRecords[0],
                data: {
                  ...userState.karteRecords[0].data,
                  survey: surveyResult,
                },
                atUpdated: formatShortDate(),
              },
              ...userState.karteRecords.slice(1),
            ]
          : userState.karteRecords,
    };

    persistUserState(nextState);
    setLastSurveyAnswers(surveyAnswers);
    toast({
      title: 'アンケートを送信しました',
      description: '貴重なご意見をありがとうございます。',
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
    surveyModalDisclosure.onClose();
  };

  const handleEditLastSurvey = () => {
    setSurveyAnswers(lastSurveyAnswers);
  };

  const handleResetPassword = () => {
    toast({
      title: 'パスワードリセット手続き',
      description: '登録メールアドレス宛に案内を送信しました（ダミー）。',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    resetModalDisclosure.onClose();
  };

  const handleStartEdit = () => {
    setLatestDraft({
      ...latestKarte.shirp,
      S: latestKarte.shirp.S ?? '',
      H: latestKarte.shirp.H ?? '',
      I: latestKarte.shirp.I ?? '',
      R: latestKarte.shirp.R ?? '',
      P: latestKarte.shirp.P ?? '',
      '#': latestKarte.shirp['#'] ?? '',
    });
    setLatestDetailDraft(cloneShirpDetails(latestKarte.shirpDetails));
    setIsEditingLatest(true);
  };

  const handleSaveEdit = () => {
    const atUpdated = formatShortDate();
    const nextLatestKarte = {
      ...latestKarte,
      shirp: { ...latestKarte.shirp, ...latestDraft },
      shirpDetails: cloneShirpDetails(latestDetailDraft),
    };

    const nextRecords =
      userState.karteRecords.length > 0
        ? [
            {
              ...userState.karteRecords[0],
              statusLabel: 'ユーザー編集済み',
              atUpdated,
              data: {
                ...userState.karteRecords[0].data,
                shirp: { ...userState.karteRecords[0].data.shirp, ...latestDraft },
                shirpDetails: cloneShirpDetails(latestDetailDraft),
              },
            },
            ...userState.karteRecords.slice(1),
          ]
        : userState.karteRecords;

    persistUserState({
      ...userState,
      latestKarte: nextLatestKarte,
      karteRecords: nextRecords,
    });
    setIsEditingLatest(false);
  };

  const handleCancelEdit = () => {
    setIsEditingLatest(false);
  };

  return (
    <Box
      bgGradient="linear(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)"
      height="100dvh"
      py={{ base: 6, md: 8 }}
      overflowY="scroll"
      color="white"
    >
      <Container maxW="6xl">
        <Stack spacing={10}>
          <Box
            position="relative"
            borderRadius="0"
            boxShadow="0 28px 80px rgba(15, 23, 42, 0.32)"
            px={{ base: 6, md: 10 }}
            py={{ base: 5, md: 7 }}
            bgImage={`linear-gradient(rgba(8, 15, 26, 0.68), rgba(8, 15, 26, 0.72)), url(${heroBackground})`}
            bgPosition="center"
            bgRepeat="no-repeat"
            bgSize="cover"
            overflow="hidden"
            animation={`${heroReveal} 0.9s cubic-bezier(0.22, 1, 0.36, 1) both`}
            _before={{
              content: '""',
              position: 'absolute',
              inset: 0,
              bg: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 30%, rgba(8,15,26,0.12) 100%)',
              pointerEvents: 'none',
            }}
            _after={{
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.72), rgba(226, 232, 240, 0.88), transparent)',
              zIndex: 1,
            }}
          >
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align={{ md: 'center' }}
              gap={6}
              position="relative"
              zIndex={1}
              animation={`${heroContentSlide} 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both`}
            >
              <Stack spacing={1} flex="1">
                <Heading size="lg" color="white">
                  {profile.name} さんのマイページ
                </Heading>
                <Text color="whiteAlpha.900">{profile.company} / {profile.department} / {profile.jobTitle}</Text>
                <Text color="whiteAlpha.800">ID: {profile.id}</Text>
                <Box
                  mt={3}
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                  borderRadius="xl"
                  p={3}
                  bg="blackAlpha.500"
                  backdropFilter="blur(10px)"
                  boxShadow="0 20px 50px rgba(0, 0, 0, 0.18)"
                >
                  <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={3} mb={2} direction={{ base: 'column', md: 'row' }}>
                    <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.900">
                      プロフィールメモ
                    </Text>
                    <Button size="xs" colorScheme="orange" variant="outline" onClick={() => navigate('/user/demographics?returnTo=%2Fuser')}>
                      プロフィールを編集
                    </Button>
                  </Flex>
                  <Tabs variant="enclosed" size="sm">
                    <TabList borderColor="whiteAlpha.300">
                      <Tab
                        color="whiteAlpha.800"
                        bg="whiteAlpha.80"
                        borderColor="whiteAlpha.200"
                        _selected={{
                          color: 'white',
                          bg: 'whiteAlpha.220',
                          borderColor: 'whiteAlpha.400',
                        }}
                        _hover={{ color: 'white', borderColor: 'whiteAlpha.400' }}
                      >
                        基本情報
                      </Tab>
                      <Tab
                        color="whiteAlpha.800"
                        bg="whiteAlpha.80"
                        borderColor="whiteAlpha.200"
                        _selected={{
                          color: 'white',
                          bg: 'whiteAlpha.220',
                          borderColor: 'whiteAlpha.400',
                        }}
                        _hover={{ color: 'white', borderColor: 'whiteAlpha.400' }}
                      >
                        個人情報詳細
                      </Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel px={0} pt={3}>
                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                          <Text fontSize="sm" color="whiteAlpha.900">ID: {profile.id}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">氏名: {profile.name}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">メール: {profile.email}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">会社名: {profile.company}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">部署: {profile.department}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">職種: {profile.jobTitle}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">権限: {profile.permission}</Text>
                        </SimpleGrid>
                      </TabPanel>
                      <TabPanel px={0} pt={3}>
                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                          <Text fontSize="sm" color="whiteAlpha.900">勤務地(都道府県): {profile.workLocationPrefecture}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">転職歴(回数): {profile.jobChangeCount}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">勤続年数(年): {profile.yearsOfService}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">性別: {profile.gender}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">現在の婚姻関係: {profile.maritalStatus}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">子供の有無(人): {profile.childrenCount}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">末子の年齢(歳): {profile.youngestChildAge}</Text>
                        </SimpleGrid>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </Box>
              </Stack>
              <Stack align="flex-start" spacing={2}>
                <Badge colorScheme="purple" borderRadius="full" px={3} py={1}>
                  {profile.statusSummary}
                </Badge>
                <Flex wrap="wrap" gap={2}>
                  {profile.tags.map((tag) => (
                    <Badge key={tag} bg="whiteAlpha.240" color="white" borderRadius="full" variant="solid">
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              </Stack>
            </Flex>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box {...decoratedPanelProps}>
              <Stack spacing={4}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiPlayCircle /> 面談スタート
                </Heading>
                <Text color={mutedTextColor}>
                  初期版では初回面談を利用できます。継続面談は今後の実装対象です。
                </Text>
                <Stack spacing={3}>
                  <PrimaryButton size="lg" onClick={handleStartInitial}>
                    初回面談を開始
                  </PrimaryButton>
                  <Button
                    variant="outline"
                    size="lg"
                    color="white"
                    borderColor="whiteAlpha.500"
                    _hover={{ bg: 'whiteAlpha.160' }}
                    onClick={handleStartContinuous}
                    isDisabled
                  >
                    継続面談を開始（準備中）
                  </Button>
                </Stack>
                <Stack spacing={2}>
                  {userState.draftSessions.initial && (
                    <Box {...translucentPanelProps} p={3}>
                      <Text fontSize="sm" fontWeight="semibold" color="white">
                        {getDraftMetaLabel('initial')}
                      </Text>
                      <Text fontSize="xs" color={mutedTextColor}>
                        最終保存: {userState.draftSessions.initial.updatedAt || '未記録'}
                      </Text>
                    </Box>
                  )}
                  {userState.draftSessions.continuous && (
                    <Box {...translucentPanelProps} p={3}>
                      <Text fontSize="sm" fontWeight="semibold" color="white">
                        {getDraftMetaLabel('continuous')}
                      </Text>
                      <Text fontSize="xs" color={mutedTextColor}>
                        最終保存: {userState.draftSessions.continuous.updatedAt || '未記録'}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Box>

            <Box {...decoratedPanelProps}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiClipboard /> ユーザアンケート
                </Heading>
                <Text color={mutedTextColor}>ユーザーアンケートは初期版では準備中です。</Text>
                <PrimaryButton size="lg" isDisabled>
                  アンケートを開く（準備中）
                </PrimaryButton>
                <Box {...translucentPanelProps} p={4} borderLeft="4px solid" borderLeftColor="whiteAlpha.500">
                  <Stack spacing={4} align="center">
                    <Text fontSize="sm" color={mutedTextColor} fontWeight="bold" alignSelf="flex-start">
                      前回アンケートスコア
                    </Text>
                    {hasSurvey ? (
                      <SurveyRadar
                        labels={Object.values(SURVEY_LABELS)}
                        values={surveyScores}
                        size={200}
                        labelColor="rgba(248, 250, 252, 0.94)"
                        labelStroke="rgba(15, 23, 42, 0.72)"
                      />
                    ) : (
                      <Text fontSize="sm" color={mutedTextColor} py={8}>
                        未回答
                      </Text>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Box {...decoratedPanelProps}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiActivity /> 面談前コンディションチェック
                </Heading>
                {stressAnalysisEnabled ? (
                  <>
                    <Text color={mutedTextColor}>
                      面談前コンディションチェックは初期版では準備中です。
                    </Text>
                    <Box {...translucentPanelProps} p={4} borderLeft="4px solid" borderLeftColor="whiteAlpha.500">
                      {latestCondition ? (
                        <Stack spacing={1}>
                          <Text fontSize="sm" color={mutedTextColor} fontWeight="bold">
                            直近の緊張度スコア
                          </Text>
                          <Text fontSize="xl" color="white" fontWeight="bold">
                            {latestCondition.score} / 100
                            <Text as="span" ml={2} fontSize="sm" color={mutedTextColor}>
                              {latestCondition.level}
                            </Text>
                          </Text>
                          <Text fontSize="xs" color={mutedTextColor}>
                            測定日時: {new Date(latestCondition.measuredAt).toLocaleString('ja-JP')}
                          </Text>
                        </Stack>
                      ) : (
                        <Text fontSize="sm" color={mutedTextColor}>
                          まだ測定されていません。
                        </Text>
                      )}
                    </Box>
                    <PrimaryButton isDisabled>
                      チェックを開く（準備中）
                    </PrimaryButton>
                  </>
                ) : (
                  <>
                    <Text color={mutedTextColor}>
                      現在の企業では契約オプションが未有効です。企業管理者画面で有効化できます。
                    </Text>
                    <Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160' }} onClick={() => navigate('/company-admin')}>
                      企業管理者画面へ
                    </Button>
                  </>
                )}
              </Stack>
            </Box>

            <Box {...decoratedPanelProps}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiBookOpen /> カルテ確認・出力
                </Heading>
                <Text color={mutedTextColor}>保存済みカルテの確認、会話ログの閲覧、出力を行います。</Text>
                <Stack spacing={3}>
                  <PrimaryButton onClick={karteModalDisclosure.onOpen} size="md" w="full">
                    カルテを開く
                  </PrimaryButton>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                    <Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160' }} onClick={() => handleDownload('csv')}>
                      CSV出力
                    </Button>
                    <Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160' }} onClick={() => handleDownload('pdf')}>
                      PDF出力
                    </Button>
                  </SimpleGrid>
                </Stack>
                <Text fontSize="sm" color={mutedTextColor}>
                  保存済み履歴: {userState.karteRecords.length}件 / 会話ログ: {profile.logs}件
                </Text>
              </Stack>
            </Box>

            <Box {...decoratedPanelProps}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiRefreshCw /> アカウント情報確認
                </Heading>
                <Text color={mutedTextColor}>登録内容とパスワードの管理が行えます。</Text>
                <Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160' }} onClick={accountDisclosure.onToggle}>
                  {accountDisclosure.isOpen ? '情報を閉じる' : '情報を表示'}
                </Button>
                <Collapse in={accountDisclosure.isOpen} animateOpacity>
                  <Box pt={4}>
                    <Tabs variant="enclosed" size="sm">
                      <TabList borderColor="whiteAlpha.300">
                        <Tab color="whiteAlpha.800" _selected={{ color: 'white', bg: 'whiteAlpha.160' }}>
                          基本情報
                        </Tab>
                        <Tab color="whiteAlpha.800" _selected={{ color: 'white', bg: 'whiteAlpha.160' }}>
                          個人情報詳細
                        </Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel px={0} pt={3}>
                          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>ID</Text>
                              <Text fontWeight="semibold">{profile.id}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>氏名</Text>
                              <Text fontWeight="semibold">{profile.name}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>メール</Text>
                              <Text fontWeight="semibold">{profile.email}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>会社名</Text>
                              <Text fontWeight="semibold">{profile.company}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>部署</Text>
                              <Text fontWeight="semibold">{profile.department}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>職種</Text>
                              <Text fontWeight="semibold">{profile.jobTitle}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>権限</Text>
                              <Text fontWeight="semibold">{profile.permission}</Text>
                            </Stack>
                          </SimpleGrid>
                        </TabPanel>
                        <TabPanel px={0} pt={3}>
                          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>勤務地(都道府県)</Text>
                              <Text fontWeight="semibold">{profile.workLocationPrefecture}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>転職歴(回数)</Text>
                              <Text fontWeight="semibold">{profile.jobChangeCount}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>勤続年数(年)</Text>
                              <Text fontWeight="semibold">{profile.yearsOfService}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>性別</Text>
                              <Text fontWeight="semibold">{profile.gender}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>現在の婚姻関係</Text>
                              <Text fontWeight="semibold">{profile.maritalStatus}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>子供の有無(人)</Text>
                              <Text fontWeight="semibold">{profile.childrenCount}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color={mutedTextColor}>末子の年齢(歳)</Text>
                              <Text fontWeight="semibold">{profile.youngestChildAge}</Text>
                            </Stack>
                          </SimpleGrid>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                    <Flex mt={4} gap={3} wrap="wrap">
                      <Button color="white" borderColor="whiteAlpha.500" variant="outline" _hover={{ bg: 'whiteAlpha.160' }} onClick={() => navigate('/user/demographics?returnTo=%2Fuser')}>
                        プロフィールを編集
                      </Button>
                      <Button color="white" borderColor="whiteAlpha.500" variant="outline" _hover={{ bg: 'whiteAlpha.160' }} onClick={resetModalDisclosure.onOpen}>
                        パスワードを再設定する
                      </Button>
                    </Flex>
                  </Box>
                </Collapse>
              </Stack>
            </Box>
          </SimpleGrid>
        </Stack>
      </Container>

      <Modal isOpen={karteModalDisclosure.isOpen} onClose={karteModalDisclosure.onClose} size="full" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.760" backdropFilter="blur(7px)" />
        <ModalContent
          bg="rgba(15, 23, 42, 0.98)"
          color="white"
          borderRadius="0"
          borderWidth="1px"
          borderColor="rgba(255, 255, 255, 0.18)"
          boxShadow="0 34px 110px rgba(0, 0, 0, 0.62)"
          overflow="hidden"
          maxW={{ base: '100vw', lg: '94vw', '2xl': '1480px' }}
          maxH={{ base: '100dvh', md: 'calc(100dvh - 32px)' }}
          my={{ base: 0, md: 4 }}
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.74), rgba(241, 245, 249, 0.92), transparent)',
            zIndex: 1,
          }}
        >
          <ModalHeader
            pt={8}
            pb={5}
            bg="linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))"
            borderBottomWidth="1px"
            borderColor="rgba(255, 255, 255, 0.16)"
          >
            カルテ確認
          </ModalHeader>
          <ModalCloseButton color="rgba(255, 255, 255, 0.85)" top={5} _hover={{ bg: 'whiteAlpha.160', color: 'white' }} />
          <ModalBody overflowY="auto" bg="rgba(2, 6, 23, 0.82)" px={0} py={0}>
            <Stack spacing={4}>
              <Box
                borderWidth="1px"
                borderColor="rgba(255, 255, 255, 0.16)"
                borderRadius="0"
                p={{ base: 4, md: 5 }}
                bg="rgba(15, 23, 42, 0.74)"
                m={{ base: 3, md: 5 }}
              >
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Stack spacing={1}>
                    <Text fontSize="sm" color="rgba(255, 255, 255, 0.66)">作成日: {latestRecord?.atCreated ?? '未保存'}</Text>
                    <Text fontSize="sm" color="rgba(255, 255, 255, 0.66)">最終更新日: {latestRecord?.atUpdated ?? profile.updatedAt}</Text>
                    <Text fontSize="sm" color="rgba(255, 255, 255, 0.66)">面談種別: {latestRecord ? (latestRecord.meetingType === 'initial' ? '初回面談' : '継続面談') : '未開始'}</Text>
                  </Stack>
                  <Badge colorScheme={latestRecord ? 'green' : 'gray'}>
                    {latestRecord?.statusLabel ?? '下書き'}
                  </Badge>
                </Flex>
              </Box>

              {latestRecord?.feedback && (
                <Box bg="rgba(19, 78, 74, 0.42)" borderRadius="0" borderWidth="1px" borderColor="teal.300" p={4} mx={{ base: 3, md: 5 }}>
                  <Text fontSize="sm" fontWeight="bold" color="teal.100" mb={2}>
                    面談フィードバック
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.900">
                    {latestRecord.feedback}
                  </Text>
                </Box>
              )}

              {isEditingLatest ? (
                <Stack spacing={3}>
                  {SHIRP_KEYS.map((key) => (
                    <Stack key={key} spacing={3}>
                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="rgba(255, 255, 255, 0.78)" mb={1}>
                          {SHIRP_LABELS[key]}
                        </Text>
                        <Text fontSize="xs" color="rgba(255, 255, 255, 0.56)" mb={1}>
                          {SHIRP_HINTS[key]}
                        </Text>
                        <Textarea
                          value={latestDraft[key] ?? ''}
                          onChange={(event) =>
                            setLatestDraft((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          rows={3}
                          bg="rgba(15, 23, 42, 0.74)"
                          color="white"
                          borderColor="rgba(255, 255, 255, 0.22)"
                          _hover={{ borderColor: 'rgba(255, 255, 255, 0.36)' }}
                          _focus={{ borderColor: 'rgba(226, 232, 240, 0.82)', boxShadow: '0 0 0 1px rgba(226, 232, 240, 0.5)' }}
                        />
                      </Box>
                      {isShirpDetailCategoryKey(key) && (
                        <Box pl={{ base: 0, md: 4 }}>
                          <Text fontSize="xs" fontWeight="bold" color="rgba(255, 255, 255, 0.78)" mb={2}>
                            {SHIRP_LABELS[key]} の詳細
                          </Text>
                          <Stack spacing={4}>
                            {getShirpDetailFieldEntries(key).map(([field, definition]) => {
                              const fieldValue = latestDetailDraft[key]?.[field];
                              return (
                                <Box key={`${key}-${field}`} borderWidth="1px" borderColor="rgba(255, 255, 255, 0.16)" borderRadius="0" p={3} bg="rgba(15, 23, 42, 0.48)">
                                  <Text fontSize="xs" color="rgba(255, 255, 255, 0.65)" mb={1}>
                                    {definition.label}
                                  </Text>
                                  <Textarea
                                    value={fieldValue?.summary ?? ''}
                                    onChange={(event) =>
                                      setLatestDetailDraft((prev) => ({
                                        ...prev,
                                        [key]: {
                                          ...prev[key],
                                          [field]: {
                                            summary: event.target.value,
                                            items: {
                                              ...(prev[key]?.[field]?.items ?? {}),
                                            },
                                          },
                                        },
                                      }))
                                    }
                                    rows={3}
                                    bg="rgba(15, 23, 42, 0.74)"
                                    color="white"
                                    borderColor="rgba(255, 255, 255, 0.22)"
                                    _hover={{ borderColor: 'rgba(255, 255, 255, 0.36)' }}
                                    _focus={{ borderColor: 'rgba(226, 232, 240, 0.82)', boxShadow: '0 0 0 1px rgba(226, 232, 240, 0.5)' }}
                                    placeholder="二段目の要約"
                                  />
                                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={3}>
                                    {getShirpDetailItemEntries(key, field).map(([itemKey, itemLabel]) => (
                                      <Box key={`${key}-${field}-${itemKey}`}>
                                        <Text fontSize="xs" color="rgba(255, 255, 255, 0.65)" mb={1}>
                                          {itemLabel}
                                        </Text>
                                        <Textarea
                                          value={fieldValue?.items?.[itemKey] ?? ''}
                                          onChange={(event) =>
                                            setLatestDetailDraft((prev) => ({
                                              ...prev,
                                              [key]: {
                                                ...prev[key],
                                                [field]: {
                                                  summary: prev[key]?.[field]?.summary ?? null,
                                                  items: {
                                                    ...(prev[key]?.[field]?.items ?? {}),
                                                    [itemKey]: event.target.value,
                                                  },
                                                },
                                              },
                                            }))
                                          }
                                          rows={2}
                                          bg="rgba(15, 23, 42, 0.74)"
                                          color="white"
                                          borderColor="rgba(255, 255, 255, 0.22)"
                                          _hover={{ borderColor: 'rgba(255, 255, 255, 0.36)' }}
                                          _focus={{ borderColor: 'rgba(226, 232, 240, 0.82)', boxShadow: '0 0 0 1px rgba(226, 232, 240, 0.5)' }}
                                          placeholder="三段目の具体項目"
                                        />
                                      </Box>
                                    ))}
                                  </SimpleGrid>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <KartePanel data={latestKarte} showCondition={stressAnalysisEnabled} />
              )}
            </Stack>
          </ModalBody>
          <ModalFooter
            gap={3}
            flexWrap="wrap"
            bg="linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))"
            borderTopWidth="1px"
            borderColor="rgba(255, 255, 255, 0.16)"
          >
            {latestRecord?.conversationLog.length ? (
              <Button variant="outline" color="whiteAlpha.900" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160', color: 'white', borderColor: 'whiteAlpha.800' }} onClick={conversationLogDisclosure.onOpen}>
                会話ログを見る
              </Button>
            ) : null}
            {isEditingLatest ? (
              <>
                <PrimaryButton onClick={handleSaveEdit}>
                  変更を保存
                </PrimaryButton>
                <Button variant="outline" color="whiteAlpha.900" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160', color: 'white', borderColor: 'whiteAlpha.800' }} onClick={handleCancelEdit}>
                  編集をキャンセル
                </Button>
              </>
            ) : (
              <Button variant="outline" color="whiteAlpha.900" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160', color: 'white', borderColor: 'whiteAlpha.800' }} onClick={handleStartEdit}>
                最新カルテを編集
              </Button>
            )}
            <Button variant="ghost" color="whiteAlpha.900" _hover={{ bg: 'whiteAlpha.160', color: 'white' }} onClick={karteModalDisclosure.onClose}>閉じる</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={conversationLogDisclosure.isOpen} onClose={conversationLogDisclosure.onClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>保存済み会話ログ</ModalHeader>
          <ModalCloseButton />
          <ModalBody maxH="70dvh" overflowY="auto">
            <Stack spacing={3}>
              {latestRecord?.conversationLog.length ? (
                latestRecord.conversationLog.map((message, index) => (
                  <Flex key={`${message.role}-${index}-${message.content.slice(0, 8)}`} justify={message.role === 'user' ? 'flex-end' : 'flex-start'}>
                    <Box
                      maxW="85%"
                      borderRadius="2xl"
                      borderTopLeftRadius={message.role === 'assistant' ? '0' : '2xl'}
                      borderTopRightRadius={message.role === 'user' ? '0' : '2xl'}
                      px={4}
                      py={3}
                      bg={message.role === 'user' ? 'blue.600' : 'gray.100'}
                      color={message.role === 'user' ? 'white' : 'gray.800'}
                      whiteSpace="pre-wrap"
                      fontSize="sm"
                    >
                      {message.content}
                    </Box>
                  </Flex>
                ))
              ) : (
                <Text fontSize="sm" color="gray.500">保存済みの会話ログはまだありません。</Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={conversationLogDisclosure.onClose}>閉じる</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={surveyModalDisclosure.isOpen} onClose={surveyModalDisclosure.onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ユーザーアンケート</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box as="form" id="survey-form" onSubmit={handleSurveySubmit}>
              <Stack spacing={4}>
                {SURVEY_QUESTIONS.map((question) => (
                  <FormControl key={question.id}>
                    <FormLabel fontSize="sm" fontWeight="semibold">
                      Q{question.index}. {question.label}
                    </FormLabel>
                    <RadioGroup
                      value={surveyAnswers[question.id] ?? ''}
                      onChange={(value) =>
                        setSurveyAnswers((prev) => ({
                          ...prev,
                          [question.id]: value,
                        }))
                      }
                    >
                      <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
                        {question.options.map((option) => (
                          <Radio key={option} value={option}>
                            {option}
                          </Radio>
                        ))}
                      </Stack>
                    </RadioGroup>
                  </FormControl>
                ))}
              </Stack>
            </Box>
          </ModalBody>
          <ModalFooter gap={3} flexWrap="wrap">
            <Button variant="ghost" onClick={surveyModalDisclosure.onClose}>
              閉じる
            </Button>
            <Button variant="outline" onClick={handleEditLastSurvey}>
              前回回答を読み込む
            </Button>
            <PrimaryButton type="submit" form="survey-form">
              送信する
            </PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={resetModalDisclosure.isOpen} onClose={resetModalDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>パスワードの再設定</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="sm" color="gray.600">登録メールアドレスに再設定用リンクを送信します。</Text>
              <FormControl>
                <FormLabel>メールアドレス</FormLabel>
                <Input value={profile.email} isReadOnly />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={resetModalDisclosure.onClose} variant="outline">
              キャンセル
            </Button>
            <PrimaryButton onClick={handleResetPassword}>
              送信する
            </PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={continuousModeDisclosure.isOpen} onClose={continuousModeDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>継続面談の通信方式</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="sm" color="gray.600">
                継続面談では通信方式を選択できます。ターンテイキングモード（Realtime API）は現在未実装です。
              </Text>
              <RadioGroup value={continuousMode} onChange={(value) => setContinuousMode(value as ContinuousMode)}>
                <Stack spacing={3}>
                  <Box borderWidth="1px" borderRadius="md" p={3} borderColor={continuousMode === 'normal' ? 'blue.300' : 'gray.200'}>
                    <Radio value="normal">通常モード (Whisper + GPT-4o + TTS-1)</Radio>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={3} borderColor={continuousMode === 'turn' ? 'purple.300' : 'gray.200'}>
                    <Radio value="turn">ターンテイキングモード (Realtime API想定)</Radio>
                  </Box>
                </Stack>
              </RadioGroup>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={continuousModeDisclosure.onClose}>
              キャンセル
            </Button>
            <PrimaryButton onClick={handleConfirmContinuous}>
              この設定で進む
            </PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={resumeDraftDisclosure.isOpen} onClose={resumeDraftDisclosure.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>未完了の面談があります</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="sm" color="gray.600">
                前回保存した下書きが残っています。続きから再開するか、新規に開始するかを選んでください。
              </Text>
              {pendingStart && (
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <Text fontSize="sm" fontWeight="semibold">
                    {getDraftMetaLabel(pendingStart.meetingType)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    最終保存:
                    {' '}
                    {pendingStart.meetingType === 'initial'
                      ? userState.draftSessions.initial?.updatedAt ?? '未記録'
                      : userState.draftSessions.continuous?.updatedAt ?? '未記録'}
                  </Text>
                </Box>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="outline" onClick={handleStartFresh}>
              新規開始
            </Button>
            <PrimaryButton onClick={handleResumeDraft}>
              続きから再開
            </PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default UserHome;
