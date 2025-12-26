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
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { FiBookOpen, FiClipboard, FiPlayCircle, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

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
  date: string;
  topic: string;
  summary: string;
  statusLabel: string;
};

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

  const karteRecords = useMemo<KarteRecord[]>(
    () => [
      {
        id: 'karte-003',
        date: '2024/11/02',
        topic: '新規事業リード経験の棚卸し',
        summary: '強みの再確認と意思決定の壁の深掘りを実施。',
        statusLabel: '整理済み',
      },
      {
        id: 'karte-002',
        date: '2024/10/18',
        topic: 'キャリア観の再整理',
        summary: '価値観カードを用いて重要指標を優先順位付け。',
        statusLabel: 'フォローアップ推奨',
      },
      {
        id: 'karte-001',
        date: '2024/09/05',
        topic: '初回面談記録',
        summary: '現職課題と求める働き方をヒアリング。',
        statusLabel: '完了',
      },
    ],
    [],
  );

  const accountDisclosure = useDisclosure();
  const karteModalDisclosure = useDisclosure();
  const resetModalDisclosure = useDisclosure();
  const surveyModalDisclosure = useDisclosure();

  const [surveyForm, setSurveyForm] = useState({
    satisfaction: '',
    goalClarity: '',
    feedback: '',
  });

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
    toast({
      title: 'アンケートを送信しました',
      description: '貴重なご意見をありがとうございます。',
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
    setSurveyForm({ satisfaction: '', goalClarity: '', feedback: '' });
    surveyModalDisclosure.onClose();
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
                    <Divider my={4} />
                    <Button colorScheme="purple" variant="solid" onClick={resetModalDisclosure.onOpen}>
                      パスワードをリセット
                    </Button>
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
              {karteRecords.map((record) => (
                <Box
                  key={record.id}
                  border="1px solid"
                  borderColor="gray.100"
                  borderRadius="md"
                  p={4}
                >
                  <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                    <Stack spacing={1}>
                      <Text fontSize="sm" color="gray.500">
                        {record.date}
                      </Text>
                      <Text fontWeight="semibold">{record.topic}</Text>
                    </Stack>
                    <Badge colorScheme="green">{record.statusLabel}</Badge>
                  </Flex>
                  <Text mt={2} color="gray.600">
                    {record.summary}
                  </Text>
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

      <Modal isOpen={surveyModalDisclosure.isOpen} onClose={surveyModalDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ユーザアンケート</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="60dvh">
            <Box
              as="form"
              id="survey-form"
              display="grid"
              gap={4}
              onSubmit={handleSurveySubmit}
            >
              <FormControl>
                <FormLabel>面談満足度</FormLabel>
                <Select
                  placeholder="選択してください"
                  value={surveyForm.satisfaction}
                  onChange={(event) =>
                    setSurveyForm((prev) => ({ ...prev, satisfaction: event.target.value }))
                  }
                >
                  <option value="verySatisfied">とても満足</option>
                  <option value="satisfied">満足</option>
                  <option value="neutral">どちらとも言えない</option>
                  <option value="unsatisfied">やや不満</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>キャリアの方向性は明確になりましたか？</FormLabel>
                <Select
                  placeholder="選択してください"
                  value={surveyForm.goalClarity}
                  onChange={(event) =>
                    setSurveyForm((prev) => ({ ...prev, goalClarity: event.target.value }))
                  }
                >
                  <option value="yes">はい</option>
                  <option value="partial">概ねはい</option>
                  <option value="no">いいえ</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>自由記述</FormLabel>
                <Textarea
                  placeholder="改善してほしい点や良かった点などがあればお書きください。"
                  value={surveyForm.feedback}
                  onChange={(event) =>
                    setSurveyForm((prev) => ({ ...prev, feedback: event.target.value }))
                  }
                />
              </FormControl>
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
