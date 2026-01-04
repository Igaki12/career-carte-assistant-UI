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
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiClipboard, FiPlayCircle, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { KARTE_KEYS } from '../types';
import type { KarteData, KarteKey } from '../types';

type Profile = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: '面談準備中' | '進行中' | '完了';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  logs: number;
  monthlyInterviewLimit: number;
  monthlyInterviewRemaining: number;
  llmCallsPerInterview: number;
};

type KarteRecord = {
  id: string;
  atCreated: string;
  atUpdated: string;
  statusLabel: string;
} & Record<KarteKey, string>;

type SurveyQuestion = {
  id: string;
  index: number;
  label: string;
  type: 'likert';
  options: string[];
};

const LABELS: Record<KarteKey, string> = {
  A: 'A. 主訴 (いま困っていること)',
  B: 'B. キャリア歴 (経験・転機)',
  C: 'C. 現在の業務状況',
  D: 'D. キャリア観・価値観',
  E: 'E. 将来イメージ (3~5年後)',
  F: 'F. 学び・成長ニーズ',
  G: 'G. 面談で話したいテーマ',
};

const LIKERT_OPTIONS = ['全くそう思わない', 'そう思わない', 'どちらでもない', 'そう思う', 'とてもそう思う'];

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q6_59',
    index: 1,
    label: '自分のこれからのキャリアにとって環境変化に能動的に対応している',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_42',
    index: 2,
    label: '仕事のために新しいことを色々と勉強している',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_56',
    index: 3,
    label: 'キャリア設計は自分にとって重要な課題である',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_58',
    index: 4,
    label: '自分が望むキャリアを歩むためなら努力を惜しまない',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_55',
    index: 5,
    label: 'これからのキャリアをより充実したものにしたいと強く思う',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_94',
    index: 6,
    label: '新しい仕事があったら積極的にそれをやりたいと願い出る',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_109',
    index: 7,
    label: '新しいことを学ぶ機会は私にとって重要である',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_39',
    index: 8,
    label: '常に仕事上の行動には責任をとっている',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_82',
    index: 9,
    label: '嫌な出来事があった時、その問題を解決するための情報を集める',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_8',
    index: 10,
    label: '問題やミスをすぐに上司に報告している',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_166',
    index: 11,
    label: '自分が何が得意で何が不得手かをわかっている',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_105',
    index: 12,
    label: '私は困難なことを達成できなかった場合、もう一度行う時には前よりも一層熱心に取り組むようにしている',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_207',
    index: 13,
    label: '私の職位にふさわしい言動をするように心がけている',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_9',
    index: 14,
    label: '自身に与えられた役割を受け入れている',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_137',
    index: 15,
    label: '自分のスキルや貢献が今の職場では十分に報酬に反映されていると思う',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_142',
    index: 16,
    label: '今の会社に勤めていることは自分の誇りである',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_140',
    index: 17,
    label: '今の会社には単なる会社以上の思い入れがある',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_23',
    index: 18,
    label: '今の職場で仕事をする中で、私のスキルや個性が評価されている',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_121',
    index: 19,
    label: '今の組織の上司や部下を信頼している',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_24',
    index: 20,
    label: 'この職場では問題点や困難な課題について持ち出すことができる',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_145',
    index: 21,
    label: 'この会社を辞めることは自身に不利益をもたらすと思う',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_189',
    index: 22,
    label: 'でしゃばる人がいても嗜めることができない',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_86',
    index: 23,
    label: '自分の考えや気持ちがよくわからないことが多い',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_6',
    index: 24,
    label: '上司が一から十まで指示しなくても動くことができる',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'q6_18',
    index: 25,
    label: '上司の指示を待って行動している',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
];

function UserHome() {
  const navigate = useNavigate();
  const toast = useToast();

  const profile = useMemo<Profile>(
    () => ({
      id: 'USR-2024-021',
      name: '山田 花子',
      email: 'hanako.yamada@example.com',
      company: 'Career Carte Inc.',
      role: 'Product Manager',
      status: '面談準備中',
      tags: ['転機を検討', '海外志向', 'AI x HR'],
      createdAt: '2024-09-05 10:20',
      updatedAt: '2024-11-30 14:02',
      logs: 23,
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 4,
      llmCallsPerInterview: 3,
    }),
    [],
  );

  const [karteRecords, setKarteRecords] = useState<KarteRecord[]>(() => [
    {
      id: 'karte-003',
      atCreated: '2024/11/02',
      atUpdated: '2024/11/12',
      statusLabel: 'ユーザー編集済み',
      A: '新規事業の意思決定で迷いが続いている',
      B: '0→1フェーズのPM経験、海外プロジェクト参画歴',
      C: '複数案件の兼務で優先順位が揺らぎやすい',
      D: '挑戦機会と裁量の大きさを重視',
      E: '3年以内に新規事業責任者を担いたい',
      F: '事業計画・ファイナンスの知識を強化したい',
      G: '意思決定の軸づくりを面談で整理したい',
    },
    {
      id: 'karte-002',
      atCreated: '2024/10/18',
      atUpdated: '2024/10/18',
      statusLabel: '作成途中',
      A: 'キャリアの方向性が定まらない',
      B: 'PM/CS/新規事業を経験',
      C: '現職は裁量があるが成長機会が減少',
      D: '学習機会と組織カルチャーを重視',
      E: '事業立ち上げに関わり続けたい',
      F: 'マネジメントスキルを身につけたい',
      G: '次の転機の判断材料を整理したい',
    },
    {
      id: 'karte-001',
      atCreated: '2024/09/05',
      atUpdated: '2024/09/05',
      statusLabel: '作成済み',
      A: '現職の業務量と成長曲線に不満',
      B: '営業→PMへの転向経験あり',
      C: '裁量はあるが短期タスク中心',
      D: '長期視点で価値を作る仕事がしたい',
      E: '3〜5年後に事業責任者を目指す',
      F: 'プロダクト戦略の体系化を学びたい',
      G: '転職の是非を含めた相談をしたい',
    },
  ]);

  const accountDisclosure = useDisclosure();
  const karteModalDisclosure = useDisclosure();
  const resetModalDisclosure = useDisclosure();
  const surveyModalDisclosure = useDisclosure();
  const [isEditingLatest, setIsEditingLatest] = useState(false);
  const [latestDraft, setLatestDraft] = useState<KarteData>({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
    F: '',
    G: '',
  });

  const defaultSurveyAnswers = useMemo(() => {
    return SURVEY_QUESTIONS.reduce<Record<string, string>>((acc, question) => {
      acc[question.id] = question.options[2] ?? '';
      return acc;
    }, {});
  }, []);

  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>(
    () => defaultSurveyAnswers,
  );
  const [lastSurveyResult, setLastSurveyResult] = useState(() => ({
    score: null as number | null,
    submittedAt: '',
    answers: defaultSurveyAnswers,
  }));

  const handleStartInterview = () => {
    navigate('/app');
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
    const totalScore = SURVEY_QUESTIONS.reduce((sum, question) => {
      const selected = surveyAnswers[question.id];
      const index = question.options.indexOf(selected);
      return sum + (index >= 0 ? index : 0);
    }, 0);
    const maxScore = SURVEY_QUESTIONS.length * 4;
    const computedScore = Math.round((totalScore / maxScore) * 100);

    setLastSurveyResult({
      score: computedScore,
      submittedAt: new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      answers: surveyAnswers,
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
    setSurveyAnswers(lastSurveyResult.answers);
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
    const nextDraft = KARTE_KEYS.reduce<KarteData>((acc, key) => {
      acc[key] = latestRecord[key];
      return acc;
    }, {} as KarteData);
    setLatestDraft(nextDraft);
  }, [karteModalDisclosure.isOpen, karteRecords]);

  const handleStartEdit = () => {
    const latestRecord = karteRecords[0];
    if (!latestRecord) {
      return;
    }
    const nextDraft = KARTE_KEYS.reduce<KarteData>((acc, key) => {
      acc[key] = latestRecord[key];
      return acc;
    }, {} as KarteData);
    setLatestDraft(nextDraft);
    setIsEditingLatest(true);
  };

  const handleSaveLatest = () => {
    const latestRecord = karteRecords[0];
    if (!latestRecord) {
      return;
    }
    const updatedAt = new Date();
    const formattedDate = updatedAt.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const nextRecord: KarteRecord = {
      ...latestRecord,
      statusLabel: 'ユーザー編集済み',
      atUpdated: formattedDate,
      ...KARTE_KEYS.reduce<Record<KarteKey, string>>((acc, key) => {
        acc[key] = latestDraft[key] ?? '';
        return acc;
      }, {} as Record<KarteKey, string>),
    };
    setKarteRecords((prev) => [nextRecord, ...prev.slice(1)]);
    setIsEditingLatest(false);
  };

  const handleCancelEdit = () => {
    setIsEditingLatest(false);
  };

  return (
    <Box bg="gray.50" height="100dvh" py={12} overflowY="scroll">
      <Container maxW="6xl">
        <Stack spacing={10}>
          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            px={{ base: 6, md: 10 }}
            py={{ base: 6, md: 8 }}
          >
            <Flex direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }} gap={6}>
              <Stack spacing={1} flex="1">
                <Heading size="lg">{profile.name} さんのマイページ</Heading>
                <Text color="gray.600">{profile.company} / {profile.role}</Text>
                <Text color="gray.500">ID: {profile.id}</Text>
              </Stack>
              <Stack align="flex-start" spacing={2}>
                <Badge colorScheme="purple" borderRadius="md" px={3} py={1}>
                  {profile.status}
                </Badge>
                <Flex wrap="wrap" gap={2}>
                  {profile.tags.map((tag) => (
                    <Badge key={tag} colorScheme="gray" variant="subtle">
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              </Stack>
            </Flex>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiPlayCircle /> AI面談スタート
                </Heading>
                <Text color="gray.600">
                  AI面談に進みます。準備できたらボタンを押してください。
                </Text>
                <Button colorScheme="blue" size="lg" onClick={handleStartInterview}>
                  面談ルームへ進む
                </Button>
                <SimpleGrid columns={2} spacing={3} w="full">
                  <Box border="1px solid" borderColor="blue.100" bg="blue.50" borderRadius="md" p={2}>
                    <Stack spacing={1}>
                      <Text fontSize="sm" color="blue.800" fontWeight="semibold">
                        月間面談可能回数
                      </Text>
                      <Text fontSize="sm" color="blue.700">
                        {profile.monthlyInterviewLimit}回（残り{profile.monthlyInterviewRemaining}回）
                      </Text>
                    </Stack>
                  </Box>
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
                </SimpleGrid>
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
                  <Stack spacing={1}>
                    <Text fontSize="sm" color="pink.800" fontWeight="semibold">
                      前回アンケートスコア
                    </Text>
                    <Text fontSize="sm" color="pink.700">
                      {lastSurveyResult.score === null ? '--点 / 100点' : `${lastSurveyResult.score}点 / 100点`}
                    </Text>
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
                <Button onClick={karteModalDisclosure.onOpen} colorScheme="teal" size="md">
                  カルテを開く
                </Button>
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
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">
                          氏名
                        </Text>
                        <Text fontWeight="semibold">{profile.name}</Text>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">
                          会社 / 役職
                        </Text>
                        <Text fontWeight="semibold">
                          {profile.company} / {profile.role}
                        </Text>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">
                          役職
                        </Text>
                        <Text fontWeight="semibold">{profile.role}</Text>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">
                          メール
                        </Text>
                        <Text fontWeight="semibold">{profile.email}</Text>
                      </Stack>
                    </SimpleGrid>
                  </Box>
                </Collapse>
              </Stack>
            </Box>
          </SimpleGrid>
        </Stack>
      </Container>

      <Modal isOpen={karteModalDisclosure.isOpen} onClose={karteModalDisclosure.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>カルテ確認</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="60dvh">
            <Stack spacing={4}>
              {karteRecords.length > 0 ? (
                <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={4}>
                  <Stack spacing={3}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <Stack spacing={1}>
                        <Text fontSize="sm" color="gray.500">
                          作成日: {karteRecords[0].atCreated}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          最終更新日: {karteRecords[0].atUpdated}
                        </Text>
                      </Stack>
                      <Badge colorScheme="green">{karteRecords[0].statusLabel}</Badge>
                    </Flex>
                    <Stack spacing={3}>
                      {KARTE_KEYS.map((key) => (
                        <Box key={key}>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                            {LABELS[key]}
                          </Text>
                          {isEditingLatest ? (
                            <Textarea
                              value={latestDraft[key] ?? ''}
                              onChange={(event) =>
                                setLatestDraft((prev) => ({
                                  ...prev,
                                  [key]: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            <Text color="gray.700" fontSize="sm">
                              {karteRecords[0][key]}
                            </Text>
                          )}
                        </Box>
                      ))}
                    </Stack>
                    <Flex justify="flex-end" gap={2}>
                      {isEditingLatest ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            キャンセル
                          </Button>
                          <Button size="sm" colorScheme="blue" onClick={handleSaveLatest}>
                            変更を保存
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" colorScheme="blue" onClick={handleStartEdit}>
                          カルテを編集する
                        </Button>
                      )}
                    </Flex>
                  </Stack>
                </Box>
              ) : (
                <Text color="gray.500">カルテがありません。</Text>
              )}
              {karteRecords.slice(1).map((record) => (
                <Box
                  key={record.id}
                  border="1px solid"
                  borderColor="gray.100"
                  borderRadius="md"
                  p={4}
                  bg="gray.50"
                >
                  <Stack spacing={1}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <Text fontSize="sm" color="gray.500">
                        作成日: {record.atCreated}
                      </Text>
                      <Badge colorScheme="green">{record.statusLabel}</Badge>
                    </Flex>
                    <Text fontSize="sm" color="gray.700">
                      A. {record.A}
                    </Text>
                  </Stack>

                </Box>
              ))}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="outline" onClick={() => handleDownload('csv')}>
              CSVで出力
            </Button>
            <Button colorScheme="teal" onClick={() => handleDownload('pdf')}>
              PDFで出力
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={surveyModalDisclosure.isOpen} onClose={surveyModalDisclosure.onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ユーザアンケート</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" height="70dvh">
            <Stack spacing={4} mb={6}>
              <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={4}>
                <Stack spacing={2}>
                  <Text fontSize="sm" color="gray.500">
                    前回アンケートスコア
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold">
                    {lastSurveyResult.score === null ? '--点 / 100点' : `${lastSurveyResult.score}点 / 100点`}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    回答日: {lastSurveyResult.submittedAt || '未回答'}
                  </Text>
                  <Button size="sm" variant="outline" alignSelf="flex-start" onClick={handleEditLastSurvey}>
                    前回回答を編集する
                  </Button>
                </Stack>
              </Box>
            </Stack>
            <Box
              as="form"
              id="survey-form"
              display="grid"
              gap={4}
              onSubmit={handleSurveySubmit}
            >
              {SURVEY_QUESTIONS.map((question) => (
                <FormControl key={question.id}>
                  <FormLabel>
                    {question.index}. {question.label}
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
                    <SimpleGrid columns={{ base: 2, md: 5 }} spacing={2}>
                      {question.options.map((option) => (
                        <Radio key={option} value={option}>
                          {option}
                        </Radio>
                      ))}
                    </SimpleGrid>
                  </RadioGroup>
                </FormControl>
              ))}
            </Box>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={surveyModalDisclosure.onClose}>
              キャンセル
            </Button>
            <Button type="submit" form="survey-form" colorScheme="pink">
              アンケートを送信
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={resetModalDisclosure.isOpen} onClose={resetModalDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>パスワードをリセット</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="40dvh">
            <Text color="gray.600" mb={4}>
              登録メールアドレス宛にリセットリンクを送信します。
            </Text>
            <FormControl>
              <FormLabel>メールアドレス</FormLabel>
              <Input type="email" value={profile.email} readOnly />
            </FormControl>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={resetModalDisclosure.onClose}>
              キャンセル
            </Button>
            <Button colorScheme="purple" onClick={handleResetPassword}>
              リンクを送信
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default UserHome;
