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
import { type FormEvent, useMemo, useState } from 'react';
import { FiBell, FiCpu, FiMail, FiRefreshCw, FiUsers } from 'react-icons/fi';

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

type Announcement = {
  id: string;
  title: string;
  message: string;
  date: string;
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

  const announcements = useMemo<Announcement[]>(
    () => [
      {
        id: 'news-202',
        date: '2024/11/30',
        title: 'カルテテンプレートを最新版へ更新しました',
        message: '7スロットの記載例を整理した資料をSlackに共有しています。',
      },
      {
        id: 'news-201',
        date: '2024/11/18',
        title: 'システムメンテナンス予定',
        message: '12/05 0:00〜4:00の間、面談ルームへの接続が不安定になります。',
      },
    ],
    [],
  );

  const accountDisclosure = useDisclosure();
  const newsDisclosure = useDisclosure();
  const userListDisclosure = useDisclosure();
  const resetModalDisclosure = useDisclosure();
  const karteModalDisclosure = useDisclosure();
  const inquiryModalDisclosure = useDisclosure();

  const [selectedUser, setSelectedUser] = useState<AssignedUser | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [inquiryForm, setInquiryForm] = useState({
    target: '',
    subject: '',
    message: '',
  });

  const handleOpenKarte = (user: AssignedUser) => {
    setSelectedUser(user);
    setCommentDraft('');
    karteModalDisclosure.onOpen();
  };

  const handleSaveKarte = () => {
    toast({
      title: 'カルテを更新しました',
      description: selectedUser ? `${selectedUser.name} さんの記録を保存（ダミー）` : '',
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
    karteModalDisclosure.onClose();
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
    <Box bg="gray.50" maxH="100dvh" py={12} overflowY="scroll">
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
                <Text color="gray.600">担当ユーザーのカルテを確認し、コメントを追記できます。</Text>
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

            <Box bg="white" borderRadius="lg" boxShadow="xs" p={6}>
              <Stack spacing={3}>
                <Heading size="md" display="flex" alignItems="center" gap={2}>
                  <FiBell /> ニュース通知
                </Heading>
                <Text color="gray.600">管理者からのお知らせをまとめて確認できます。</Text>
                <Button variant="outline" onClick={newsDisclosure.onToggle}>
                  {newsDisclosure.isOpen ? 'お知らせを閉じる' : 'お知らせを表示'}
                </Button>
                <Collapse in={newsDisclosure.isOpen} animateOpacity>
                  <Stack pt={4} spacing={4}>
                    {announcements.map((news) => (
                      <Box
                        key={news.id}
                        border="1px solid"
                        borderColor="gray.100"
                        borderRadius="md"
                        p={4}
                        bg="gray.50"
                      >
                        <Text fontSize="sm" color="gray.500">
                          {news.date}
                        </Text>
                        <Text fontWeight="semibold" mt={1}>
                          {news.title}
                        </Text>
                        <Text color="gray.600" mt={2}>
                          {news.message}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
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
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    ユーザーID
                  </Text>
                  <Text fontWeight="semibold">{selectedUser.id}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    最新フォーカス
                  </Text>
                  <Text color="gray.700">{selectedUser.focus}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    コメント追記
                  </Text>
                  <Textarea
                    placeholder="ヒアリング内容やメモを追記してください。"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                  />
                </Box>
              </Stack>
            ) : (
              <Text color="gray.500">ユーザーが選択されていません。</Text>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={karteModalDisclosure.onClose}>
              閉じる
            </Button>
            <Button colorScheme="blue" onClick={handleSaveKarte} isDisabled={!selectedUser}>
              更新を保存
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
