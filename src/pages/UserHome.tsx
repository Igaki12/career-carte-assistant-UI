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
  Select,
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
  company: string;
  title: string;
  department: string;
  status: '面談準備中' | '進行中' | '完了';
  tags: string[];
  email: string;
};

type KarteRecord = {
  id: string;
  atCreated: string;
  atUpdated: string;
  statusLabel: string;
} & Record<KarteKey, string>;

type SurveyQuestion = {
  id: string;
  label: string;
  type: 'menu' | 'likert';
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

const MENU_OPTIONS = ['非常に良い', '良い', '普通', 'やや不満', '不満'];
const LIKERT_OPTIONS = ['強く同意', '同意', 'どちらでもない', '反対', '強く反対'];

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'menu-01',
    label: '面談の全体的な満足度を教えてください。',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-02',
    label: 'AI面談の進行スピードは適切でしたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-03',
    label: '質問内容はあなたの状況に合っていましたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-04',
    label: 'カルテ要約の内容に納得感はありましたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-05',
    label: '進捗バッジやモーダルの見やすさはいかがでしたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-06',
    label: '音声入力の使いやすさについて評価してください。',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-07',
    label: 'AIの返答は理解しやすかったですか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-08',
    label: '自己理解の深まりに役立つ内容でしたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-09',
    label: 'キャリアの方向性が整理できたと感じましたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-10',
    label: '次回も同じ形式で面談したいですか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-11',
    label: 'アプリ全体のデザインに満足していますか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-12',
    label: '操作の迷いは少なくスムーズでしたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-13',
    label: '面談準備の導線は分かりやすかったですか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-14',
    label: '質問数のボリュームは適切だと感じましたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'menu-15',
    label: 'プライバシー面の安心感はいかがでしたか？',
    type: 'menu',
    options: MENU_OPTIONS,
  },
  {
    id: 'likert-01',
    label: 'AIの提案は自分の価値観に沿っていると感じた。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-02',
    label: '面談を通じて新しい気づきが得られた。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-03',
    label: '質問の順序や流れは自然だった。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-04',
    label: 'チャットUIは使いやすいと感じた。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-05',
    label: 'カルテの内容は具体的で分かりやすい。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-06',
    label: 'VRMの表情や動きが面談の体験を高めた。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-07',
    label: '面談で話した内容が十分に整理されている。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-08',
    label: '面談の結果を行動に移せそうだ。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-09',
    label: 'サポート情報や案内は十分だった。',
    type: 'likert',
    options: LIKERT_OPTIONS,
  },
  {
    id: 'likert-10',
    label: '全体として期待に応える面談体験だった。',
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
      company: 'Career Carte Inc.',
      title: 'Product Manager',
      department: 'DXソリューション本部',
      status: '面談準備中',
      tags: ['転機を検討', '海外志向', 'AI x HR'],
      email: 'hanako.yamada@example.com',
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
    score: 82,
    submittedAt: '2024/11/20',
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
                <Text color="gray.600">{profile.company} / {profile.department}</Text>
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
                          会社 / 部署
                        </Text>
                        <Text fontWeight="semibold">
                          {profile.company} / {profile.department}
                        </Text>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">
                          役職
                        </Text>
                        <Text fontWeight="semibold">{profile.title}</Text>
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
                    {lastSurveyResult.score}点 / 100点
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    回答日: {lastSurveyResult.submittedAt}
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
              {SURVEY_QUESTIONS.map((question, index) => (
                <FormControl key={question.id}>
                  <FormLabel>
                    {index + 1}. {question.label}
                  </FormLabel>
                  {question.type === 'menu' ? (
                    <Select
                      value={surveyAnswers[question.id] ?? ''}
                      onChange={(event) =>
                        setSurveyAnswers((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                      }
                    >
                      {question.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  ) : (
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
                  )}
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
