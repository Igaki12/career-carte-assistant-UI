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
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { type FormEvent, useMemo, useState } from 'react';
import { FiCpu, FiMail, FiRefreshCw, FiUsers } from 'react-icons/fi';
import SurveyRadar from '../components/SurveyRadar';
import { SHIRP_KEYS } from '../types';
import type { KarteData, ShirpKey, SurveyFactorKey } from '../types';

type ConsultantProfile = {
  id: string;
  name: string;
  company: string;
  title: string;
  role: string;
  status: 'アクティブ' | '休止中';
  tags: string[];
  email: string;
};

type AssignedUser = {
  id: string;
  name: string;
  company: string;
  role: string;
  lastSession: string;
  focus: string;
  status: '面談予定' | '確認中' | '完了';
};

type KarteRecord = {
  id: string;
  atCreated: string;
  atUpdated: string;
  statusLabel: string;
  data: KarteData;
};

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

const CONSULTANT_HERO_BACKGROUND = `${import.meta.env.BASE_URL}hero/consultant-home-hero.jpg`;
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

const createEmptyKarte = (): KarteData => ({
  demographics: {
    name: null,
    age: null,
    company: null,
    jobTitle: null,
    workLocationPrefecture: null,
    jobChangeCount: null,
    yearsOfService: null,
    gender: null,
    maritalStatus: null,
    childrenCount: null,
    youngestChildAge: null,
  },
  shirp: {
    S: null,
    H: null,
    I: null,
    R: null,
    P: null,
    '#': null,
  },
  survey: {
    factors: {
      growth_orientation: null,
      problem_solving_orientation: null,
      organization_contribution_orientation: null,
      interpersonal_adaptation_orientation: null,
      emotional_response_tendency: null,
    },
    lastUpdated: null,
  },
  conditionSummary: null,
});

function ConsultantHome() {
  const toast = useToast();
  const profileDisclosure = useDisclosure();
  const emailDisclosure = useDisclosure();
  const karteDisclosure = useDisclosure();
  const heroBackground = CONSULTANT_HERO_BACKGROUND;

  const profile = useMemo<ConsultantProfile>(
    () => ({
      id: 'CNS-401',
      name: '佐藤 陽介',
      company: 'Career Carte Inc.',
      title: 'Lead Career Consultant',
      role: 'Consultant',
      status: 'アクティブ',
      tags: ['Tech領域', 'マネジメント', 'メンタリング'],
      email: 'yosuke.sato@example.com',
    }),
    [],
  );

  const assignedUsers = useMemo<AssignedUser[]>(
    () => [
      {
        id: 'USR-2024-021',
        name: '山田 花子',
        company: 'Career Carte Inc.',
        role: 'Product Manager',
        lastSession: '2024/11/02',
        focus: '新規事業リード経験の棚卸し',
        status: '確認中',
      },
      {
        id: 'USR-2024-019',
        name: '田中 太郎',
        company: 'Connect Systems',
        role: 'Engineering Manager',
        lastSession: '2024/10/28',
        focus: '次期リーダー育成プラン',
        status: '面談予定',
      },
      {
        id: 'USR-2024-016',
        name: '鈴木 未来',
        company: 'Alpha Robotics',
        role: 'AI Researcher',
        lastSession: '2024/10/12',
        focus: '海外転職準備',
        status: '完了',
      },
    ],
    [],
  );

  const [karteRecords, setKarteRecords] = useState<KarteRecord[]>(() => [
    {
      id: 'karte-002',
      atCreated: '2024/11/20',
      atUpdated: '2024/11/30',
      statusLabel: 'コンサル編集済み',
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
          S: '組織の裁量は大きいが、成長機会の減少を感じている。',
          H: '事業開発に関わる仕事を希望。',
          I: '英語でのプレゼンに課題。',
          R: '新規事業立ち上げ経験と社内メンター。',
          P: 'マネジメント研修と英語ピッチ練習を計画。',
          '#': '次回に転職判断軸を深掘り。',
        },
        survey: createEmptyKarte().survey,
        conditionSummary: null,
      },
    },
  ]);

  const [selectedRecord, setSelectedRecord] = useState<KarteRecord | null>(null);
  const [karteDraft, setKarteDraft] = useState<KarteData>(createEmptyKarte());

  const handleOpenKarte = (record: KarteRecord) => {
    setSelectedRecord(record);
    setKarteDraft({ ...record.data, shirp: { ...record.data.shirp } });
    karteDisclosure.onOpen();
  };

  const handleSaveKarte = () => {
    if (!selectedRecord) return;
    const formattedDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const nextRecord = {
      ...selectedRecord,
      statusLabel: 'コンサル編集済み',
      atUpdated: formattedDate,
      data: { ...karteDraft },
    };
    setKarteRecords((prev) => [nextRecord, ...prev.filter((record) => record.id !== selectedRecord.id)]);
    setSelectedRecord(nextRecord);
    toast({
      title: 'カルテを更新しました',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleSendMail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: 'メールを送信しました',
      description: '実際の送信処理はバックエンド連携で実装予定です。',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
    emailDisclosure.onClose();
  };

  return (
    <Box bgGradient="linear(to-br, gray.600, gray.700, gray.800)" height="100dvh" py={{ base: 6, md: 8 }} overflowY="scroll">
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
                <Heading size="lg" color="white">{profile.name} さんのコンサルタント画面</Heading>
                <Text color="whiteAlpha.900">{profile.company} / {profile.title}</Text>
                <Text color="whiteAlpha.800">ID: {profile.id}</Text>
                <Box
                  mt={3}
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                  borderRadius="xl"
                  p={4}
                  bg="blackAlpha.500"
                  backdropFilter="blur(10px)"
                  boxShadow="0 20px 50px rgba(0, 0, 0, 0.18)"
                >
                  <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.900" mb={3}>
                    コンサルタント概要
                  </Text>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                    <Text fontSize="sm" color="whiteAlpha.900">役割: {profile.role}</Text>
                    <Text fontSize="sm" color="whiteAlpha.900">ステータス: {profile.status}</Text>
                    <Text fontSize="sm" color="whiteAlpha.900">担当ユーザー数: {assignedUsers.length} 名</Text>
                    <Text fontSize="sm" color="whiteAlpha.900">メール: {profile.email}</Text>
                  </SimpleGrid>
                </Box>
              </Stack>
              <Stack align="flex-start" spacing={2}>
                <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
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
            <Box bg="white" borderRadius="xl" boxShadow="0 4px 12px rgba(0, 0, 0, 0.05)" p={6} border="1px solid" borderColor="blackAlpha.100">
              <Stack spacing={4}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiUsers /> 担当ユーザー一覧
                </Heading>
                <Stack spacing={3}>
                  {assignedUsers.map((user) => (
                    <Box key={user.id} borderWidth="1px" borderRadius="lg" p={4} borderColor="gray.100">
                      <Stack spacing={1}>
                        <Text fontWeight="semibold">{user.name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {user.company} / {user.role}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          最終面談: {user.lastSession}
                        </Text>
                        <Flex align="center" justify="space-between" gap={3}>
                          <Text fontSize="sm" color="gray.600" flex="1" minW={0}>
                            フォーカス: {user.focus}
                          </Text>
                          <Badge colorScheme={user.status === '完了' ? 'green' : 'purple'} flexShrink={0}>
                            {user.status}
                          </Badge>
                        </Flex>
                        <Button size="sm" variant="outline" onClick={() => handleOpenKarte(karteRecords[0])}>
                          カルテを確認
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="xl" boxShadow="0 4px 12px rgba(0, 0, 0, 0.05)" p={6} border="1px solid" borderColor="blackAlpha.100">
              <Stack spacing={4}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiCpu /> AI練習面談 (ロードマップ)
                </Heading>
                <Text color="gray.600">クライアントAI練習面談機能は準備中です。</Text>
                <Button colorScheme="purple" variant="outline" onClick={() => toast({ title: '準備中です', status: 'info', duration: 2000 })}>
                  準備中
                </Button>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="xl" boxShadow="0 4px 12px rgba(0, 0, 0, 0.05)" p={6} border="1px solid" borderColor="blackAlpha.100">
              <Stack spacing={4}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiMail /> メール問い合わせ
                </Heading>
                <Text color="gray.600">管理者または担当ユーザーへの問い合わせを送信します。</Text>
                <Button variant="outline" onClick={emailDisclosure.onOpen}>
                  メールを作成
                </Button>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="xl" boxShadow="0 4px 12px rgba(0, 0, 0, 0.05)" p={6} border="1px solid" borderColor="blackAlpha.100">
              <Stack spacing={4}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiRefreshCw /> アカウント情報確認
                </Heading>
                <Text color="gray.600">登録内容とパスワードの管理が行えます。</Text>
                <Button variant="outline" onClick={profileDisclosure.onToggle}>
                  {profileDisclosure.isOpen ? '情報を閉じる' : '情報を表示'}
                </Button>
                <Collapse in={profileDisclosure.isOpen} animateOpacity>
                  <Box pt={4}>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">氏名</Text>
                        <Text fontWeight="semibold">{profile.name}</Text>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">会社 / 役職</Text>
                        <Text fontWeight="semibold">{profile.company} / {profile.title}</Text>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Text fontSize="sm" color="gray.500">メール</Text>
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

      <Modal isOpen={karteDisclosure.isOpen} onClose={karteDisclosure.onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>カルテ閲覧・編集</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRecord ? (
              <Stack spacing={4}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                  <Stack spacing={1}>
                    <Text fontSize="sm" color="gray.500">作成日: {selectedRecord.atCreated}</Text>
                    <Text fontSize="sm" color="gray.500">最終更新日: {selectedRecord.atUpdated}</Text>
                  </Stack>
                  <Badge colorScheme="green">{selectedRecord.statusLabel}</Badge>
                </Flex>
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                      <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                        プロフィール
                      </Text>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                    <Text fontSize="sm">氏名: {selectedRecord.data.demographics.name ?? '未入力'}</Text>
                    <Text fontSize="sm">年齢: {selectedRecord.data.demographics.age ?? '未入力'}</Text>
                    <Text fontSize="sm">所属企業: {selectedRecord.data.demographics.company ?? '未入力'}</Text>
                    <Text fontSize="sm">職種: {selectedRecord.data.demographics.jobTitle ?? '未入力'}</Text>
                  </SimpleGrid>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                    ユーザーアンケート結果
                  </Text>
                  {Object.values(selectedRecord.data.survey.factors).some((score) => (score ?? 0) > 0) ? (
                    <SurveyRadar
                      labels={Object.values(SURVEY_LABELS)}
                      values={Object.keys(SURVEY_LABELS).map(
                        (key) => selectedRecord.data.survey.factors[key as keyof KarteData['survey']['factors']] ?? 0,
                      )}
                      size={200}
                    />
                  ) : (
                    <Text fontSize="sm" color="gray.500">未回答</Text>
                  )}
                </Box>
                {SHIRP_KEYS.map((key) => (
                  <Box key={key}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                      {SHIRP_LABELS[key]}
                    </Text>
                    <Text fontSize="xs" color="gray.400" mb={1}>
                      {SHIRP_HINTS[key]}
                    </Text>
                    <Textarea
                      value={karteDraft.shirp[key] ?? ''}
                      onChange={(event) =>
                        setKarteDraft((prev) => ({
                          ...prev,
                          shirp: {
                            ...prev.shirp,
                            [key]: event.target.value,
                          },
                        }))
                      }
                      rows={3}
                      bg="white"
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.500">カルテが選択されていません。</Text>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="outline" onClick={karteDisclosure.onClose}>
              閉じる
            </Button>
            <Button colorScheme="blue" onClick={handleSaveKarte}>
              保存する
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={emailDisclosure.isOpen} onClose={emailDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>メール問い合わせ</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box as="form" id="mail-form" onSubmit={handleSendMail}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel>宛先</FormLabel>
                  <Select defaultValue="admin">
                    <option value="admin">管理者</option>
                    <option value="user">担当ユーザー</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>件名</FormLabel>
                  <Input placeholder="件名を入力" />
                </FormControl>
                <FormControl>
                  <FormLabel>本文</FormLabel>
                  <Textarea rows={4} placeholder="問い合わせ内容を入力" />
                </FormControl>
              </Stack>
            </Box>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="outline" onClick={emailDisclosure.onClose}>
              閉じる
            </Button>
            <Button type="submit" form="mail-form" colorScheme="blue">
              送信
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default ConsultantHome;
