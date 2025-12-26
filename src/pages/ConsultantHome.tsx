import {
  Badge,
  Box,
  Button,
  Collapse,
  Container,
  Divider,
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
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { FiCpu, FiMail, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { KARTE_KEYS } from '../types';
import type { KarteData, KarteKey } from '../types';

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
} & Record<KarteKey, string>;

const LABELS: Record<KarteKey, string> = {
  A: 'A. 主訴 (いま困っていること)',
  B: 'B. キャリア歴 (経験・転機)',
  C: 'C. 現在の業務状況',
  D: 'D. キャリア観・価値観',
  E: 'E. 将来イメージ (3~5年後)',
  F: 'F. 学び・成長ニーズ',
  G: 'G. 面談で話したいテーマ',
};

function ConsultantHome() {
  const toast = useToast();

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

  const [userKarteRecords, setUserKarteRecords] = useState<Record<string, KarteRecord[]>>(() => ({
    'USR-2024-021': [
      {
        id: 'karte-003',
        atCreated: '2024/11/02',
        atUpdated: '2024/11/12',
        statusLabel: '作成済み',
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
    ],
    'USR-2024-019': [
      {
        id: 'karte-014',
        atCreated: '2024/10/28',
        atUpdated: '2024/11/01',
        statusLabel: '作成済み',
        A: '次期リーダー育成計画を具体化したい',
        B: 'SaaS開発PMからマネージャーへ昇格',
        C: 'チーム拡大に伴い育成負荷が増加',
        D: '組織成長と個人の挑戦の両立を重視',
        E: '3年後に事業部長クラスを目指す',
        F: '人材育成・評価設計の知見を深めたい',
        G: '育成ロードマップの作り方を相談したい',
      },
      {
        id: 'karte-013',
        atCreated: '2024/09/30',
        atUpdated: '2024/09/30',
        statusLabel: '作成済み',
        A: 'マネジメントに不安がある',
        B: 'EMとしての立ち上げ経験あり',
        C: '採用が追いつかず現場負荷が高い',
        D: 'チームの心理的安全性を大切にしたい',
        E: '組織をスケールできる人材になりたい',
        F: '組織設計のフレームを学びたい',
        G: '評価制度の改善ポイントを知りたい',
      },
    ],
    'USR-2024-016': [
      {
        id: 'karte-021',
        atCreated: '2024/10/12',
        atUpdated: '2024/10/20',
        statusLabel: '作成済み',
        A: '海外転職に向けた準備項目を整理したい',
        B: 'AI研究職5年、国際学会発表経験あり',
        C: '研究と実装のバランスに課題',
        D: '挑戦的な研究環境と生活基盤の両立',
        E: '3〜5年後に海外のR&Dチームへ参画',
        F: '英語面接・ポートフォリオ強化',
        G: '移住とキャリアの優先順位を整理したい',
      },
      {
        id: 'karte-020',
        atCreated: '2024/09/15',
        atUpdated: '2024/09/15',
        statusLabel: '作成途中',
        A: '将来像の具体化に迷いがある',
        B: '研究職とプロダクト開発の両方を経験',
        C: '研究成果の事業化が進みにくい',
        D: '社会実装へのインパクトを重視',
        E: '研究と事業の架け橋になる役割を目指す',
        F: 'ビジネス視点での成果発信を学びたい',
        G: '転職先の選定基準を整理したい',
      },
    ],
  }));

  const accountDisclosure = useDisclosure();
  const userListDisclosure = useDisclosure();
  const resetModalDisclosure = useDisclosure();
  const karteModalDisclosure = useDisclosure();
  const inquiryModalDisclosure = useDisclosure();

  const [selectedUser, setSelectedUser] = useState<AssignedUser | null>(null);
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
  const [inquiryForm, setInquiryForm] = useState({
    target: '',
    subject: '',
    message: '',
  });

  const handleOpenKarte = (user: AssignedUser) => {
    setSelectedUser(user);
    karteModalDisclosure.onOpen();
  };

  const selectedKarteRecords = selectedUser ? userKarteRecords[selectedUser.id] ?? [] : [];

  useEffect(() => {
    if (!karteModalDisclosure.isOpen || !selectedUser) {
      return;
    }
    const latestRecord = userKarteRecords[selectedUser.id]?.[0];
    if (!latestRecord) {
      return;
    }
    setIsEditingLatest(false);
    const nextDraft = KARTE_KEYS.reduce<KarteData>((acc, key) => {
      acc[key] = latestRecord[key];
      return acc;
    }, {} as KarteData);
    setLatestDraft(nextDraft);
  }, [karteModalDisclosure.isOpen, selectedUser, userKarteRecords]);

  const handleStartEdit = () => {
    const latestRecord = selectedKarteRecords[0];
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
    const latestRecord = selectedKarteRecords[0];
    if (!latestRecord || !selectedUser) {
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
      statusLabel: '編集済み',
      atUpdated: formattedDate,
      ...KARTE_KEYS.reduce<Record<KarteKey, string>>((acc, key) => {
        acc[key] = latestDraft[key] ?? '';
        return acc;
      }, {} as Record<KarteKey, string>),
    };
    setUserKarteRecords((prev) => ({
      ...prev,
      [selectedUser.id]: [nextRecord, ...selectedKarteRecords.slice(1)],
    }));
    setIsEditingLatest(false);
    toast({
      title: 'カルテを更新しました',
      description: `${selectedUser.name} さんの記録を保存（ダミー）`,
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
  };

  const handleCancelEdit = () => {
    setIsEditingLatest(false);
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

  const handleInquirySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: '問い合わせ送信',
      description: '管理者へメッセージを送信しました（ダミー）。',
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
    setInquiryForm({ target: '', subject: '', message: '' });
    inquiryModalDisclosure.onClose();
  };

  const handleTrainingClick = () => {
    toast({
      title: '練習面談モード',
      description: '機能準備中です。公開までお待ちください。',
      status: 'info',
      duration: 2400,
      isClosable: true,
    });
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
                <Heading size="lg">{profile.name} さんのコンサルタント画面</Heading>
                <Text color="gray.600">{profile.company}</Text>
                <Text color="gray.500">ID: {profile.id} / Role: {profile.role}</Text>
              </Stack>
              <Stack align="flex-start" spacing={2}>
                <Badge colorScheme="green" borderRadius="md" px={3} py={1}>
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
                  <FiUsers /> 対象ユーザカルテ閲覧・修正
                </Heading>
                <Text color="gray.600">担当ユーザーのカルテを確認し、最新カルテを編集できます。</Text>
                <Button variant="outline" onClick={userListDisclosure.onToggle}>
                  {userListDisclosure.isOpen ? '担当ユーザーを閉じる' : '担当ユーザーを表示'}
                </Button>
                <Collapse in={userListDisclosure.isOpen} animateOpacity>
                  <Stack pt={4} spacing={4}>
                    {assignedUsers.map((user) => (
                      <Box
                        key={user.id}
                        border="1px solid"
                        borderColor="gray.100"
                        borderRadius="md"
                        p={4}
                      >
                        <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
                          <Stack spacing={1}>
                            <Text fontWeight="semibold">{user.name}</Text>
                            <Text fontSize="sm" color="gray.500">
                              {user.company} / {user.role}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              最終面談: {user.lastSession}
                            </Text>
                            <Text color="gray.600">フォーカス: {user.focus}</Text>
                          </Stack>
                          <Stack spacing={2} align="flex-end">
                            <Badge colorScheme="purple">{user.status}</Badge>
                            <Button size="sm" colorScheme="blue" onClick={() => handleOpenKarte(user)}>
                              カルテを見る
                            </Button>
                          </Stack>
                        </Flex>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiRefreshCw /> コンサルアカウント確認
                </Heading>
                <Text color="gray.600">登録情報の確認とパスワード管理を行います。</Text>
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
                          会社
                        </Text>
                        <Text fontWeight="semibold">{profile.company}</Text>
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
                    <Divider my={4} />
                    <Button colorScheme="purple" onClick={resetModalDisclosure.onOpen}>
                      パスワードをリセット
                    </Button>
                  </Box>
                </Collapse>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiMail /> メール問い合わせ
                </Heading>
                <Text color="gray.600">管理者またはユーザーへの連絡内容を作成します。</Text>
                <Button colorScheme="teal" onClick={inquiryModalDisclosure.onOpen}>
                  問い合わせフォームを開く
                </Button>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiCpu /> クライアントAI練習面談
                </Heading>
                <Text color="gray.600">公開準備中の練習用モードです。更新情報をお待ちください。</Text>
                <Button variant="outline" onClick={handleTrainingClick}>
                  練習面談モード（Coming Soon）
                </Button>
              </Stack>
            </Box>

          </SimpleGrid>
        </Stack>
      </Container>

      <Modal isOpen={karteModalDisclosure.isOpen} onClose={karteModalDisclosure.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedUser ? `${selectedUser.name} さんのカルテ` : 'カルテ'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="60dvh">
            {selectedUser ? (
              <Stack spacing={4}>
                {selectedKarteRecords.length > 0 ? (
                  <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={4}>
                    <Stack spacing={3}>
                      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <Stack spacing={1}>
                          <Text fontSize="sm" color="gray.500">
                            作成日: {selectedKarteRecords[0].atCreated}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            更新日: {selectedKarteRecords[0].atUpdated}
                          </Text>
                        </Stack>
                        <Badge colorScheme="green">{selectedKarteRecords[0].statusLabel}</Badge>
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
                                {selectedKarteRecords[0][key]}
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
                {selectedKarteRecords.slice(1).map((record) => (
                  <Box
                    key={record.id}
                    border="1px solid"
                    borderColor="gray.100"
                    borderRadius="md"
                    p={4}
                    bg="gray.50"
                  >
                    <Stack spacing={1}>
                      <Text fontSize="sm" color="gray.500">
                        作成日: {record.atCreated}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        ステータス: {record.statusLabel}
                      </Text>
                      <Text fontSize="sm" color="gray.700">
                        A. {record.A}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Text color="gray.500">ユーザーが選択されていません。</Text>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={karteModalDisclosure.onClose}>
              閉じる
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

      <Modal isOpen={inquiryModalDisclosure.isOpen} onClose={inquiryModalDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>問い合わせフォーム</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="60dvh">
            <Box as="form" id="inquiry-form" display="grid" gap={4} onSubmit={handleInquirySubmit}>
              <FormControl isRequired>
                <FormLabel>宛先</FormLabel>
                <Select
                  placeholder="選択してください"
                  value={inquiryForm.target}
                  onChange={(event) =>
                    setInquiryForm((prev) => ({ ...prev, target: event.target.value }))
                  }
                >
                  <option value="admin">管理者</option>
                  <option value="user">担当ユーザー</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>件名</FormLabel>
                <Input
                  value={inquiryForm.subject}
                  onChange={(event) =>
                    setInquiryForm((prev) => ({ ...prev, subject: event.target.value }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>メッセージ</FormLabel>
                <Textarea
                  rows={5}
                  value={inquiryForm.message}
                  onChange={(event) =>
                    setInquiryForm((prev) => ({ ...prev, message: event.target.value }))
                  }
                  placeholder="問い合わせ内容を記入してください。"
                />
              </FormControl>
            </Box>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={inquiryModalDisclosure.onClose}>
              キャンセル
            </Button>
            <Button colorScheme="teal" type="submit" form="inquiry-form">
              送信
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default ConsultantHome;
