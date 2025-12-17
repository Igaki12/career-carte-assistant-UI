import { ChevronDownIcon } from '@chakra-ui/icons';
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
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { FiFileText, FiPlus, FiUpload, FiZap } from 'react-icons/fi';

type AccountRecord = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  logs: number;
};

type SortState = {
  column: keyof AccountRecord;
  direction: 'asc' | 'desc';
};

type CsvPreviewRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type CsvState = {
  fileName: string;
  preview: CsvPreviewRecord[];
};

type TierId = 'tier1' | 'tier2' | 'tier3' | 'free';

type LlmTier = {
  id: TierId;
  label: string;
  description: string;
  plan: string;
  model: string;
  usage: number;
  limit: number;
  notes: string;
};

const initialLlmTiers: LlmTier[] = [
  {
    id: 'tier1',
    label: 'Tier 1',
    description: '役員・経営層向けハイタッチ支援',
    plan: 'Enterprise Tier 1',
    model: 'gpt-4o',
    usage: 188,
    limit: 400,
    notes: '戦略レビューとカルテ生成を優先配分。',
  },
  {
    id: 'tier2',
    label: 'Tier 2',
    description: 'ミドルマネジメント向けコーチング',
    plan: 'Enterprise Tier 2',
    model: 'gpt-4o-mini',
    usage: 120,
    limit: 300,
    notes: '自由対話モード＋カルテ整理で共通利用。',
  },
  {
    id: 'tier3',
    label: 'Tier 3',
    description: '若手社員向け定期面談プラン',
    plan: 'Business Tier',
    model: 'gpt-4o-mini',
    usage: 86,
    limit: 200,
    notes: '必要に応じてTier2への昇格を推奨。',
  },
  {
    id: 'free',
    label: 'Free',
    description: '評価版アカウント',
    plan: 'Free Trial',
    model: 'gpt-4o-mini',
    usage: 24,
    limit: 60,
    notes: '体験版のため1ユーザーあたり月2回を上限。',
  },
];

function Admin() {
  const toast = useToast();
  const csvModalDisclosure = useDisclosure();
  const userAddDisclosure = useDisclosure();
  const consultantAddDisclosure = useDisclosure();

  const [userAccounts, setUserAccounts] = useState<AccountRecord[]>([
    {
      id: 'USR-2024-021',
      name: '山田 花子',
      email: 'hanako.yamada@example.com',
      company: 'Career Carte Inc.',
      role: 'Product Manager',
      status: '面談準備中',
      createdAt: '2024-09-05 10:20',
      updatedAt: '2024-11-30 14:02',
      logs: 23,
    },
    {
      id: 'USR-2024-019',
      name: '田中 太郎',
      email: 'taro.tanaka@example.com',
      company: 'Connect Systems',
      role: 'Engineering Manager',
      status: '進行中',
      createdAt: '2024-08-12 09:50',
      updatedAt: '2024-11-18 16:35',
      logs: 17,
    },
    {
      id: 'USR-2024-016',
      name: '鈴木 未来',
      email: 'mirai.suzuki@example.com',
      company: 'Alpha Robotics',
      role: 'AI Researcher',
      status: '完了',
      createdAt: '2024-07-25 11:05',
      updatedAt: '2024-10-28 13:12',
      logs: 29,
    },
  ]);

  const [consultantAccounts, setConsultantAccounts] = useState<AccountRecord[]>([
    {
      id: 'CNS-400',
      name: '佐藤 陽介',
      email: 'yosuke.sato@example.com',
      company: 'Career Carte Inc.',
      role: 'Lead Career Consultant',
      status: 'アクティブ',
      createdAt: '2024-05-10 08:45',
      updatedAt: '2024-11-28 17:25',
      logs: 61,
    },
    {
      id: 'CNS-398',
      name: '井上 彩',
      email: 'aya.inoue@example.com',
      company: 'Career Carte Inc.',
      role: 'Senior Consultant',
      status: 'アクティブ',
      createdAt: '2024-06-02 11:30',
      updatedAt: '2024-11-15 12:05',
      logs: 48,
    },
    {
      id: 'CNS-395',
      name: '木村 隼人',
      email: 'hayato.kimura@example.com',
      company: 'Career Carte Inc.',
      role: 'Consultant',
      status: '休止中',
      createdAt: '2024-04-22 14:20',
      updatedAt: '2024-09-01 09:15',
      logs: 12,
    },
  ]);

  const [userQuery, setUserQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSort, setUserSort] = useState<SortState>({ column: 'updatedAt', direction: 'desc' });

  const [consultantQuery, setConsultantQuery] = useState('');
  const [consultantStatusFilter, setConsultantStatusFilter] = useState('all');
  const [consultantSort, setConsultantSort] = useState<SortState>({
    column: 'updatedAt',
    direction: 'desc',
  });

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    status: '面談準備中',
  });

  const [newConsultantForm, setNewConsultantForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    status: 'アクティブ',
  });

  const [userCsvState, setUserCsvState] = useState<CsvState>({
    fileName: 'user_accounts.csv',
    preview: [
      { id: 'USR-2024-030', name: '高橋 洋介', email: 'y.takahashi@example.com', role: 'Marketing' },
      { id: 'USR-2024-031', name: '吉田 里奈', email: 'rina.yoshida@example.com', role: 'HR Manager' },
    ],
  });
  const [consultantCsvState, setConsultantCsvState] = useState<CsvState>({
    fileName: 'consultant_accounts.csv',
    preview: [
      { id: 'CNS-405', name: '大谷 翼', email: 't.subasa@example.com', role: 'Senior Consultant' },
      { id: 'CNS-406', name: '広瀬 翔', email: 'sho.hirose@example.com', role: 'Associate Consultant' },
    ],
  });
  const [csvModalType, setCsvModalType] = useState<'user' | 'consultant'>('user');

  const [llmTiers, setLlmTiers] = useState<LlmTier[]>(initialLlmTiers);
  const [selectedTierId, setSelectedTierId] = useState<TierId>(initialLlmTiers[0].id);
  const [llmForm, setLlmForm] = useState({
    model: initialLlmTiers[0].model,
    limit: initialLlmTiers[0].limit.toString(),
    notes: initialLlmTiers[0].notes,
  });

  useEffect(() => {
    const tier = llmTiers.find((item) => item.id === selectedTierId);
    if (tier) {
      setLlmForm({
        model: tier.model,
        limit: tier.limit.toString(),
        notes: tier.notes,
      });
    }
  }, [selectedTierId, llmTiers]);

  const handleSort = (target: 'user' | 'consultant', column: keyof AccountRecord) => {
    if (target === 'user') {
      setUserSort((prev) => ({
        column,
        direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    } else {
      setConsultantSort((prev) => ({
        column,
        direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    }
  };

  const getComparator = (sort: SortState) => {
    return (a: AccountRecord, b: AccountRecord) => {
      let valueA: string | number = a[sort.column];
      let valueB: string | number = b[sort.column];

      if (sort.column === 'createdAt' || sort.column === 'updatedAt') {
        valueA = new Date(a[sort.column]).getTime();
        valueB = new Date(b[sort.column]).getTime();
      }

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === 'string') {
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) return sort.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    };
  };

  const filteredUserAccounts = useMemo(() => {
    return userAccounts
      .filter((account) => {
        const keyword =
          account.name + account.email + account.company + account.role + account.id;
        const matchesQuery = keyword.toLowerCase().includes(userQuery.toLowerCase());
        const matchesStatus =
          userStatusFilter === 'all' ? true : account.status === userStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort(getComparator(userSort));
  }, [userAccounts, userQuery, userStatusFilter, userSort]);

  const filteredConsultantAccounts = useMemo(() => {
    return consultantAccounts
      .filter((account) => {
        const keyword =
          account.name + account.email + account.company + account.role + account.id;
        const matchesQuery = keyword.toLowerCase().includes(consultantQuery.toLowerCase());
        const matchesStatus =
          consultantStatusFilter === 'all' ? true : account.status === consultantStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort(getComparator(consultantSort));
  }, [consultantAccounts, consultantQuery, consultantStatusFilter, consultantSort]);

  const handleAddUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      toast({
        title: '入力不足',
        description: '氏名とメールを入力してください。',
        status: 'warning',
        duration: 2600,
        isClosable: true,
      });
      return;
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setUserAccounts((prev) => [
      {
        id: `USR-${now.getFullYear()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')}`,
        name: newUserForm.name,
        email: newUserForm.email,
        company: newUserForm.company || 'Unassigned',
        role: newUserForm.role || 'Candidate',
        status: newUserForm.status,
        createdAt: timestamp,
        updatedAt: timestamp,
        logs: 0,
      },
      ...prev,
    ]);

    setNewUserForm({ name: '', email: '', company: '', role: '', status: '面談準備中' });
    toast({
      title: 'アカウントを追加しました',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
  };

  const handleAddConsultant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newConsultantForm.name || !newConsultantForm.email) {
      toast({
        title: '入力不足',
        description: '氏名とメールを入力してください。',
        status: 'warning',
        duration: 2600,
        isClosable: true,
      });
      return;
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setConsultantAccounts((prev) => [
      {
        id: `CNS-${now.getFullYear()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')}`,
        name: newConsultantForm.name,
        email: newConsultantForm.email,
        company: newConsultantForm.company || 'Career Carte Inc.',
        role: newConsultantForm.role || 'Consultant',
        status: newConsultantForm.status,
        createdAt: timestamp,
        updatedAt: timestamp,
        logs: 0,
      },
      ...prev,
    ]);

    setNewConsultantForm({ name: '', email: '', company: '', role: '', status: 'アクティブ' });
    toast({
      title: 'コンサルタントアカウントを追加しました',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
  };

  const openCsvModal = (type: 'user' | 'consultant') => {
    setCsvModalType(type);
    csvModalDisclosure.onOpen();
  };

  const handleCsvFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextPreview: CsvPreviewRecord[] =
      csvModalType === 'user'
        ? [
            { id: 'USR-2024-041', name: '中村 愛', email: 'ai.nakamura@example.com', role: 'CS Lead' },
            { id: 'USR-2024-042', name: '小林 真', email: 'makoto.kobayashi@example.com', role: 'Sales' },
          ]
        : [
            { id: 'CNS-407', name: '石井 拓', email: 'taku.ishii@example.com', role: 'Lead Consultant' },
            { id: 'CNS-408', name: '森本 莉子', email: 'riko.morimoto@example.com', role: 'Consultant' },
          ];

    if (csvModalType === 'user') {
      setUserCsvState({ fileName: file.name, preview: nextPreview });
    } else {
      setConsultantCsvState({ fileName: file.name, preview: nextPreview });
    }
  };

  const handleCsvConfirm = () => {
    const targetLabel = csvModalType === 'user' ? 'ユーザー' : 'コンサルタント';
    const recordCount =
      csvModalType === 'user' ? userCsvState.preview.length : consultantCsvState.preview.length;
    toast({
      title: `${targetLabel}CSVアップロード`,
      description: `${recordCount}件のレコードを登録します（ダミー）。`,
      status: 'info',
      duration: 2800,
      isClosable: true,
    });
    csvModalDisclosure.onClose();
  };

  const handleLlmSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const limitValue = Number(llmForm.limit);
    if (Number.isNaN(limitValue) || limitValue <= 0) {
      toast({
        title: '上限値が正しくありません',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    setLlmTiers((prev) =>
      prev.map((tier) =>
        tier.id === selectedTierId
          ? { ...tier, model: llmForm.model, limit: limitValue, notes: llmForm.notes }
          : tier,
      ),
    );

    toast({
      title: 'LLM設定を更新しました',
      description: `対象: ${selectedTierId.toUpperCase()}`,
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
  };

  const selectedTier = llmTiers.find((tier) => tier.id === selectedTierId) ?? llmTiers[0];

  const usagePercent = Math.min(
    100,
    Number(((selectedTier.usage / selectedTier.limit) * 100).toFixed(1)),
  );

  const handleTierSelect = (tierId: TierId) => {
    setSelectedTierId(tierId);
  };

  const activeCsvState = csvModalType === 'user' ? userCsvState : consultantCsvState;

  const SortButton = ({
    label,
    target,
    column,
  }: {
    label: string;
    target: 'user' | 'consultant';
    column: keyof AccountRecord;
  }) => (
    <Button
      size="sm"
      variant="ghost"
      rightIcon={<ChevronDownIcon fontSize="1rem" />}
      onClick={() => handleSort(target, column)}
    >
      {label}
    </Button>
  );

  return (
    <Box bg="gray.50" maxH="100dvh" py={12} overflowY="scroll">
      <Container maxW="7xl">
        <Stack spacing={10}>
          <Box bg="white" borderRadius="xl" boxShadow="sm" px={{ base: 6, lg: 10 }} py={8}>
            <Stack spacing={3}>
              <Heading size="lg">システム管理コンソール</Heading>
              <Text color="gray.600">
                PC向けレイアウトでアカウント・CSV一括登録・LLM設定を集中管理します。絞り込み検索や並び替えは表の上部から操作できます。
              </Text>
              <Text color="gray.500" fontSize="sm">
                最終更新: {new Date().toLocaleString('ja-JP')}
              </Text>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 6, lg: 8 }}>
            <Stack spacing={8}>
              <Stack spacing={3}>
                <Heading size="md">アカウント管理（ユーザー）</Heading>
                <Text color="gray.600">ユーザーアカウント専用の一覧。Excelライクな表で状態を確認できます。</Text>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                  <Input
                    placeholder="ID / 氏名 / メール / 会社 で検索"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                  <Select
                    maxW={{ md: '240px' }}
                    value={userStatusFilter}
                    onChange={(event) => setUserStatusFilter(event.target.value)}
                  >
                    <option value="all">すべてのステータス</option>
                    <option value="面談準備中">面談準備中</option>
                    <option value="進行中">進行中</option>
                    <option value="完了">完了</option>
                  </Select>
                </Flex>
              </Stack>

              <Box border="1px solid" borderColor="gray.100" borderRadius="lg" overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>
                        <SortButton label="ID" target="user" column="id" />
                      </Th>
                      <Th>
                        <SortButton label="氏名" target="user" column="name" />
                      </Th>
                      <Th>
                        <SortButton label="会社" target="user" column="company" />
                      </Th>
                      <Th>メール</Th>
                      <Th>
                        <SortButton label="ステータス" target="user" column="status" />
                      </Th>
                      <Th>
                        <SortButton label="作成日時" target="user" column="createdAt" />
                      </Th>
                      <Th>
                        <SortButton label="更新日時" target="user" column="updatedAt" />
                      </Th>
                      <Th>操作ログ</Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredUserAccounts.map((account) => (
                      <Tr key={account.id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="medium">{account.id}</Td>
                        <Td>
                          <Stack spacing={0}>
                            <Text fontWeight="semibold">{account.name}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {account.role}
                            </Text>
                          </Stack>
                        </Td>
                        <Td>{account.company}</Td>
                        <Td>
                          <Text fontSize="sm" color="gray.600">
                            {account.email}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={account.status === '完了' ? 'green' : 'purple'}>
                            {account.status}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">{account.createdAt}</Td>
                        <Td fontSize="sm">{account.updatedAt}</Td>
                        <Td>{account.logs}件</Td>
                        <Td>
                          <Button size="xs" variant="outline">
                            編集
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              <Box>
                <Button
                  mt={3}
                  size="lg"
                  w="full"
                  variant="outline"
                  colorScheme="blue"
                  onClick={userAddDisclosure.onToggle}
                >
                  {userAddDisclosure.isOpen ? '追加フォームを閉じる' : 'ユーザーアカウントを追加'}
                </Button>
                <Collapse in={userAddDisclosure.isOpen} animateOpacity>
                  <Box
                    mt={4}
                    border="1px solid"
                    borderColor="gray.100"
                    borderRadius="lg"
                    p={6}
                  >
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                      <Box>
                        <form onSubmit={handleAddUser}>
                          <Stack spacing={4}>
                            <Heading size="sm" display="flex" alignItems="center" gap={2}>
                              <FiPlus /> 個別追加
                            </Heading>
                            <FormControl isRequired>
                              <FormLabel>氏名</FormLabel>
                              <Input
                                value={newUserForm.name}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, name: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl isRequired>
                              <FormLabel>メール</FormLabel>
                              <Input
                                type="email"
                                value={newUserForm.email}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, email: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>会社名</FormLabel>
                              <Input
                                value={newUserForm.company}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, company: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>職種 / ロール</FormLabel>
                              <Input
                                value={newUserForm.role}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, role: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>ステータス</FormLabel>
                              <Select
                                value={newUserForm.status}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, status: event.target.value }))
                                }
                              >
                                <option value="面談準備中">面談準備中</option>
                                <option value="進行中">進行中</option>
                                <option value="完了">完了</option>
                              </Select>
                            </FormControl>
                            <Button type="submit" colorScheme="blue" alignSelf="flex-start">
                              登録
                            </Button>
                          </Stack>
                        </form>
                      </Box>
                      <Box>
                        <Stack spacing={4}>
                          <Heading size="sm" display="flex" alignItems="center" gap={2}>
                            <FiUpload /> CSV一括追加
                          </Heading>
                          <Text color="gray.600">
                            CSVをアップロードして内容を確認後、一括登録を実行します。ヘッダーは
                            <strong> ID, Name, Email, Role </strong>
                            の順で設定してください。
                          </Text>
                          <Button
                            variant="outline"
                            leftIcon={<FiFileText />}
                            onClick={() => openCsvModal('user')}
                          >
                            CSV確認モーダルを開く
                          </Button>
                          <Text fontSize="sm" color="gray.500">
                            ※モーダル内でファイル選択とレコード確認が可能です。
                          </Text>
                        </Stack>
                      </Box>
                    </SimpleGrid>
                  </Box>
                </Collapse>
              </Box>

              <Divider />

              <Stack spacing={3}>
                <Heading size="md">アカウント管理（コンサルタント）</Heading>
                <Text color="gray.600">
                  コンサルタント向けアカウント。ユーザー一覧とは完全に分離しています。
                </Text>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                  <Input
                    placeholder="ID / 氏名 / メール / 会社 で検索"
                    value={consultantQuery}
                    onChange={(event) => setConsultantQuery(event.target.value)}
                  />
                  <Select
                    maxW={{ md: '240px' }}
                    value={consultantStatusFilter}
                    onChange={(event) => setConsultantStatusFilter(event.target.value)}
                  >
                    <option value="all">すべての状態</option>
                    <option value="アクティブ">アクティブ</option>
                    <option value="休止中">休止中</option>
                  </Select>
                </Flex>
              </Stack>

              <Box border="1px solid" borderColor="gray.100" borderRadius="lg" overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>
                        <SortButton label="ID" target="consultant" column="id" />
                      </Th>
                      <Th>
                        <SortButton label="氏名" target="consultant" column="name" />
                      </Th>
                      <Th>
                        <SortButton label="会社" target="consultant" column="company" />
                      </Th>
                      <Th>メール</Th>
                      <Th>
                        <SortButton label="ステータス" target="consultant" column="status" />
                      </Th>
                      <Th>
                        <SortButton label="作成日時" target="consultant" column="createdAt" />
                      </Th>
                      <Th>
                        <SortButton label="更新日時" target="consultant" column="updatedAt" />
                      </Th>
                      <Th>操作ログ</Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredConsultantAccounts.map((account) => (
                      <Tr key={account.id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="medium">{account.id}</Td>
                        <Td>
                          <Stack spacing={0}>
                            <Text fontWeight="semibold">{account.name}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {account.role}
                            </Text>
                          </Stack>
                        </Td>
                        <Td>{account.company}</Td>
                        <Td>
                          <Text fontSize="sm" color="gray.600">
                            {account.email}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={account.status === '休止中' ? 'orange' : 'green'}>
                            {account.status}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">{account.createdAt}</Td>
                        <Td fontSize="sm">{account.updatedAt}</Td>
                        <Td>{account.logs}件</Td>
                        <Td>
                          <Button size="xs" variant="outline">
                            編集
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              <Box>
                <Button
                  mt={3}
                  size="lg"
                  w="full"
                  variant="outline"
                  colorScheme="green"
                  onClick={consultantAddDisclosure.onToggle}
                >
                  {consultantAddDisclosure.isOpen ? '追加フォームを閉じる' : 'コンサルタントアカウントを追加'}
                </Button>
                <Collapse in={consultantAddDisclosure.isOpen} animateOpacity>
                  <Box
                    mt={4}
                    border="1px solid"
                    borderColor="gray.100"
                    borderRadius="lg"
                    p={6}>
                        <form onSubmit={handleAddConsultant}>
                          <Stack spacing={4}>
                            <Heading size="sm" display="flex" alignItems="center" gap={2}>
                              <FiPlus /> 個別追加
                            </Heading>
                            <FormControl isRequired>
                              <FormLabel>氏名</FormLabel>
                              <Input
                                value={newConsultantForm.name}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, name: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl isRequired>
                              <FormLabel>メール</FormLabel>
                              <Input
                                type="email"
                                value={newConsultantForm.email}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, email: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>会社名</FormLabel>
                              <Input
                                value={newConsultantForm.company}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, company: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>職種 / ロール</FormLabel>
                              <Input
                                value={newConsultantForm.role}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, role: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>ステータス</FormLabel>
                              <Select
                                value={newConsultantForm.status}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, status: event.target.value }))
                                }
                              >
                                <option value="アクティブ">アクティブ</option>
                                <option value="休止中">休止中</option>
                              </Select>
                            </FormControl>
                            <Button type="submit" colorScheme="green" alignSelf="flex-start">
                              登録
                            </Button>
                          </Stack>
                        </form>
                      </Box>
                      <Box>
                        <Stack spacing={4}>
                          <Heading size="sm" display="flex" alignItems="center" gap={2}>
                            <FiUpload /> CSV一括追加
                          </Heading>
                          <Text color="gray.600">
                            CSVアップロードで複数のコンサルタントを同時に登録します。担当ロールやSlack通知設定もCSVに含められます。
                          </Text>
                          <Button
                            variant="outline"
                            leftIcon={<FiFileText />}
                            onClick={() => openCsvModal('consultant')}
                          >
                            CSV確認モーダルを開く
                          </Button>
                          <Text fontSize="sm" color="gray.500">
                            ※担当範囲や稼働状況も今後追加予定です。
                          </Text>
                        </Stack>
                      </Box>
                </Collapse>
              </Box>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 6, lg: 8 }}>
            <Stack spacing={6}>
              <Heading size="md">3. LLM使用回数設定</Heading>
              <Text color="gray.600">
                Tierごとの利用状況を左カラムで選択し、右カラムで回数やモデルを更新します。
              </Text>
                <SimpleGrid
                columns={{ base: 1, lg: 2 }}
                spacing={6}
                templateColumns={{ base: '1fr', lg: '320px 1fr' }}
                >
                <Stack
                  spacing={3}
                  border="1px solid"
                  borderColor="gray.100"
                  borderRadius="lg"
                  p={4}
                >
                  {llmTiers.map((tier) => (
                  <Button
                    key={tier.id}
                    variant={tier.id === selectedTierId ? 'solid' : 'ghost'}
                    colorScheme="teal"
                    justifyContent="flex-start"
                    textAlign="left"
                    onClick={() => handleTierSelect(tier.id)}
                    p={4}
                    borderRadius="md"
                    transition="all 0.2s"
                  >
                    <Stack spacing={0}>
                    <Text fontWeight="bold">{tier.label}</Text>
                    <Text
                      fontSize="sm"
                      color={tier.id === selectedTierId ? 'whiteAlpha.800' : 'gray.500'}
                    >
                      {tier.description}
                    </Text>
                    </Stack>
                  </Button>
                  ))}
                </Stack>
                <Box border="1px solid" borderColor="gray.100" borderRadius="lg" p={6}>
                  <Stack spacing={4}>
                    <Heading size="sm">{selectedTier.label} の利用状況</Heading>
                    <Flex align="center" gap={6} wrap="wrap">
                      <Box>
                        <Text fontSize="sm" color="gray.500">
                          プラン
                        </Text>
                        <Text fontWeight="semibold">{selectedTier.plan}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">
                          使用モデル
                        </Text>
                        <Badge colorScheme="purple">{selectedTier.model}</Badge>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">
                          利用実績
                        </Text>
                        <Text fontWeight="semibold">
                          {selectedTier.usage} / {selectedTier.limit} コール
                        </Text>
                      </Box>
                    </Flex>
                    <Progress
                      value={usagePercent}
                      colorScheme={usagePercent > 80 ? 'orange' : 'teal'}
                      borderRadius="md"
                    />
                    <Text fontSize="sm" color="gray.500">
                      {selectedTier.notes}
                    </Text>
                    <Divider />
                    <form onSubmit={handleLlmSubmit}>
                      <Stack spacing={4}>
                        <FormControl>
                          <FormLabel>モデル選択</FormLabel>
                          <Select
                            value={llmForm.model}
                            onChange={(event) =>
                              setLlmForm((prev) => ({ ...prev, model: event.target.value }))
                            }
                          >
                            <option value="gpt-4o">gpt-4o</option>
                            <option value="gpt-4o-mini">gpt-4o-mini</option>
                            <option value="gpt-5.1">gpt-5.1（計画中）</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel>月次利用上限（回）</FormLabel>
                          <Input
                            type="number"
                            min="1"
                            value={llmForm.limit}
                            onChange={(event) =>
                              setLlmForm((prev) => ({ ...prev, limit: event.target.value }))
                            }
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>メモ / 運用ルール</FormLabel>
                          <Textarea
                            rows={3}
                            value={llmForm.notes}
                            onChange={(event) =>
                              setLlmForm((prev) => ({ ...prev, notes: event.target.value }))
                            }
                          />
                        </FormControl>
                        <Button
                          type="submit"
                          colorScheme="teal"
                          alignSelf="flex-start"
                          leftIcon={<FiZap />}
                        >
                          設定を更新
                        </Button>
                      </Stack>
                    </form>
                  </Stack>
                </Box>
              </SimpleGrid>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Modal isOpen={csvModalDisclosure.isOpen} onClose={csvModalDisclosure.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {csvModalType === 'user' ? 'ユーザーCSV一括追加' : 'コンサルタントCSV一括追加'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto" maxH="65dvh">
            <Stack spacing={5}>
              <FormControl>
                <FormLabel>CSVファイル</FormLabel>
                <Input type="file" accept=".csv" onChange={handleCsvFileChange} />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  選択中: {activeCsvState.fileName}
                </Text>
              </FormControl>
              <Divider />
              <Text fontWeight="semibold">取り込み予定レコード（ダミー）</Text>
              <Box border="1px solid" borderColor="gray.100" borderRadius="lg" overflow="hidden">
                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>ID</Th>
                      <Th>氏名</Th>
                      <Th>メール</Th>
                      <Th>ロール</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {activeCsvState.preview.map((record) => (
                      <Tr key={record.id}>
                        <Td>{record.id}</Td>
                        <Td>{record.name}</Td>
                        <Td>{record.email}</Td>
                        <Td>{record.role}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
              <Text fontSize="sm" color="gray.500">
                ※ 本登録前に内容を再確認してください。実データ連携は今後追加予定です。
              </Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={csvModalDisclosure.onClose}>
              キャンセル
            </Button>
            <Button colorScheme="blue" leftIcon={<FiFileText />} onClick={handleCsvConfirm}>
              登録を実行
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Admin;
