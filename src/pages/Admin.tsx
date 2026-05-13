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
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { FiFileText, FiPlus, FiUpload } from 'react-icons/fi';
import PrimaryButton from '../components/PrimaryButton';
import {
  DEFAULT_DEMO_USER_ID,
  getTenantFeatureFlags,
  loadDemoUserState,
  saveDemoUserState,
  updateTenantFeatureFlags,
} from '../lib/demoUserState';
import { demoAccounts, joinName, joinNameKana, type DemoAccountRecord } from '../lib/demoAccounts';
import {
  buildPasswordNotification,
  copyTextToClipboard,
  type DemoPasswordNotification,
} from '../lib/demoPassword';
import {
  getCompanyApiUsageSummary,
  getDemoUsageQuota,
  subscribeDemoUsageQuota,
  updateDemoUsageQuota,
  type DemoUsageQuota,
} from '../lib/demoUsageQuota';
import type { DemoUserState } from '../types';

type AccountRecord = {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  nameKana: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  company: string;
  department: string;
  role: string;
  permission: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  logs: number;
  initialInterviewRemaining: number;
  continuousInterviewRemaining: number;
  initialLlmCallsPerInterview: number;
  continuousLlmCallsPerInterview: number;
};

type SortState = {
  column: keyof AccountRecord;
  direction: 'asc' | 'desc';
};

type CsvPreviewRecord = {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  nameKana: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  company: string;
  department: string;
  role: string;
  permission: string;
};

type CsvState = {
  fileName: string;
  preview: CsvPreviewRecord[];
};

type AccountEditForm = {
  id: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  company: string;
  department: string;
  role: string;
  permission: string;
  status: string;
  initialInterviewRemaining: string;
  continuousInterviewRemaining: string;
  initialLlmCallsPerInterview: string;
};

type BulkEditForm = {
  company: string;
  department: string;
  role: string;
  permission: string;
  status: string;
  initialInterviewRemaining: string;
  continuousInterviewRemaining: string;
  initialLlmCallsPerInterview: string;
};

type AccountTarget = 'user' | 'consultant';

type SortButtonProps = {
  label: string;
  target: AccountTarget;
  column: keyof AccountRecord;
  onSort: (target: AccountTarget, column: keyof AccountRecord) => void;
};

const SortButton = ({ label, target, column, onSort }: SortButtonProps) => (
  <Button
    size="sm"
    variant="ghost"
    color="whiteAlpha.900"
    _hover={{ bg: 'whiteAlpha.200' }}
    rightIcon={<ChevronDownIcon fontSize="1rem" />}
    onClick={() => onSort(target, column)}
  >
    {label}
  </Button>
);

const adminPageBg = 'linear(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)';

const linePanelProps = {
  bg: 'transparent',
  color: 'white',
  borderRadius: '0',
  borderWidth: '0',
  position: 'relative',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.34)',
  backdropFilter: 'blur(14px)',
  _before: {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: { base: '4px', md: '6px' },
    bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.74), rgba(203, 213, 225, 0.88), transparent)',
  },
  sx: {
    '& th': { color: 'rgba(255, 255, 255, 0.76)', borderColor: 'rgba(255, 255, 255, 0.14)' },
    '& td': { color: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)' },
    '& .chakra-form__label': { color: 'rgba(255, 255, 255, 0.9)' },
    '& input, & select': {
      background: 'rgba(255, 255, 255, 0.92)',
      color: '#0f172a',
      borderColor: 'rgba(255, 255, 255, 0.6)',
    },
  },
} as const;

const outlineLightButtonProps = {
  variant: 'outline',
  color: 'white',
  borderColor: 'whiteAlpha.500',
  _hover: { bg: 'whiteAlpha.160' },
} as const;

const tableActionButtonProps = {
  variant: 'outline',
  color: 'whiteAlpha.900',
  borderColor: 'whiteAlpha.600',
  _hover: { bg: 'whiteAlpha.180', color: 'white', borderColor: 'whiteAlpha.800' },
  _disabled: {
    color: 'whiteAlpha.400',
    borderColor: 'whiteAlpha.300',
    opacity: 0.55,
  },
} as const;

const createAccountRecordFromDemo = (account: DemoAccountRecord, timestamp = '2026-05-13 09:00'): AccountRecord => ({
  id: account.id,
  name: account.name,
  lastName: account.lastName,
  firstName: account.firstName,
  nameKana: account.nameKana,
  lastNameKana: account.lastNameKana,
  firstNameKana: account.firstNameKana,
  email: account.email,
  company: account.company,
  department: account.department,
  role: account.jobTitle,
  permission: account.permission,
  status: account.status,
  createdAt: timestamp,
  updatedAt: timestamp,
  logs: 0,
  initialInterviewRemaining: 10,
  continuousInterviewRemaining: 4,
  initialLlmCallsPerInterview: 10,
  continuousLlmCallsPerInterview: 7,
});

const createEmptyAddForm = (permission: string, status: string) => ({
  id: '',
  lastName: '',
  firstName: '',
  lastNameKana: '',
  firstNameKana: '',
  email: '',
  company: '',
  department: '',
  role: '',
  permission,
  status,
});

function Admin() {
  const toast = useToast();
  const csvModalDisclosure = useDisclosure();
  const userAddDisclosure = useDisclosure();
  const consultantAddDisclosure = useDisclosure();
  const editModalDisclosure = useDisclosure();
  const bulkEditDisclosure = useDisclosure();

  const [userAccounts, setUserAccounts] = useState<AccountRecord[]>(() =>
    demoAccounts
      .filter((account) => account.role === 'user' || account.role === 'company-admin')
      .map((account) => createAccountRecordFromDemo(account)),
  );

  const [consultantAccounts, setConsultantAccounts] = useState<AccountRecord[]>(() =>
    demoAccounts
      .filter((account) => account.role === 'consultant')
      .map((account) => createAccountRecordFromDemo(account)),
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<'user' | 'consultant' | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [editForm, setEditForm] = useState<AccountEditForm>({
    id: '',
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    email: '',
    company: '',
    department: '',
    role: '',
    permission: '',
    status: '',
    initialInterviewRemaining: '',
    continuousInterviewRemaining: '',
    initialLlmCallsPerInterview: '',
  });
  const [bulkTarget, setBulkTarget] = useState<'user' | 'consultant' | null>(null);
  const [bulkForm, setBulkForm] = useState<BulkEditForm>({
    company: '',
    department: '',
    role: '',
    permission: '',
    status: '',
    initialInterviewRemaining: '',
    continuousInterviewRemaining: '',
    initialLlmCallsPerInterview: '',
  });

  const [userQuery, setUserQuery] = useState('');
  const [userSort, setUserSort] = useState<SortState>({ column: 'updatedAt', direction: 'desc' });

  const [consultantQuery, setConsultantQuery] = useState('');
  const [consultantSort, setConsultantSort] = useState<SortState>({
    column: 'updatedAt',
    direction: 'desc',
  });

  const [newUserForm, setNewUserForm] = useState(() => createEmptyAddForm('一般ユーザー', '面談準備中'));

  const [newConsultantForm, setNewConsultantForm] = useState(() => createEmptyAddForm('キャリアコンサルタント', 'アクティブ'));

  const [userCsvState, setUserCsvState] = useState<CsvState>({
    fileName: 'user_accounts.csv',
    preview: [
      { id: 'USR-2026-401', lastName: '高橋', firstName: '洋介', lastNameKana: 'タカハシ', firstNameKana: 'ヨウスケ', name: '高橋 洋介', nameKana: 'タカハシ ヨウスケ', email: 'y.takahashi@example.com', company: 'Career Carte Inc.', department: 'Marketing', role: 'Marketing Manager', permission: '一般ユーザー' },
      { id: 'USR-2026-402', lastName: '吉田', firstName: '里奈', lastNameKana: 'ヨシダ', firstNameKana: 'リナ', name: '吉田 里奈', nameKana: 'ヨシダ リナ', email: 'rina.yoshida@example.com', company: 'Career Carte Inc.', department: 'Human Resources', role: 'HR Manager', permission: '一般ユーザー' },
    ],
  });
  const [consultantCsvState, setConsultantCsvState] = useState<CsvState>({
    fileName: 'consultant_accounts.csv',
    preview: [
      { id: 'CNS-2026-405', lastName: '大谷', firstName: '翼', lastNameKana: 'オオタニ', firstNameKana: 'ツバサ', name: '大谷 翼', nameKana: 'オオタニ ツバサ', email: 't.subasa@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: 'Senior Consultant', permission: 'キャリアコンサルタント' },
      { id: 'CNS-2026-406', lastName: '広瀬', firstName: '翔', lastNameKana: 'ヒロセ', firstNameKana: 'ショウ', name: '広瀬 翔', nameKana: 'ヒロセ ショウ', email: 'sho.hirose@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: 'Associate Consultant', permission: 'キャリアコンサルタント' },
    ],
  });
  const [csvModalType, setCsvModalType] = useState<'user' | 'consultant'>('user');

  const [activeSection, setActiveSection] = useState<'user' | 'consultant' | 'tenant'>('user');
  const [demoState, setDemoState] = useState<DemoUserState>(() => loadDemoUserState());
  const [usageQuota, setUsageQuota] = useState<DemoUsageQuota>(() => getDemoUsageQuota());
  const [passwordNotifications, setPasswordNotifications] = useState<DemoPasswordNotification[]>([]);

  useEffect(() => subscribeDemoUsageQuota(setUsageQuota), []);

  const buildTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const getQuotaBackedAccount = (account: AccountRecord): AccountRecord => {
    if (account.id !== DEFAULT_DEMO_USER_ID) return account;
    const apiUsage = getCompanyApiUsageSummary(usageQuota);
    return {
      ...account,
      initialInterviewRemaining: apiUsage.totalLimit,
      continuousInterviewRemaining: apiUsage.remaining,
      initialLlmCallsPerInterview: apiUsage.perMeetingTurnLimit,
      continuousLlmCallsPerInterview: apiUsage.perMeetingTurnLimit,
    };
  };

  const buildEditForm = (account: AccountRecord): AccountEditForm => {
    const apiUsage = getCompanyApiUsageSummary(usageQuota);
    const isDemoUser = account.id === DEFAULT_DEMO_USER_ID;
    return {
      id: account.id,
      lastName: account.lastName,
      firstName: account.firstName,
      lastNameKana: account.lastNameKana,
      firstNameKana: account.firstNameKana,
      email: account.email,
      company: account.company,
      department: account.department,
      role: account.role,
      permission: account.permission,
      status: account.status,
      initialInterviewRemaining: (isDemoUser ? apiUsage.totalLimit : account.initialInterviewRemaining).toString(),
      continuousInterviewRemaining: (isDemoUser ? apiUsage.used : account.continuousInterviewRemaining).toString(),
      initialLlmCallsPerInterview: (isDemoUser
        ? apiUsage.perMeetingTurnLimit
        : account.initialLlmCallsPerInterview
      ).toString(),
    };
  };

  const createPasswordNotification = (account: AccountRecord) =>
    buildPasswordNotification({
      accountId: account.id,
      accountName: account.name,
      email: account.email,
      roleLabel: account.permission,
    });

  const appendPasswordNotifications = (accounts: AccountRecord[]) => {
    if (accounts.length === 0) return;
    const nextNotifications = accounts.map(createPasswordNotification);
    setPasswordNotifications((prev) => [...nextNotifications, ...prev]);
  };

  const handleCopyPasswordNotification = async (notification: DemoPasswordNotification) => {
    try {
      await copyTextToClipboard(`${notification.subject}\n\n${notification.body}`);
      toast({
        title: '通知文をコピーしました',
        description: '既存の業務メーラーに貼り付けて通知してください。',
        status: 'success',
        duration: 2400,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'コピーに失敗しました',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

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
          account.id + account.name + account.nameKana + account.email + account.company + account.department + account.role + account.permission;
        const matchesQuery = keyword.toLowerCase().includes(userQuery.toLowerCase());
        return matchesQuery;
      })
      .sort(getComparator(userSort));
  }, [userAccounts, userQuery, userSort]);

  const filteredConsultantAccounts = useMemo(() => {
    return consultantAccounts
      .filter((account) => {
        const keyword =
          account.id + account.name + account.nameKana + account.email + account.company + account.department + account.role + account.permission;
        const matchesQuery = keyword.toLowerCase().includes(consultantQuery.toLowerCase());
        return matchesQuery;
      })
      .sort(getComparator(consultantSort));
  }, [consultantAccounts, consultantQuery, consultantSort]);

  const permissionOptions = ['一般ユーザー', '企業管理者', 'キャリアコンサルタント', 'システム管理者'];

  const filteredUserIds = filteredUserAccounts.map((account) => account.id);
  const filteredConsultantIds = filteredConsultantAccounts.map((account) => account.id);
  const allFilteredUsersSelected =
    filteredUserIds.length > 0 && filteredUserIds.every((id) => selectedUserIds.includes(id));
  const allFilteredConsultantsSelected =
    filteredConsultantIds.length > 0 &&
    filteredConsultantIds.every((id) => selectedConsultantIds.includes(id));

  const handleAddUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUserForm.lastName || !newUserForm.firstName || !newUserForm.lastNameKana || !newUserForm.firstNameKana || !newUserForm.email || !newUserForm.company || !newUserForm.permission) {
      toast({
        title: '入力不足',
        description: '姓、名、フリガナ、メール、会社名、権限を入力してください。',
        status: 'warning',
        duration: 2600,
        isClosable: true,
      });
      return;
    }

    const now = new Date();
    const timestamp = buildTimestamp();

    const nextAccount: AccountRecord = {
      id: newUserForm.id || `USR-${now.getFullYear()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')}`,
      name: joinName(newUserForm.lastName, newUserForm.firstName) ?? '',
      lastName: newUserForm.lastName,
      firstName: newUserForm.firstName,
      nameKana: joinNameKana(newUserForm.lastNameKana, newUserForm.firstNameKana) ?? '',
      lastNameKana: newUserForm.lastNameKana,
      firstNameKana: newUserForm.firstNameKana,
      email: newUserForm.email,
      company: newUserForm.company || 'Unassigned',
      department: newUserForm.department || '未設定',
      role: newUserForm.role || 'Candidate',
      permission: newUserForm.permission || '一般ユーザー',
      status: newUserForm.status,
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: 0,
      initialInterviewRemaining: 10,
      continuousInterviewRemaining: 10,
      initialLlmCallsPerInterview: 10,
      continuousLlmCallsPerInterview: 7,
    };

    setUserAccounts((prev) => [nextAccount, ...prev]);
    appendPasswordNotifications([nextAccount]);

    setNewUserForm(createEmptyAddForm('一般ユーザー', '面談準備中'));
    toast({
      title: 'アカウントを追加しました',
      description: '一時パスワード通知文を一覧に作成しました。',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
  };

  const handleAddConsultant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newConsultantForm.lastName || !newConsultantForm.firstName || !newConsultantForm.lastNameKana || !newConsultantForm.firstNameKana || !newConsultantForm.email || !newConsultantForm.company || !newConsultantForm.permission) {
      toast({
        title: '入力不足',
        description: '姓、名、フリガナ、メール、会社名、権限を入力してください。',
        status: 'warning',
        duration: 2600,
        isClosable: true,
      });
      return;
    }

    const now = new Date();
    const timestamp = buildTimestamp();

    const nextAccount: AccountRecord = {
      id: newConsultantForm.id || `CNS-${now.getFullYear()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')}`,
      name: joinName(newConsultantForm.lastName, newConsultantForm.firstName) ?? '',
      lastName: newConsultantForm.lastName,
      firstName: newConsultantForm.firstName,
      nameKana: joinNameKana(newConsultantForm.lastNameKana, newConsultantForm.firstNameKana) ?? '',
      lastNameKana: newConsultantForm.lastNameKana,
      firstNameKana: newConsultantForm.firstNameKana,
      email: newConsultantForm.email,
      company: newConsultantForm.company || 'Career Carte Inc.',
      department: newConsultantForm.department || 'Career Consulting',
      role: newConsultantForm.role || 'Consultant',
      permission: newConsultantForm.permission || 'キャリアコンサルタント',
      status: newConsultantForm.status,
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: 0,
      initialInterviewRemaining: 10,
      continuousInterviewRemaining: 10,
      initialLlmCallsPerInterview: 10,
      continuousLlmCallsPerInterview: 7,
    };

    setConsultantAccounts((prev) => [nextAccount, ...prev]);
    appendPasswordNotifications([nextAccount]);

    setNewConsultantForm(createEmptyAddForm('キャリアコンサルタント', 'アクティブ'));
    toast({
      title: 'コンサルタントアカウントを追加しました',
      description: '一時パスワード通知文を一覧に作成しました。',
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
            { id: 'USR-2026-041', lastName: '中村', firstName: '愛', lastNameKana: 'ナカムラ', firstNameKana: 'アイ', name: '中村 愛', nameKana: 'ナカムラ アイ', email: 'ai.nakamura@example.com', company: 'Career Carte Inc.', department: 'Customer Success', role: 'CS Lead', permission: '一般ユーザー' },
            { id: 'USR-2026-042', lastName: '小林', firstName: '真', lastNameKana: 'コバヤシ', firstNameKana: 'マコト', name: '小林 真', nameKana: 'コバヤシ マコト', email: 'makoto.kobayashi@example.com', company: 'Career Carte Inc.', department: 'Sales', role: 'Sales', permission: '一般ユーザー' },
          ]
        : [
            { id: 'CNS-2026-407', lastName: '石井', firstName: '拓', lastNameKana: 'イシイ', firstNameKana: 'タク', name: '石井 拓', nameKana: 'イシイ タク', email: 'taku.ishii@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: 'Lead Consultant', permission: 'キャリアコンサルタント' },
            { id: 'CNS-2026-408', lastName: '森本', firstName: '莉子', lastNameKana: 'モリモト', firstNameKana: 'リコ', name: '森本 莉子', nameKana: 'モリモト リコ', email: 'riko.morimoto@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: 'Consultant', permission: 'キャリアコンサルタント' },
          ];

    if (csvModalType === 'user') {
      setUserCsvState({ fileName: file.name, preview: nextPreview });
    } else {
      setConsultantCsvState({ fileName: file.name, preview: nextPreview });
    }
  };

  const handleCsvConfirm = () => {
    const targetLabel = csvModalType === 'user' ? 'ユーザー' : 'コンサルタント';
    const timestamp = buildTimestamp();
    const previewRecords = csvModalType === 'user' ? userCsvState.preview : consultantCsvState.preview;
    const nextAccounts: AccountRecord[] = previewRecords.map((record) => ({
      id: record.id,
      name: record.name,
      lastName: record.lastName,
      firstName: record.firstName,
      nameKana: record.nameKana,
      lastNameKana: record.lastNameKana,
      firstNameKana: record.firstNameKana,
      email: record.email,
      company: record.company,
      department: record.department,
      role: record.role,
      permission: record.permission,
      status: csvModalType === 'user' ? '面談準備中' : 'アクティブ',
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: 0,
      initialInterviewRemaining: 10,
      continuousInterviewRemaining: 10,
      initialLlmCallsPerInterview: 10,
      continuousLlmCallsPerInterview: 7,
    }));

    if (csvModalType === 'user') {
      setUserAccounts((prev) => [...nextAccounts, ...prev]);
    } else {
      setConsultantAccounts((prev) => [...nextAccounts, ...prev]);
    }
    appendPasswordNotifications(nextAccounts);

    toast({
      title: `${targetLabel}CSVアップロード`,
      description: `${nextAccounts.length}件を登録し、一時パスワード通知文を一覧に作成しました。`,
      status: 'success',
      duration: 2800,
      isClosable: true,
    });
    csvModalDisclosure.onClose();
  };

  const activeCsvState = csvModalType === 'user' ? userCsvState : consultantCsvState;

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
      department: '',
      role: '',
      permission: '',
      status: '',
      initialInterviewRemaining: '',
      continuousInterviewRemaining: '',
      initialLlmCallsPerInterview: '',
    });
    bulkEditDisclosure.onOpen();
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAccount || !editTarget) return;

    const initialRemainingValue = Number(editForm.initialInterviewRemaining);
    const continuousRemainingValue = Number(editForm.continuousInterviewRemaining);
    const initialLlmValue = Number(editForm.initialLlmCallsPerInterview);

    if (
      Number.isNaN(initialRemainingValue) ||
      Number.isNaN(continuousRemainingValue) ||
      Number.isNaN(initialLlmValue) ||
      initialRemainingValue < 0 ||
      continuousRemainingValue < 0 ||
      initialLlmValue <= 0
    ) {
      toast({
        title: '入力値が正しくありません',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    if (editTarget === 'user' && editingAccount.id === DEFAULT_DEMO_USER_ID) {
      updateDemoUsageQuota({
        totalLimit: initialRemainingValue,
        used: continuousRemainingValue,
        perMeetingTurnLimit: initialLlmValue,
      });
    }

    const nextTimestamp = buildTimestamp();
    const applyUpdate = (accounts: AccountRecord[]) =>
      accounts.map((account) =>
        account.id === editingAccount.id
          ? {
	            ...account,
	              id: editForm.id,
	              name: joinName(editForm.lastName, editForm.firstName) ?? '',
	              lastName: editForm.lastName,
	              firstName: editForm.firstName,
	              nameKana: joinNameKana(editForm.lastNameKana, editForm.firstNameKana) ?? '',
	              lastNameKana: editForm.lastNameKana,
	              firstNameKana: editForm.firstNameKana,
	              email: editForm.email,
              company: editForm.company,
              department: editForm.department,
              role: editForm.role,
              permission: editForm.permission,
              status: editForm.status,
              initialInterviewRemaining: initialRemainingValue,
              continuousInterviewRemaining: continuousRemainingValue,
              initialLlmCallsPerInterview: initialLlmValue,
              continuousLlmCallsPerInterview: initialLlmValue,
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

    const initialRemainingValue =
      bulkForm.initialInterviewRemaining.trim() === ''
        ? null
        : Number(bulkForm.initialInterviewRemaining);
    const continuousRemainingValue =
      bulkForm.continuousInterviewRemaining.trim() === ''
        ? null
        : Number(bulkForm.continuousInterviewRemaining);
    const llmValue =
      bulkForm.initialLlmCallsPerInterview.trim() === '' ? null : Number(bulkForm.initialLlmCallsPerInterview);

    if (
      (initialRemainingValue !== null &&
        (Number.isNaN(initialRemainingValue) || initialRemainingValue < 0)) ||
      (continuousRemainingValue !== null &&
        (Number.isNaN(continuousRemainingValue) || continuousRemainingValue < 0)) ||
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

    if (bulkTarget === 'user' && selectedIds.includes(DEFAULT_DEMO_USER_ID)) {
      updateDemoUsageQuota({
        ...(initialRemainingValue !== null ? { totalLimit: initialRemainingValue } : {}),
        ...(continuousRemainingValue !== null ? { used: continuousRemainingValue } : {}),
        ...(llmValue !== null ? { perMeetingTurnLimit: llmValue } : {}),
      });
    }

    const nextTimestamp = buildTimestamp();
    const applyUpdate = (accounts: AccountRecord[]) =>
      accounts.map((account) => {
        if (!selectedIds.includes(account.id)) return account;
        return {
          ...account,
          company: bulkForm.company.trim() === '' ? account.company : bulkForm.company,
          department: bulkForm.department.trim() === '' ? account.department : bulkForm.department,
          role: bulkForm.role.trim() === '' ? account.role : bulkForm.role,
          permission: bulkForm.permission.trim() === '' ? account.permission : bulkForm.permission,
          status: bulkForm.status.trim() === '' ? account.status : bulkForm.status,
          initialInterviewRemaining: initialRemainingValue ?? account.initialInterviewRemaining,
          continuousInterviewRemaining:
            continuousRemainingValue ?? account.continuousInterviewRemaining,
          initialLlmCallsPerInterview: llmValue ?? account.initialLlmCallsPerInterview,
          continuousLlmCallsPerInterview: llmValue ?? account.continuousLlmCallsPerInterview,
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
    appendPasswordNotifications([account]);
    toast({
      title: '一時パスワードを発行しました',
      description: '通知文一覧からコピーし、既存の業務メーラーで通知してください。',
      status: 'info',
      duration: 2600,
      isClosable: true,
    });
  };

  const handleTenantStressToggle = (tenantId: string, isChecked: boolean) => {
    const nextState = updateTenantFeatureFlags(demoState, tenantId, { stressAnalysisEnabled: isChecked });
    setDemoState(nextState);
    saveDemoUserState(nextState);
    toast({
      title: isChecked ? '緊張度スコア表示を有効にしました' : '緊張度スコア表示を無効にしました',
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  return (
    <Box bgGradient={adminPageBg} color="white" maxH="100dvh" py={12} overflowY="scroll">
      <Container maxW="7xl">
        <Stack spacing={10}>
          <Box {...linePanelProps} px={{ base: 6, lg: 10 }} py={8}>
            <Stack spacing={3}>
              <Heading
                size="lg"
                bgGradient="linear(110deg, #f8fafc, #cbd5e1, #f1f5f9, #94a3b8)"
                bgClip="text"
                sx={{
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 1px 0 rgba(255, 255, 255, 0.24), 0 -1px 0 rgba(15, 23, 42, 0.55)',
                }}
              >
                システム管理コンソール
              </Heading>
              <Text color="whiteAlpha.800">
                PC向けレイアウトでアカウントとCSV一括登録を集中管理します。絞り込み検索や並び替えは表の上部から操作できます。
              </Text>
              <Text color="whiteAlpha.700" fontSize="sm">
                最終更新: {new Date().toLocaleString('ja-JP')}
              </Text>
            </Stack>
            <Flex mt={6} gap={3} wrap="wrap">
              <Button
                variant={activeSection === 'user' ? 'solid' : 'outline'}
                colorScheme={activeSection === 'user' ? 'blue' : undefined}
                color={activeSection === 'user' ? undefined : 'white'}
                borderColor={activeSection === 'user' ? undefined : 'whiteAlpha.500'}
                _hover={activeSection === 'user' ? undefined : { bg: 'whiteAlpha.160' }}
                onClick={() => setActiveSection('user')}
              >
                ユーザーアカウント管理
              </Button>
              <Button
                variant={activeSection === 'consultant' ? 'solid' : 'outline'}
                colorScheme={activeSection === 'consultant' ? 'green' : undefined}
                color={activeSection === 'consultant' ? undefined : 'white'}
                borderColor={activeSection === 'consultant' ? undefined : 'whiteAlpha.500'}
                _hover={activeSection === 'consultant' ? undefined : { bg: 'whiteAlpha.160' }}
                onClick={() => setActiveSection('consultant')}
              >
                コンサルアカウント管理
              </Button>
              <Button
                variant={activeSection === 'tenant' ? 'solid' : 'outline'}
                colorScheme={activeSection === 'tenant' ? 'blue' : undefined}
                color={activeSection === 'tenant' ? undefined : 'white'}
                borderColor={activeSection === 'tenant' ? undefined : 'whiteAlpha.500'}
                _hover={activeSection === 'tenant' ? undefined : { bg: 'whiteAlpha.160' }}
                onClick={() => setActiveSection('tenant')}
              >
                企業別オプション管理
              </Button>
            </Flex>
          </Box>

          <Box {...linePanelProps} p={{ base: 6, lg: 8 }}>
            <Stack spacing={4}>
              <Flex justify="space-between" gap={3} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                <Stack spacing={1}>
                  <Heading size="md">パスワード通知文一覧</Heading>
                  <Text color="whiteAlpha.800" fontSize="sm">
                    アプリ内で発行した一時パスワードの通知文です。コピーして既存の業務メーラーで通知してください。
                  </Text>
                </Stack>
                <Badge alignSelf={{ base: 'flex-start', md: 'center' }} colorScheme={passwordNotifications.length > 0 ? 'blue' : 'gray'}>
                  {passwordNotifications.length}件
                </Badge>
              </Flex>
              {passwordNotifications.length === 0 ? (
                <Text color="whiteAlpha.700" fontSize="sm">
                  まだ通知文はありません。アカウント追加、CSV一括追加、または一覧の再発行から作成できます。
                </Text>
              ) : (
                <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="0" overflowX="auto" bg="whiteAlpha.100">
                  <Table size="sm">
                    <Thead bg="whiteAlpha.160">
                      <Tr>
                        <Th>発行日時</Th>
                        <Th>ID</Th>
                        <Th>氏名</Th>
                        <Th>メール</Th>
                        <Th>権限</Th>
                        <Th>一時パスワード</Th>
                        <Th>通知文</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {passwordNotifications.map((notification) => (
                        <Tr key={notification.id}>
                          <Td>{notification.issuedAt}</Td>
                          <Td fontWeight="semibold">{notification.accountId}</Td>
                          <Td>{notification.accountName}</Td>
                          <Td>{notification.email}</Td>
                          <Td>{notification.roleLabel}</Td>
                          <Td fontFamily="mono">{notification.temporaryPassword}</Td>
                          <Td>
                            <Button size="xs" {...tableActionButtonProps} onClick={() => handleCopyPasswordNotification(notification)}>
                              通知文をコピー
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Stack>
          </Box>

          <Box
            {...linePanelProps}
            p={{ base: 6, lg: 8 }}
            display={activeSection === 'user' ? 'block' : 'none'}
          >
            <Stack spacing={8}>
              <Stack spacing={3}>
                <Heading size="md">アカウント管理（ユーザー）</Heading>
                <Text color="whiteAlpha.800">ユーザーアカウント専用の一覧。Excelライクな表で状態を確認できます。</Text>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                  <Input
                    placeholder="ID / 氏名 / フリガナ / メール / 会社名 / 部署 / 職種 / 権限 で検索"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                  <Button
                    width={{ md: '240px' }}
                    size="md"
                    variant="outline"
                    color="white"
                    borderColor="whiteAlpha.500"
                    _hover={{ bg: 'whiteAlpha.160' }}
                    onClick={() => handleSelectAll('user')}
                  >
                    {allFilteredUsersSelected ? '選択解除' : '全ての行を選択'}
                  </Button>
                </Flex>
              </Stack>

              {selectedUserIds.length > 0 && (
                <Box border="1px solid" borderColor="whiteAlpha.200" borderRadius="0" bg="whiteAlpha.140" p={4}>
                  <Flex direction={{ base: 'column', md: 'row' }} gap={3} align="center">
                    <Text fontWeight="semibold">選択中: {selectedUserIds.length}件</Text>
                    <Flex gap={2} wrap="wrap">
                      <PrimaryButton size="sm" onClick={() => openBulkEditModal('user')}>
                        全て編集
                      </PrimaryButton>
                      <Button
                        size="sm"
                          {...outlineLightButtonProps}
                          colorScheme="red"
                          onClick={() => handleBulkDelete('user')}
                      >
                        全て削除
                      </Button>
                      <Button
                        size="sm"
                          {...outlineLightButtonProps}
                          onClick={() => setSelectedUserIds([])}
                      >
                        選択解除
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )}

              <Box border="1px solid" borderColor="whiteAlpha.200" borderRadius="0" overflowX="auto" bg="whiteAlpha.100">
                <Table size="sm" variant="simple">
                  <Thead bg="whiteAlpha.160">
                    <Tr>
                      <Th>選択</Th>
                      <Th>
                        <SortButton onSort={handleSort} label="ID" target="user" column="id" />
                      </Th>
	                      <Th>
	                        <SortButton onSort={handleSort} label="氏名" target="user" column="name" />
	                      </Th>
	                      <Th>フリガナ</Th>
                      <Th>
                        <SortButton onSort={handleSort} label="メール" target="user" column="email" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="会社名" target="user" column="company" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="部署" target="user" column="department" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="職種" target="user" column="role" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="権限" target="user" column="permission" />
                      </Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredUserAccounts.map((rawAccount) => {
                      const account = getQuotaBackedAccount(rawAccount);
                      return (
                      <Tr
                        key={account.id}
                        bg={selectedUserIds.includes(account.id) ? 'whiteAlpha.200' : 'transparent'}
                        _hover={{
                          bg: 'whiteAlpha.160',
                        }}
                        _focusWithin={{
                          bg: selectedUserIds.includes(account.id) ? 'whiteAlpha.200' : 'transparent',
                        }}
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
	                          <Text fontWeight="semibold">{account.name}</Text>
	                        </Td>
	                        <Td>{account.nameKana || '未設定'}</Td>
                        <Td fontSize="sm">{account.email}</Td>
                        <Td>{account.company}</Td>
                        <Td>{account.department}</Td>
                        <Td>{account.role}</Td>
                        <Td><Badge colorScheme="blue">{account.permission}</Badge></Td>
                        <Td>
                          <Stack direction="row" spacing={2}>
                            <Button
                              size="xs"
                              {...tableActionButtonProps}
                              onClick={() => openEditModal('user', account)}
                            >
                              編集
                            </Button>
                            <Button
                              size="xs"
                              {...tableActionButtonProps}
                              onClick={() => handlePasswordReset(account)}
                            >
                              再発行
                            </Button>
                          </Stack>
                        </Td>
                      </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>

              <Box>
                <Button
                  mt={3}
                  size="lg"
                  w="full"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.500"
                  _hover={{ bg: 'whiteAlpha.160' }}
                  onClick={userAddDisclosure.onToggle}
                >
                  {userAddDisclosure.isOpen ? '追加フォームを閉じる' : 'ユーザーアカウントを追加'}
                </Button>
                <Collapse in={userAddDisclosure.isOpen} animateOpacity>
                  <Box
                    mt={4}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="0"
                    p={6}
                    bg="whiteAlpha.080"
                  >
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                      <Box>
                        <form onSubmit={handleAddUser}>
                          <Stack spacing={4}>
                            <Heading size="sm" display="flex" alignItems="center" gap={2}>
                              <FiPlus /> 個別追加
                            </Heading>
                            <FormControl>
                              <FormLabel>ID</FormLabel>
                              <Input
                                value={newUserForm.id}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, id: event.target.value }))
                                }
                              />
                            </FormControl>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                              <FormControl isRequired>
                                <FormLabel>姓</FormLabel>
                                <Input value={newUserForm.lastName} onChange={(event) => setNewUserForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>名</FormLabel>
                                <Input value={newUserForm.firstName} onChange={(event) => setNewUserForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>フリガナ（姓）</FormLabel>
                                <Input value={newUserForm.lastNameKana} onChange={(event) => setNewUserForm((prev) => ({ ...prev, lastNameKana: event.target.value }))} />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>フリガナ（名）</FormLabel>
                                <Input value={newUserForm.firstNameKana} onChange={(event) => setNewUserForm((prev) => ({ ...prev, firstNameKana: event.target.value }))} />
                              </FormControl>
                            </SimpleGrid>
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
                              <FormLabel>部署</FormLabel>
                              <Input
                                value={newUserForm.department}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, department: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>職種</FormLabel>
                              <Input
                                value={newUserForm.role}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, role: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>権限</FormLabel>
                              <Select
                                value={newUserForm.permission}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, permission: event.target.value }))
                                }
                              >
                                {permissionOptions.map((permission) => (
                                  <option key={permission} value={permission}>
                                    {permission}
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                            <PrimaryButton type="submit" alignSelf="flex-start">
                              登録
                            </PrimaryButton>
                          </Stack>
                        </form>
                      </Box>
                      <Box>
                        <Stack spacing={4}>
                          <Heading size="sm" display="flex" alignItems="center" gap={2}>
                            <FiUpload /> CSV一括追加
                          </Heading>
                          <Text color="whiteAlpha.800">
                            CSVをアップロードして内容を確認後、一括登録を実行します。ヘッダーは
                            <strong> ID, LastName, FirstName, LastNameKana, FirstNameKana, Email, Company, Permission </strong>
                            の順で設定してください。
                          </Text>
                          <Button
                            {...outlineLightButtonProps}
                            leftIcon={<FiFileText />}
                            onClick={() => openCsvModal('user')}
                          >
                            CSV確認モーダルを開く
                          </Button>
                          <Text fontSize="sm" color="whiteAlpha.700">
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
            {...linePanelProps}
            p={{ base: 6, lg: 8 }}
            display={activeSection === 'consultant' ? 'block' : 'none'}
          >
            <Stack spacing={8}>
              <Stack spacing={3}>
                <Heading size="md">アカウント管理（コンサルタント）</Heading>
                <Text color="whiteAlpha.800">
                  コンサルタント向けアカウント。ユーザー一覧とは完全に分離しています。
                </Text>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                  <Input
                    placeholder="ID / 氏名 / フリガナ / メール / 会社名 / 部署 / 職種 / 権限 で検索"
                    value={consultantQuery}
                    onChange={(event) => setConsultantQuery(event.target.value)}
                  />
                  <Button
                    width={{ md: '240px' }}
                    size="md"
                    variant="outline"
                    color="white"
                    borderColor="whiteAlpha.500"
                    _hover={{ bg: 'whiteAlpha.160' }}
                    onClick={() => handleSelectAll('consultant')}
                  >
                    {allFilteredConsultantsSelected ? '選択解除' : '全ての行を選択'}
                  </Button>
                </Flex>
              </Stack>

              {selectedConsultantIds.length > 0 && (
                <Box
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="0"
                  bg="whiteAlpha.140"
                  p={4}
                >
                  <Flex direction={{ base: 'column', md: 'row' }} gap={3} align="center">
                    <Text fontWeight="semibold">選択中: {selectedConsultantIds.length}件</Text>
                    <Flex gap={2} wrap="wrap">
                      <PrimaryButton size="sm" onClick={() => openBulkEditModal('consultant')}>
                        全て編集
                      </PrimaryButton>
                      <Button
                        size="sm"
                        {...outlineLightButtonProps}
                        colorScheme="red"
                        onClick={() => handleBulkDelete('consultant')}
                      >
                        全て削除
                      </Button>
                      <Button
                        size="sm"
                        {...outlineLightButtonProps}
                        onClick={() => setSelectedConsultantIds([])}
                      >
                        選択解除
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )}

              <Box border="1px solid" borderColor="whiteAlpha.200" borderRadius="0" overflowX="auto" bg="whiteAlpha.100">
                <Table size="sm" variant="simple">
                  <Thead bg="whiteAlpha.160">
                    <Tr>
                      <Th>選択</Th>
                      <Th>
                        <SortButton onSort={handleSort} label="ID" target="consultant" column="id" />
                      </Th>
	                      <Th>
	                        <SortButton onSort={handleSort} label="氏名" target="consultant" column="name" />
	                      </Th>
	                      <Th>フリガナ</Th>
                      <Th>
                        <SortButton onSort={handleSort} label="メール" target="consultant" column="email" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="会社名" target="consultant" column="company" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="部署" target="consultant" column="department" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="職種" target="consultant" column="role" />
                      </Th>
                      <Th>
                        <SortButton onSort={handleSort} label="権限" target="consultant" column="permission" />
                      </Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredConsultantAccounts.map((account) => (
                      <Tr
                        key={account.id}
                        bg={selectedConsultantIds.includes(account.id) ? 'whiteAlpha.200' : 'transparent'}
                        _hover={{
                          bg: 'whiteAlpha.160',
                        }}
                        _focusWithin={{
                          bg: selectedConsultantIds.includes(account.id) ? 'whiteAlpha.200' : 'transparent',
                        }}
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
	                          <Text fontWeight="semibold">{account.name}</Text>
	                        </Td>
	                        <Td>{account.nameKana || '未設定'}</Td>
                        <Td fontSize="sm">{account.email}</Td>
                        <Td>{account.company}</Td>
                        <Td>{account.department}</Td>
                        <Td>{account.role}</Td>
                        <Td><Badge colorScheme="purple">{account.permission}</Badge></Td>
                        <Td>
                          <Stack direction="row" spacing={2}>
                            <Button
                              size="xs"
                              {...tableActionButtonProps}
                              onClick={() => openEditModal('consultant', account)}
                            >
                              編集
                            </Button>
                            <Button
                              size="xs"
                              {...tableActionButtonProps}
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
                  color="white"
                  borderColor="whiteAlpha.500"
                  _hover={{ bg: 'whiteAlpha.160' }}
                  onClick={consultantAddDisclosure.onToggle}
                >
                  {consultantAddDisclosure.isOpen ? '追加フォームを閉じる' : 'コンサルタントアカウントを追加'}
                </Button>
                <Collapse in={consultantAddDisclosure.isOpen} animateOpacity>
                  <Box
                    mt={4}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="0"
                    p={6}
                    bg="whiteAlpha.080"
                  >
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                      <Box>
                        <form onSubmit={handleAddConsultant}>
                          <Stack spacing={4}>
                            <Heading size="sm" display="flex" alignItems="center" gap={2}>
                              <FiPlus /> 個別追加
                            </Heading>
                            <FormControl>
                              <FormLabel>ID</FormLabel>
                              <Input
                                value={newConsultantForm.id}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, id: event.target.value }))
                                }
                              />
                            </FormControl>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                              <FormControl isRequired>
                                <FormLabel>姓</FormLabel>
                                <Input value={newConsultantForm.lastName} onChange={(event) => setNewConsultantForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>名</FormLabel>
                                <Input value={newConsultantForm.firstName} onChange={(event) => setNewConsultantForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>フリガナ（姓）</FormLabel>
                                <Input value={newConsultantForm.lastNameKana} onChange={(event) => setNewConsultantForm((prev) => ({ ...prev, lastNameKana: event.target.value }))} />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>フリガナ（名）</FormLabel>
                                <Input value={newConsultantForm.firstNameKana} onChange={(event) => setNewConsultantForm((prev) => ({ ...prev, firstNameKana: event.target.value }))} />
                              </FormControl>
                            </SimpleGrid>
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
                              <FormLabel>部署</FormLabel>
                              <Input
                                value={newConsultantForm.department}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, department: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>職種</FormLabel>
                              <Input
                                value={newConsultantForm.role}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, role: event.target.value }))
                                }
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>権限</FormLabel>
                              <Select
                                value={newConsultantForm.permission}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, permission: event.target.value }))
                                }
                              >
                                {permissionOptions.map((permission) => (
                                  <option key={permission} value={permission}>
                                    {permission}
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                            <PrimaryButton type="submit" alignSelf="flex-start">
                              登録
                            </PrimaryButton>
                          </Stack>
                        </form>
                      </Box>
                      <Box>
                        <Stack spacing={4}>
                          <Heading size="sm" display="flex" alignItems="center" gap={2}>
                            <FiUpload /> CSV一括追加
                          </Heading>
                          <Text color="whiteAlpha.800">
                            CSVアップロードで複数のコンサルタントを同時に登録します。会社名、部署、職種、権限もCSVに含められます。
                          </Text>
                          <Button
                            {...outlineLightButtonProps}
                            leftIcon={<FiFileText />}
                            onClick={() => openCsvModal('consultant')}
                          >
                            CSV確認モーダルを開く
                          </Button>
                          <Text fontSize="sm" color="whiteAlpha.700">
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

          <Box
            {...linePanelProps}
            p={{ base: 6, lg: 8 }}
            display={activeSection === 'tenant' ? 'block' : 'none'}
          >
            <Stack spacing={6}>
              <Stack spacing={3}>
                <Heading size="md">企業別オプション管理</Heading>
                <Text color="whiteAlpha.800">
                  企業テナントごとに、面談前コンディションチェックと緊張度スコア表示の有効/無効を切り替えます。
                </Text>
              </Stack>
              <Box border="1px solid" borderColor="whiteAlpha.200" borderRadius="0" overflowX="auto" bg="whiteAlpha.100">
                <Table size="sm" variant="simple">
                  <Thead bg="whiteAlpha.160">
                    <Tr>
                      <Th>tenantId</Th>
                      <Th>企業名</Th>
                      <Th>プラン</Th>
                      <Th>ステータス</Th>
                      <Th>緊張度スコア表示</Th>
                      <Th>ターンテイキング</Th>
                      <Th>ライトテーマ</Th>
                      <Th>測定件数</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {demoState.tenants.map((tenant) => {
                      const flags = getTenantFeatureFlags(demoState, tenant.id);
                      const conditionCount = demoState.conditionRecords.filter((record) => record.tenantId === tenant.id).length;
                      return (
                        <Tr key={tenant.id}>
                          <Td fontWeight="medium">{tenant.id}</Td>
                          <Td>{tenant.name}</Td>
                          <Td>{tenant.plan}</Td>
                          <Td>
                            <Badge colorScheme={tenant.status === 'active' ? 'green' : 'gray'}>
                              {tenant.status}
                            </Badge>
                          </Td>
                          <Td>
                            <Checkbox
                              isChecked={flags.stressAnalysisEnabled}
                              onChange={(event) => handleTenantStressToggle(tenant.id, event.target.checked)}
                            >
                              {flags.stressAnalysisEnabled ? 'ON' : 'OFF'}
                            </Checkbox>
                          </Td>
                          <Td>
                            <Badge colorScheme={flags.turnTakingEnabled ? 'purple' : 'gray'}>
                              {flags.turnTakingEnabled ? 'ON' : 'OFF'}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={flags.lightThemeEnabled ? 'blue' : 'gray'}>
                              {flags.lightThemeEnabled ? 'ON' : 'OFF'}
                            </Badge>
                          </Td>
                          <Td>{conditionCount}件</Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
              <Text fontSize="sm" color="whiteAlpha.700">
                デモ版では localStorage の featureFlags を更新します。本番ではサーバー側セッションの tenantId と契約情報から判定します。
              </Text>
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
	                      <Th>フリガナ</Th>
                      <Th>メール</Th>
                      <Th>会社名</Th>
                      <Th>部署</Th>
                      <Th>職種</Th>
                      <Th>権限</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {activeCsvState.preview.map((record) => (
                      <Tr key={record.id}>
	                        <Td>{record.id}</Td>
	                        <Td>{record.name}</Td>
	                        <Td>{record.nameKana}</Td>
                        <Td>{record.email}</Td>
                        <Td>{record.company}</Td>
                        <Td>{record.department}</Td>
                        <Td>{record.role}</Td>
                        <Td>{record.permission}</Td>
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
            <PrimaryButton leftIcon={<FiFileText />} onClick={handleCsvConfirm}>
              登録を実行
            </PrimaryButton>
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
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>ID</FormLabel>
                      <Input
                        value={editForm.id}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, id: event.target.value }))
                        }
                      />
                    </FormControl>
	                    <FormControl isRequired>
	                      <FormLabel>姓</FormLabel>
	                      <Input value={editForm.lastName} onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))} />
	                    </FormControl>
	                    <FormControl isRequired>
	                      <FormLabel>名</FormLabel>
	                      <Input value={editForm.firstName} onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))} />
	                    </FormControl>
	                    <FormControl isRequired>
	                      <FormLabel>フリガナ（姓）</FormLabel>
	                      <Input value={editForm.lastNameKana} onChange={(event) => setEditForm((prev) => ({ ...prev, lastNameKana: event.target.value }))} />
	                    </FormControl>
	                    <FormControl isRequired>
	                      <FormLabel>フリガナ（名）</FormLabel>
	                      <Input value={editForm.firstNameKana} onChange={(event) => setEditForm((prev) => ({ ...prev, firstNameKana: event.target.value }))} />
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
                      <FormLabel>部署</FormLabel>
                      <Input
                        value={editForm.department}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, department: event.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>職種</FormLabel>
                      <Input
                        value={editForm.role}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, role: event.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>権限</FormLabel>
                      <Select
                        value={editForm.permission}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, permission: event.target.value }))
                        }
                      >
                        {permissionOptions.map((permission) => (
                          <option key={permission} value={permission}>
                            {permission}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  <Divider />
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>企業API総回数</FormLabel>
                      <Input
                        type="number"
                        min="0"
                        value={editForm.initialInterviewRemaining}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            initialInterviewRemaining: event.target.value,
                          }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>企業API使用済み回数</FormLabel>
                      <Input
                        type="number"
                        min="0"
                        value={editForm.continuousInterviewRemaining}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            continuousInterviewRemaining: event.target.value,
                          }))
                        }
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>面談1回あたり最大ターン数</FormLabel>
                      <Input
                        type="number"
                        min="1"
                        value={editForm.initialLlmCallsPerInterview}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            initialLlmCallsPerInterview: event.target.value,
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
            <PrimaryButton type="submit">
              変更を保存
            </PrimaryButton>
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
                  <FormLabel>部署</FormLabel>
                  <Input
                    placeholder="変更しない"
                    value={bulkForm.department}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, department: event.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>職種</FormLabel>
                  <Input
                    placeholder="変更しない"
                    value={bulkForm.role}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>権限</FormLabel>
                  <Select
                    value={bulkForm.permission}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, permission: event.target.value }))
                    }
                  >
                    <option value="">変更しない</option>
                    {permissionOptions.map((permission) => (
                      <option key={permission} value={permission}>
                        {permission}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl>
                  <FormLabel>企業API総回数</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    placeholder="変更しない"
                    value={bulkForm.initialInterviewRemaining}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        initialInterviewRemaining: event.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>企業API使用済み回数</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    placeholder="変更しない"
                    value={bulkForm.continuousInterviewRemaining}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        continuousInterviewRemaining: event.target.value,
                      }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>面談1回あたり最大ターン数</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    placeholder="変更しない"
                    value={bulkForm.initialLlmCallsPerInterview}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        initialLlmCallsPerInterview: event.target.value,
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
            <PrimaryButton type="submit">
              一括更新を適用
            </PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Admin;
