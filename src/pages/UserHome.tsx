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
import { FiBookOpen, FiClipboard, FiPlayCircle, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import userHomeHeroBg1 from '../../userHome-hero-bg1.jpg';
import userHomeHeroBg2 from '../../userHome-hero-bg2.jpg';
import userHomeHeroBg3 from '../../userHome-hero-bg3.jpg';
import SurveyRadar from '../components/SurveyRadar';
import { SHIRP_KEYS } from '../types';
import type { KarteData, ShirpData, ShirpKey, SurveyFactorKey, SurveyResult } from '../types';

const SHIRP_LABELS: Record<ShirpKey, string> = {
  S: 'S. 現状 (Satisfaction/現状)',
  H: 'H. 希望 (Hope/希望)',
  I: 'I. 課題 (Issue/課題)',
  R: 'R. 資源 (Resource/資源)',
  P: 'P. プラン (Plan/プラン)',
  '#': '# その他 (自由記述)',
};

const SHIRP_HINTS: Record<ShirpKey, string> = {
  S: '組織適応 / 自身への評価 / 良好な人間関係 / #そのほかの現状',
  H: '希望する収入 / 希望する仕事内容 / 希望する勤務形態 / #そのほかの希望',
  I: 'スキルの課題 / 健康上の課題 / 年齢の課題 / 家庭の課題 / #そのほかの課題',
  R: '強みとなる資格 / 強みとなる経験 / 強みとなる協力者 / 強みとなる時間や資金 / #そのほかの強み',
  P: 'S〜Rの情報を元に、AIが解決に向けたプランを生成する',
  '#': 'S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄',
};

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

const USER_HOME_HERO_BACKGROUNDS = [userHomeHeroBg1, userHomeHeroBg2, userHomeHeroBg3];
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

type SurveyQuestion = {
  id: string;
  index: number;
  label: string;
  type: 'likert';
  options: string[];
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

type Profile = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  age: string;
  workLocationPrefecture: string;
  jobChangeCount: string;
  yearsOfService: string;
  gender: string;
  maritalStatus: string;
  childrenCount: string;
  youngestChildAge: string;
  status: '面談準備中' | '進行中' | '完了';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  logs: number;
  initialInterviewLimit: number;
  initialInterviewRemaining: number;
  continuousInterviewLimit: number;
  continuousInterviewRemaining: number;
  llmCallsPerInterview: number;
};

type KarteRecord = {
  id: string;
  atCreated: string;
  atUpdated: string;
  statusLabel: string;
  data: KarteData;
};

const createEmptySurvey = (): SurveyResult => ({
  factors: {
    growth_orientation: null,
    problem_solving_orientation: null,
    organization_contribution_orientation: null,
    interpersonal_adaptation_orientation: null,
    emotional_response_tendency: null,
  },
  lastUpdated: null,
});

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

function UserHome() {
  const toast = useToast();
  const navigate = useNavigate();
  const accountDisclosure = useDisclosure();
  const karteModalDisclosure = useDisclosure();
  const resetModalDisclosure = useDisclosure();
  const surveyModalDisclosure = useDisclosure();
  const continuousModeDisclosure = useDisclosure();

  const [continuousMode, setContinuousMode] = useState<'normal' | 'turn'>('normal');
  const [isEditingLatest, setIsEditingLatest] = useState(false);
  const [heroBackground] = useState(
    () => USER_HOME_HERO_BACKGROUNDS[Math.floor(Math.random() * USER_HOME_HERO_BACKGROUNDS.length)] ?? userHomeHeroBg1,
  );
  const [latestDraft, setLatestDraft] = useState<ShirpData>({
    S: '',
    H: '',
    I: '',
    R: '',
    P: '',
    '#': '',
  });

  const profile = useMemo<Profile>(
    () => ({
      id: 'USR-2024-021',
      name: '山田 花子',
      email: 'hanako.yamada@example.com',
      company: 'Career Carte Inc.',
      role: 'Product Manager',
      age: '32',
      workLocationPrefecture: '東京都',
      jobChangeCount: '2',
      yearsOfService: '4',
      gender: '女性',
      maritalStatus: '既婚',
      childrenCount: '1',
      youngestChildAge: '4',
      status: '面談準備中',
      tags: ['Tech領域', '人材開発', 'PM'],
      createdAt: '2024-09-05 10:20',
      updatedAt: '2024-11-30 14:02',
      logs: 23,
      initialInterviewLimit: 1,
      initialInterviewRemaining: 1,
      continuousInterviewLimit: 4,
      continuousInterviewRemaining: 2,
      llmCallsPerInterview: 3,
    }),
    [],
  );

  const [karteRecords, setKarteRecords] = useState<KarteRecord[]>(() => [
    {
      id: 'karte-002',
      atCreated: '2024/11/20',
      atUpdated: '2024/11/30',
      statusLabel: 'ユーザー編集済み',
      data: {
        demographics: {
          name: '山田 花子',
          age: '32',
          company: 'Career Carte Inc.',
          jobTitle: 'Product Manager',
          workLocationPrefecture: '東京都',
          jobChangeCount: '2',
          yearsOfService: '4',
          gender: '女性',
          maritalStatus: '既婚',
          childrenCount: '1',
          youngestChildAge: '4',
        },
        shirp: {
          S: '組織の裁量は大きいが、成長機会の減少を感じている。チームとは良好な関係。',
          H: '年収は現状維持以上。事業開発に関わる仕事と柔軟な働き方を希望。',
          I: 'マネジメント経験が浅く、英語でのプレゼンに課題。',
          R: '新規事業の立ち上げ経験、社内メンターの存在、学習時間の確保。',
          P: '半年以内にマネジメント研修へ参加し、英語ピッチ練習を週1回継続する。',
          '#': '次回は転職検討の判断軸を深掘りしたい。',
        },
        survey: {
          factors: {
            growth_orientation: 78,
            problem_solving_orientation: 72,
            organization_contribution_orientation: 65,
            interpersonal_adaptation_orientation: 80,
            emotional_response_tendency: 58,
          },
          lastUpdated: '2024/11/10',
        },
      },
    },
    {
      id: 'karte-001',
      atCreated: '2024/09/05',
      atUpdated: '2024/09/05',
      statusLabel: '作成済み',
      data: {
        demographics: {
          name: '山田 花子',
          age: '32',
          company: 'Career Carte Inc.',
          jobTitle: 'Product Manager',
          workLocationPrefecture: '東京都',
          jobChangeCount: '1',
          yearsOfService: '2',
          gender: '女性',
          maritalStatus: '既婚',
          childrenCount: '1',
          youngestChildAge: '2',
        },
        shirp: {
          S: '現職の業務量と成長曲線に不満。',
          H: '3〜5年後に事業責任者を目指す。',
          I: '意思決定の軸が曖昧。',
          R: '営業→PMへの転向経験。',
          P: '次回までにキャリアの優先順位を整理する。',
          '#': '転職の是非を含めた相談をしたい。',
        },
        survey: createEmptySurvey(),
      },
    },
  ]);

  const defaultSurveyAnswers = useMemo(() => {
    return SURVEY_QUESTIONS.reduce<Record<string, string>>((acc, question) => {
      acc[question.id] = question.options[2] ?? '';
      return acc;
    }, {});
  }, []);

  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>(() => defaultSurveyAnswers);
  const [lastSurveyResult, setLastSurveyResult] = useState<SurveyResult>(() => createEmptySurvey());
  const [lastSurveyAnswers, setLastSurveyAnswers] = useState<Record<string, string>>(() => defaultSurveyAnswers);

  const handleStartInitial = () => {
    navigate('/app/initial');
  };

  const handleStartContinuous = () => {
    continuousModeDisclosure.onOpen();
  };

  const handleConfirmContinuous = () => {
    navigate(`/app/continuous?mode=${continuousMode}`);
    continuousModeDisclosure.onClose();
  };

  const handleDownload = (type: 'csv' | 'pdf') => {
    toast({
      title: type === 'csv' ? 'CSVダウンロード' : 'PDFダウンロード',
      description: 'サンプルファイルを準備中です。',
      status: 'info',
      duration: 2400,
      isClosable: true,
    });
  };

  const handleSurveySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const surveyResult = calculateSurveyFactors(surveyAnswers);
    setLastSurveyResult(surveyResult);
    setLastSurveyAnswers(surveyAnswers);
    setKarteRecords((prev) => {
      if (prev.length === 0) return prev;
      const latest = prev[0];
      const updated: KarteRecord = {
        ...latest,
        data: {
          ...latest.data,
          survey: surveyResult,
        },
      };
      return [updated, ...prev.slice(1)];
    });
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

  useEffect(() => {
    if (!karteModalDisclosure.isOpen) {
      return;
    }
    const latestRecord = karteRecords[0];
    if (!latestRecord) {
      return;
    }
    setIsEditingLatest(false);
    setLatestDraft({ ...latestRecord.data.shirp });
  }, [karteModalDisclosure.isOpen, karteRecords]);

  const handleStartEdit = () => {
    const latestRecord = karteRecords[0];
    if (!latestRecord) {
      return;
    }
    setLatestDraft({ ...latestRecord.data.shirp });
    setIsEditingLatest(true);
  };

  const handleSaveEdit = () => {
    const latestRecord = karteRecords[0];
    if (!latestRecord) {
      return;
    }
    const formattedDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const nextRecord: KarteRecord = {
      ...latestRecord,
      statusLabel: 'ユーザー編集済み',
      atUpdated: formattedDate,
      data: {
        ...latestRecord.data,
        shirp: { ...latestRecord.data.shirp, ...latestDraft },
      },
    };
    setKarteRecords((prev) => [nextRecord, ...prev.slice(1)]);
    setIsEditingLatest(false);
  };

  const handleCancelEdit = () => {
    setIsEditingLatest(false);
  };

  const surveyScores = SURVEY_FACTOR_KEYS.map((key) => lastSurveyResult.factors[key] ?? 0);
  const hasSurvey = surveyScores.some((score) => score > 0);

  return (
    <Box bgGradient="linear(to-br, gray.50, gray.100, gray.200)" height="100dvh" py={{ base: 6, md: 8 }} overflowY="scroll">
      <Container maxW="6xl">
        <Stack spacing={10}>
          <Box
            position="relative"
            borderRadius="2xl"
            boxShadow="xl"
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
                <Text color="whiteAlpha.900">{profile.company} / {profile.role}</Text>
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
                  <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.900" mb={2}>
                    プロフィールメモ
                  </Text>
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
                          <Text fontSize="sm" color="whiteAlpha.900">氏名: {profile.name}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">年齢: {profile.age}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">所属企業: {profile.company}</Text>
                          <Text fontSize="sm" color="whiteAlpha.900">職種: {profile.role}</Text>
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
                  {profile.status}
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
            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={4}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiPlayCircle /> 面談スタート
                </Heading>
                <Text color="gray.600">
                  初回面談と継続面談を選択できます。継続面談ではカルテの更新とフィードバックを行います。
                </Text>
                <Stack spacing={3}>
                  <Button colorScheme="blue" size="lg" onClick={handleStartInitial}>
                    初回面談を開始
                  </Button>
                  <Button variant="outline" size="lg" colorScheme="teal" onClick={handleStartContinuous}>
                    継続面談を開始
                  </Button>
                </Stack>
                <SimpleGrid columns={2} spacing={3} w="full">
                  <Box border="1px solid" borderColor="blue.100" bg="blue.50" borderRadius="md" p={2}>
                    <Stack spacing={1}>
                      <Text fontSize="sm" color="blue.800" fontWeight="semibold">
                        初回面談残り回数
                      </Text>
                      <Text fontSize="sm" color="blue.700">
                        {profile.initialInterviewLimit}回（残り{profile.initialInterviewRemaining}回）
                      </Text>
                    </Stack>
                  </Box>
                  <Box border="1px solid" borderColor="teal.100" bg="teal.50" borderRadius="md" p={2}>
                    <Stack spacing={1}>
                      <Text fontSize="sm" color="teal.800" fontWeight="semibold">
                        継続面談残り回数
                      </Text>
                      <Text fontSize="sm" color="teal.700">
                        {profile.continuousInterviewLimit}回（残り{profile.continuousInterviewRemaining}回）
                      </Text>
                    </Stack>
                  </Box>
                </SimpleGrid>
                <Box border="1px solid" borderColor="blue.100" bg="blue.50" borderRadius="md" p={2}>
                  <Stack spacing={1}>
                    <Text fontSize="sm" color="blue.800" fontWeight="semibold">
                      AI利用可能回数
                    </Text>
                    <Text fontSize="sm" color="blue.700">
                      面談あたり{profile.llmCallsPerInterview}回
                    </Text>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiClipboard /> ユーザアンケート
                </Heading>
                <Text color="gray.600">面談体験に関するフィードバックをお聞かせください。</Text>
                <Button variant="solid" size="lg" colorScheme="pink" onClick={surveyModalDisclosure.onOpen}>
                  アンケートを開く
                </Button>
                <Box border="1px solid" borderColor="pink.100" bg="pink.50" borderRadius="md" p={2}>
                  <Stack spacing={2}>
                    <Text fontSize="sm" color="pink.800" fontWeight="semibold">
                      前回アンケートスコア
                    </Text>
                    {hasSurvey ? (
                      <SurveyRadar labels={Object.values(SURVEY_LABELS)} values={surveyScores} size={200} />
                    ) : (
                      <Text fontSize="sm" color="pink.700">
                        --
                      </Text>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiBookOpen /> カルテ確認・出力
                </Heading>
                <Text color="gray.600">過去の面談記録を確認し、必要に応じてダウンロードします。</Text>
                <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
                  <Button onClick={karteModalDisclosure.onOpen} colorScheme="teal" size="md">
                    カルテを開く
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload('csv')}>CSV出力</Button>
                  <Button variant="outline" onClick={() => handleDownload('pdf')}>PDF出力</Button>
                </Stack>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiRefreshCw /> アカウント情報確認
                </Heading>
                <Text color="gray.600">登録内容とパスワードの管理が行えます。</Text>
                <Button variant="outline" onClick={accountDisclosure.onToggle}>
                  {accountDisclosure.isOpen ? '情報を閉じる' : '情報を表示'}
                </Button>
                <Collapse in={accountDisclosure.isOpen} animateOpacity>
                  <Box pt={4}>
                    <Tabs variant="enclosed" size="sm">
                      <TabList>
                        <Tab>基本情報</Tab>
                        <Tab>個人情報詳細</Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel px={0} pt={3}>
                          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">氏名</Text>
                              <Text fontWeight="semibold">{profile.name}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">年齢</Text>
                              <Text fontWeight="semibold">{profile.age}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">所属企業</Text>
                              <Text fontWeight="semibold">{profile.company}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">職種</Text>
                              <Text fontWeight="semibold">{profile.role}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">メール</Text>
                              <Text fontWeight="semibold">{profile.email}</Text>
                            </Stack>
                          </SimpleGrid>
                        </TabPanel>
                        <TabPanel px={0} pt={3}>
                          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">勤務地(都道府県)</Text>
                              <Text fontWeight="semibold">{profile.workLocationPrefecture}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">転職歴(回数)</Text>
                              <Text fontWeight="semibold">{profile.jobChangeCount}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">勤続年数(年)</Text>
                              <Text fontWeight="semibold">{profile.yearsOfService}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">性別</Text>
                              <Text fontWeight="semibold">{profile.gender}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">現在の婚姻関係</Text>
                              <Text fontWeight="semibold">{profile.maritalStatus}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">子供の有無(人)</Text>
                              <Text fontWeight="semibold">{profile.childrenCount}</Text>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Text fontSize="sm" color="gray.500">末子の年齢(歳)</Text>
                              <Text fontWeight="semibold">{profile.youngestChildAge}</Text>
                            </Stack>
                          </SimpleGrid>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                    <Button mt={4} colorScheme="red" variant="outline" onClick={resetModalDisclosure.onOpen}>
                      パスワードを再設定する
                    </Button>
                  </Box>
                </Collapse>
              </Stack>
            </Box>
          </SimpleGrid>
        </Stack>
      </Container>

      <Modal isOpen={karteModalDisclosure.isOpen} onClose={karteModalDisclosure.onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>カルテ確認</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="70dvh">
            <Stack spacing={4}>
              {karteRecords.length > 0 ? (
                <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={4}>
                  <Stack spacing={4}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <Stack spacing={1}>
                        <Text fontSize="sm" color="gray.500">作成日: {karteRecords[0].atCreated}</Text>
                        <Text fontSize="sm" color="gray.500">最終更新日: {karteRecords[0].atUpdated}</Text>
                      </Stack>
                      <Badge colorScheme="green">{karteRecords[0].statusLabel}</Badge>
                    </Flex>
                    <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                      <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                        デモグラフィック
                      </Text>
                      <Tabs variant="enclosed" size="sm">
                        <TabList>
                          <Tab>基本情報</Tab>
                          <Tab>個人情報詳細</Tab>
                        </TabList>
                        <TabPanels>
                          <TabPanel px={0} pt={3}>
                            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                              <Text fontSize="sm">氏名: {karteRecords[0].data.demographics.name ?? '未入力'}</Text>
                              <Text fontSize="sm">年齢: {karteRecords[0].data.demographics.age ?? '未入力'}</Text>
                              <Text fontSize="sm">所属企業: {karteRecords[0].data.demographics.company ?? '未入力'}</Text>
                              <Text fontSize="sm">職種: {karteRecords[0].data.demographics.jobTitle ?? '未入力'}</Text>
                            </SimpleGrid>
                          </TabPanel>
                          <TabPanel px={0} pt={3}>
                            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                              <Text fontSize="sm">勤務地(都道府県): {karteRecords[0].data.demographics.workLocationPrefecture ?? '未入力'}</Text>
                              <Text fontSize="sm">転職歴(回数): {karteRecords[0].data.demographics.jobChangeCount ?? '未入力'}</Text>
                              <Text fontSize="sm">勤続年数(年): {karteRecords[0].data.demographics.yearsOfService ?? '未入力'}</Text>
                              <Text fontSize="sm">性別: {karteRecords[0].data.demographics.gender ?? '未入力'}</Text>
                              <Text fontSize="sm">現在の婚姻関係: {karteRecords[0].data.demographics.maritalStatus ?? '未入力'}</Text>
                              <Text fontSize="sm">子供の有無(人): {karteRecords[0].data.demographics.childrenCount ?? '未入力'}</Text>
                              <Text fontSize="sm">末子の年齢(歳): {karteRecords[0].data.demographics.youngestChildAge ?? '未入力'}</Text>
                            </SimpleGrid>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                      <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                        ユーザーアンケート結果
                      </Text>
                      {Object.values(karteRecords[0].data.survey.factors).some((score) => (score ?? 0) > 0) ? (
                        <SurveyRadar
                          labels={Object.values(SURVEY_LABELS)}
                          values={SURVEY_FACTOR_KEYS.map((key) => karteRecords[0].data.survey.factors[key] ?? 0)}
                          size={200}
                        />
                      ) : (
                        <Text fontSize="sm" color="gray.500">未回答</Text>
                      )}
                    </Box>
                    {isEditingLatest ? (
                      <Stack spacing={3}>
                        {SHIRP_KEYS.map((key) => (
                          <Box key={key}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                              {SHIRP_LABELS[key]}
                            </Text>
                            <Text fontSize="xs" color="gray.400" mb={1}>
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
                              bg="white"
                            />
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Stack spacing={3}>
                        {SHIRP_KEYS.map((key) => (
                          <Box key={key}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                              {SHIRP_LABELS[key]}
                            </Text>
                            <Text fontSize="xs" color="gray.400" mb={1}>
                              {SHIRP_HINTS[key]}
                            </Text>
                            <Box borderWidth="1px" borderRadius="md" p={3} fontSize="sm" bg="gray.50">
                              {karteRecords[0].data.shirp[key] || '未記入'}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                    <Flex gap={3} wrap="wrap">
                      {isEditingLatest ? (
                        <>
                          <Button colorScheme="blue" onClick={handleSaveEdit}>
                            変更を保存
                          </Button>
                          <Button variant="outline" onClick={handleCancelEdit}>
                            編集をキャンセル
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" onClick={handleStartEdit}>
                          最新カルテを編集
                        </Button>
                      )}
                    </Flex>
                  </Stack>
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.500">カルテがまだ作成されていません。</Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={karteModalDisclosure.onClose}>閉じる</Button>
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
            <Button type="submit" form="survey-form" colorScheme="pink">
              送信する
            </Button>
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
            <Button colorScheme="blue" onClick={handleResetPassword}>
              送信する
            </Button>
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
              <RadioGroup value={continuousMode} onChange={(value) => setContinuousMode(value as 'normal' | 'turn')}>
                <Stack spacing={3}>
                  <Box borderWidth="1px" borderRadius="md" p={3} borderColor={continuousMode === 'normal' ? 'blue.300' : 'gray.200'}>
                    <Radio value="normal">通常モード (Whisper + GPT-4o + TTS-1)</Radio>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={3} borderColor={continuousMode === 'turn' ? 'purple.300' : 'gray.200'}>
                    <Flex align="center" justify="space-between" gap={2}>
                      <Radio value="turn">ターンテイキングモード (Realtime API・未実装)</Radio>
                      <Badge colorScheme="purple">課金準備中</Badge>
                    </Flex>
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      無音や発話終了を検知して自然な相槌・割り込みを行います。
                    </Text>
                  </Box>
                </Stack>
              </RadioGroup>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={continuousModeDisclosure.onClose}>
              キャンセル
            </Button>
            <Button colorScheme="teal" onClick={handleConfirmContinuous}>
              継続面談へ進む
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default UserHome;
