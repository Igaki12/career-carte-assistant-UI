import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Checkbox,
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
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react';
import { FiFileText, FiPlus, FiUpload } from 'react-icons/fi';

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
  monthlyInterviewLimit: number;
  monthlyInterviewRemaining: number;
  llmCallsPerInterview: number;
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

type AccountEditForm = {
  name: string;
  email: string;
  company: string;
  role: string;
  status: string;
  monthlyInterviewLimit: string;
  monthlyInterviewRemaining: string;
  llmCallsPerInterview: string;
};

type BulkEditForm = {
  company: string;
  role: string;
  status: string;
  monthlyInterviewLimit: string;
  monthlyInterviewRemaining: string;
  llmCallsPerInterview: string;
};

function Admin() {
  const toast = useToast();
  const csvModalDisclosure = useDisclosure();
  const userAddDisclosure = useDisclosure();
  const consultantAddDisclosure = useDisclosure();
  const editModalDisclosure = useDisclosure();
  const bulkEditDisclosure = useDisclosure();

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
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 4,
      llmCallsPerInterview: 3,
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
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 7,
      llmCallsPerInterview: 3,
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
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 1,
      llmCallsPerInterview: 3,
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
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 2,
      llmCallsPerInterview: 3,
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
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 6,
      llmCallsPerInterview: 3,
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
      monthlyInterviewLimit: 10,
      monthlyInterviewRemaining: 9,
      llmCallsPerInterview: 3,
    },
  ]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<'user' | 'consultant' | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [editForm, setEditForm] = useState<AccountEditForm>({
    name: '',
    email: '',
    company: '',
    role: '',
    status: '',
    monthlyInterviewLimit: '',
    monthlyInterviewRemaining: '',
    llmCallsPerInterview: '',
  });
  const [bulkTarget, setBulkTarget] = useState<'user' | 'consultant' | null>(null);
  const [bulkForm, setBulkForm] = useState<BulkEditForm>({
    company: '',
    role: '',
    status: '',
    monthlyInterviewLimit: '',
    monthlyInterviewRemaining: '',
    llmCallsPerInterview: '',
  });

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

  const [activeSection, setActiveSection] = useState<'user' | 'consultant'>('user');

  const buildTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const buildEditForm = (account: AccountRecord): AccountEditForm => ({
    name: account.name,
    email: account.email,
    company: account.company,
    role: account.role,
    status: account.status,
    monthlyInterviewLimit: account.monthlyInterviewLimit.toString(),
    monthlyInterviewRemaining: account.monthlyInterviewRemaining.toString(),
    llmCallsPerInterview: account.llmCallsPerInterview.toString(),
  });

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

  const userStatusOptions = ['面談準備中', '進行中', '完了'];
  const consultantStatusOptions = ['アクティブ', '休止中'];

  const filteredUserIds = filteredUserAccounts.map((account) => account.id);
  const filteredConsultantIds = filteredConsultantAccounts.map((account) => account.id);
  const allFilteredUsersSelected =
    filteredUserIds.length > 0 && filteredUserIds.every((id) => selectedUserIds.includes(id));
  const allFilteredConsultantsSelected =
    filteredConsultantIds.length > 0 &&
    filteredConsultantIds.every((id) => selectedConsultantIds.includes(id));

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
    const timestamp = buildTimestamp();

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
        monthlyInterviewLimit: 10,
        monthlyInterviewRemaining: 10,
        llmCallsPerInterview: 3,
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
    const timestamp = buildTimestamp();

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
        monthlyInterviewLimit: 10,
        monthlyInterviewRemaining: 10,
        llmCallsPerInterview: 3,
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

  const toggleSelection = (
    target: 'user' | 'consultant',
    accountId: string,
    isChecked: boolean,
  ) => {
    if (target === 'user') {
      setSelectedUserIds((prev) =>
        isChecked ? [...prev, accountId] : prev.filter((id) => id !== accountId),
      );
      return;
    }
    setSelectedConsultantIds((prev) =>
      isChecked ? [...prev, accountId] : prev.filter((id) => id !== accountId),
    );
  };

  const handleSelectAll = (target: 'user' | 'consultant') => {
    if (target === 'user') {
      const nextSelected = new Set(selectedUserIds);
      if (allFilteredUsersSelected) {
        filteredUserIds.forEach((id) => nextSelected.delete(id));
      } else {
        filteredUserIds.forEach((id) => nextSelected.add(id));
      }
      setSelectedUserIds(Array.from(nextSelected));
      return;
    }

    const nextSelected = new Set(selectedConsultantIds);
    if (allFilteredConsultantsSelected) {
      filteredConsultantIds.forEach((id) => nextSelected.delete(id));
    } else {
      filteredConsultantIds.forEach((id) => nextSelected.add(id));
    }
    setSelectedConsultantIds(Array.from(nextSelected));
  };

  const openEditModal = (target: 'user' | 'consultant', account: AccountRecord) => {
    setEditTarget(target);
    setEditingAccount(account);
    setEditForm(buildEditForm(account));
    editModalDisclosure.onOpen();
  };

  const openBulkEditModal = (target: 'user' | 'consultant') => {
    setBulkTarget(target);
    setBulkForm({
      company: '',
      role: '',
      status: '',
      monthlyInterviewLimit: '',
      monthlyInterviewRemaining: '',
      llmCallsPerInterview: '',
    });
    bulkEditDisclosure.onOpen();
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAccount || !editTarget) return;

    const limitValue = Number(editForm.monthlyInterviewLimit);
    const remainingValue = Number(editForm.monthlyInterviewRemaining);
    const llmValue = Number(editForm.llmCallsPerInterview);

    if (
      Number.isNaN(limitValue) ||
      Number.isNaN(remainingValue) ||
      Number.isNaN(llmValue) ||
      limitValue <= 0 ||
      remainingValue < 0 ||
      llmValue <= 0
    ) {
      toast({
        title: '入力値が正しくありません',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    const nextTimestamp = buildTimestamp();
    const applyUpdate = (accounts: AccountRecord[]) =>
      accounts.map((account) =>
        account.id === editingAccount.id
          ? {
              ...account,
              name: editForm.name,
              email: editForm.email,
              company: editForm.company,
              role: editForm.role,
              status: editForm.status,
              monthlyInterviewLimit: limitValue,
              monthlyInterviewRemaining: Math.min(remainingValue, limitValue),
              llmCallsPerInterview: llmValue,
              updatedAt: nextTimestamp,
            }
          : account,
      );

    if (editTarget === 'user') {
      setUserAccounts((prev) => applyUpdate(prev));
    } else {
      setConsultantAccounts((prev) => applyUpdate(prev));
    }

    toast({
      title: 'アカウントを更新しました',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
    editModalDisclosure.onClose();
  };

  const handleBulkEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bulkTarget) return;
    const selectedIds = bulkTarget === 'user' ? selectedUserIds : selectedConsultantIds;

    if (selectedIds.length === 0) return;

    const limitValue =
      bulkForm.monthlyInterviewLimit.trim() === ''
        ? null
        : Number(bulkForm.monthlyInterviewLimit);
    const remainingValue =
      bulkForm.monthlyInterviewRemaining.trim() === ''
        ? null
        : Number(bulkForm.monthlyInterviewRemaining);
    const llmValue =
      bulkForm.llmCallsPerInterview.trim() === '' ? null : Number(bulkForm.llmCallsPerInterview);

    if (
      (limitValue !== null && (Number.isNaN(limitValue) || limitValue <= 0)) ||
      (remainingValue !== null && (Number.isNaN(remainingValue) || remainingValue < 0)) ||
      (llmValue !== null && (Number.isNaN(llmValue) || llmValue <= 0))
    ) {
      toast({
        title: '入力値が正しくありません',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    const nextTimestamp = buildTimestamp();
    const applyUpdate = (accounts: AccountRecord[]) =>
      accounts.map((account) => {
        if (!selectedIds.includes(account.id)) return account;
        const nextLimit = limitValue ?? account.monthlyInterviewLimit;
        const nextRemaining =
          remainingValue ?? Math.min(account.monthlyInterviewRemaining, nextLimit);
        return {
          ...account,
          company: bulkForm.company.trim() === '' ? account.company : bulkForm.company,
          role: bulkForm.role.trim() === '' ? account.role : bulkForm.role,
          status: bulkForm.status.trim() === '' ? account.status : bulkForm.status,
          monthlyInterviewLimit: nextLimit,
          monthlyInterviewRemaining: Math.min(nextRemaining, nextLimit),
          llmCallsPerInterview: llmValue ?? account.llmCallsPerInterview,
          updatedAt: nextTimestamp,
        };
      });

    if (bulkTarget === 'user') {
      setUserAccounts((prev) => applyUpdate(prev));
    } else {
      setConsultantAccounts((prev) => applyUpdate(prev));
    }

    toast({
      title: '一括更新を適用しました',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
    bulkEditDisclosure.onClose();
  };

  const handleBulkDelete = (target: 'user' | 'consultant') => {
    if (target === 'user') {
      setUserAccounts((prev) => prev.filter((account) => !selectedUserIds.includes(account.id)));
      setSelectedUserIds([]);
    } else {
      setConsultantAccounts((prev) =>
        prev.filter((account) => !selectedConsultantIds.includes(account.id)),
      );
      setSelectedConsultantIds([]);
    }

    toast({
      title: '選択中のアカウントを削除しました',
      status: 'info',
      duration: 2400,
      isClosable: true,
    });
  };

  const handlePasswordReset = (account: AccountRecord) => {
    toast({
      title: 'パスワード再発行を送信しました',
      description: `${account.email} に案内を送付（ダミー）。`,
      status: 'info',
      duration: 2600,
      isClosable: true,
    });
  };

  return (
    <Box bg="gray.50" maxH="100dvh" py={12} overflowY="scroll">
      <Container maxW="7xl">
        <Stack spacing={10}>
          <Box bg="white" borderRadius="xl" boxShadow="sm" px={{ base: 6, lg: 10 }} py={8}>
            <Stack spacing={3}>
              <Heading size="lg">システム管理コンソール</Heading>
              <Text color="gray.600">
                PC向けレイアウトでアカウントとCSV一括登録を集中管理します。絞り込み検索や並び替えは表の上部から操作できます。
              </Text>
              <Text color="gray.500" fontSize="sm">
                最終更新: {new Date().toLocaleString('ja-JP')}
              </Text>
            </Stack>
            <Flex mt={6} gap={3} wrap="wrap">
              <Button
                variant={activeSection === 'user' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => setActiveSection('user')}
              >
                ユーザーアカウント管理
              </Button>
              <Button
                variant={activeSection === 'consultant' ? 'solid' : 'outline'}
                colorScheme="green"
                onClick={() => setActiveSection('consultant')}
              >
                コンサルアカウント管理
              </Button>
            </Flex>
          </Box>

          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            p={{ base: 6, lg: 8 }}
            display={activeSection === 'user' ? 'block' : 'none'}
          >
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
                  <Button
                    width={{ md: '240px' }}
                    size="md"
                    variant="outline"
                    colorScheme="blue"
                    onClick={() => handleSelectAll('user')}
                  >
                    {allFilteredUsersSelected ? '選択解除' : '全ての行を選択'}
                  </Button>
                </Flex>
              </Stack>

              {selectedUserIds.length > 0 && (
                <Box border="1px solid" borderColor="blue.100" borderRadius="lg" bg="blue.50" p={4}>
                  <Flex direction={{ base: 'column', md: 'row' }} gap={3} align="center">
                    <Text fontWeight="semibold">選択中: {selectedUserIds.length}件</Text>
                    <Flex gap={2} wrap="wrap">
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => openBulkEditModal('user')}
                      >
                        全て編集
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="red"
                        onClick={() => handleBulkDelete('user')}
                      >
                        全て削除
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="blue"
                        onClick={() => setSelectedUserIds([])}
                      >
                        選択解除
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )}

              <Box border="1px solid" borderColor="gray.100" borderRadius="lg" overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>選択</Th>
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
                      <Th>面談回数</Th>
                      <Th>LLM使用回数</Th>
                      <Th>操作ログ</Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredUserAccounts.map((account) => (
                      <Tr
                        key={account.id}
                        bg={selectedUserIds.includes(account.id) ? 'blue.50' : 'transparent'}
                        _hover={{ bg: 'gray.50' }}
                      >
                        <Td>
                          <Checkbox
                            isChecked={selectedUserIds.includes(account.id)}
                            onChange={(event) =>
                              toggleSelection('user', account.id, event.target.checked)
                            }
                            aria-label={`${account.name}を選択`}
                          />
                        </Td>
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
                        <Td fontSize="sm">
                          あと{account.monthlyInterviewRemaining}/{account.monthlyInterviewLimit}回
                        </Td>
                        <Td fontSize="sm">{account.llmCallsPerInterview}回/面談</Td>
                        <Td>{account.logs}件</Td>
                        <Td>
                          <Stack direction="row" spacing={2}>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openEditModal('user', account)}
                            >
                              編集
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handlePasswordReset(account)}
                            >
                              再発行
                            </Button>
                          </Stack>
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

            </Stack>
          </Box>

          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            p={{ base: 6, lg: 8 }}
            display={activeSection === 'consultant' ? 'block' : 'none'}
          >
            <Stack spacing={8}>
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
                  <Button
                    width={{ md: '240px' }}
                    size="md"
                    variant="outline"
                    colorScheme="green"
                    onClick={() => handleSelectAll('consultant')}
                  >
                    {allFilteredConsultantsSelected ? '選択解除' : '全ての行を選択'}
                  </Button>
                </Flex>
              </Stack>

              {selectedConsultantIds.length > 0 && (
                <Box
                  border="1px solid"
                  borderColor="green.100"
                  borderRadius="lg"
                  bg="green.50"
                  p={4}
                >
                  <Flex direction={{ base: 'column', md: 'row' }} gap={3} align="center">
                    <Text fontWeight="semibold">選択中: {selectedConsultantIds.length}件</Text>
                    <Flex gap={2} wrap="wrap">
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => openBulkEditModal('consultant')}
                      >
                        全て編集
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="red"
                        onClick={() => handleBulkDelete('consultant')}
                      >
                        全て削除
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="green"
                        onClick={() => setSelectedConsultantIds([])}
                      >
                        選択解除
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )}

              <Box border="1px solid" borderColor="gray.100" borderRadius="lg" overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>選択</Th>
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
                      <Th>面談回数</Th>
                      <Th>LLM使用回数</Th>
                      <Th>操作ログ</Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredConsultantAccounts.map((account) => (
                      <Tr
                        key={account.id}
                        bg={selectedConsultantIds.includes(account.id) ? 'green.50' : 'transparent'}
                        _hover={{ bg: 'gray.50' }}
                      >
                        <Td>
                          <Checkbox
                            isChecked={selectedConsultantIds.includes(account.id)}
                            onChange={(event) =>
                              toggleSelection('consultant', account.id, event.target.checked)
                            }
                            aria-label={`${account.name}を選択`}
                          />
                        </Td>
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
                        <Td fontSize="sm">
                          あと{account.monthlyInterviewRemaining}/{account.monthlyInterviewLimit}回
                        </Td>
                        <Td fontSize="sm">{account.llmCallsPerInterview}回/面談</Td>
                        <Td>{account.logs}件</Td>
                        <Td>
                          <Stack direction="row" spacing={2}>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openEditModal('consultant', account)}
                            >
                              編集
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handlePasswordReset(account)}
                            >
                              再発行
                            </Button>
                          </Stack>
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
                    p={6}
                  >
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                      <Box>
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
                    </SimpleGrid>
                  </Box>
                </Collapse>
              </Box>
            </Stack>
          </Box>

        </Stack>
      </Container>

      <Modal isOpen={csvModalDisclosure.isOpen} onClose={csvModalDisclosure.onClose} size="3xl">
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

      <Modal isOpen={editModalDisclosure.isOpen} onClose={editModalDisclosure.onClose} size="3xl">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleEditSubmit}>
          <ModalHeader>
            アカウント編集（{editTarget === 'consultant' ? 'コンサルタント' : 'ユーザー'}）
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              {editingAccount ? (
                <>
                  <Text fontSize="sm" color="gray.600">
                    ID: {editingAccount.id}
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>氏名</FormLabel>
                      <Input
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>メール</FormLabel>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>会社名</FormLabel>
                      <Input
                        value={editForm.company}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, company: event.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>職種 / ロール</FormLabel>
                      <Input
                        value={editForm.role}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, role: event.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>ステータス</FormLabel>
                      <Select
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, status: event.target.value }))
                        }
                      >
                        {(editTarget === 'consultant'
                          ? consultantStatusOptions
                          : userStatusOptions
                        ).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  <Divider />
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>月間面談上限</FormLabel>
                      <Input
                        type="number"
                        min="1"
                        value={editForm.monthlyInterviewLimit}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            monthlyInterviewLimit: event.target.value,
                          }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>残り面談回数</FormLabel>
                      <Input
                        type="number"
                        min="0"
                        value={editForm.monthlyInterviewRemaining}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            monthlyInterviewRemaining: event.target.value,
                          }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>LLM使用回数/面談</FormLabel>
                      <Input
                        type="number"
                        min="1"
                        value={editForm.llmCallsPerInterview}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            llmCallsPerInterview: event.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </SimpleGrid>
                </>
              ) : (
                <Text fontSize="sm" color="gray.600">
                  編集対象を選択してください。
                </Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={editModalDisclosure.onClose}>
              キャンセル
            </Button>
            <Button colorScheme="blue" type="submit">
              変更を保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={bulkEditDisclosure.isOpen} onClose={bulkEditDisclosure.onClose} size="3xl">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleBulkEditSubmit}>
          <ModalHeader>
            一括編集（{bulkTarget === 'consultant' ? 'コンサルタント' : 'ユーザー'}）
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                空欄の項目は変更しません。対象: {bulkTarget === 'consultant'
                  ? selectedConsultantIds.length
                  : selectedUserIds.length}
                件
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>会社名</FormLabel>
                  <Input
                    placeholder="変更しない"
                    value={bulkForm.company}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, company: event.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>職種 / ロール</FormLabel>
                  <Input
                    placeholder="変更しない"
                    value={bulkForm.role}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>ステータス</FormLabel>
                  <Select
                    value={bulkForm.status}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="">変更しない</option>
                    {(bulkTarget === 'consultant'
                      ? consultantStatusOptions
                      : userStatusOptions
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl>
                  <FormLabel>月間面談上限</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    placeholder="変更しない"
                    value={bulkForm.monthlyInterviewLimit}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        monthlyInterviewLimit: event.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>残り面談回数</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    placeholder="変更しない"
                    value={bulkForm.monthlyInterviewRemaining}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        monthlyInterviewRemaining: event.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>LLM使用回数/面談</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    placeholder="変更しない"
                    value={bulkForm.llmCallsPerInterview}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        llmCallsPerInterview: event.target.value,
                      }))
                    }
                  />
                </FormControl>
              </SimpleGrid>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={bulkEditDisclosure.onClose}>
              キャンセル
            </Button>
            <Button colorScheme="blue" type="submit">
              一括更新を適用
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Admin;
