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
} from '../lib/demoUsageQuota';
import { DEFAULT_JOB_TITLE, JOB_TITLE_OPTIONS } from '../lib/jobTitles';
import { downloadKarteCsv, downloadKarteCsvBatch, printKartePayloads, type KarteBatchExportPayload } from '../lib/karteExport';
import type { CompanyEmployeeRecord, DemoUserState } from '../types';

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
  karteStatus: string;
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

type TenantQuotaForm = {
  totalLimit: string;
  used: string;
  perMeetingTurnLimit: string;
};

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
    color="#3f3f46"
    _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
    rightIcon={<ChevronDownIcon fontSize="1rem" />}
    onClick={() => onSort(target, column)}
  >
    {label}
  </Button>
);

const adminPageBg = 'linear(135deg, #ffffff 0%, #f7f7f8 52%, #eeeeef 100%)';

const linePanelProps = {
  bg: 'transparent',
  color: '#27272a',
  borderRadius: '0',
  borderWidth: '0',
  position: 'relative',
  boxShadow: '0 28px 80px rgba(63, 63, 70, 0.12)',
  backdropFilter: 'blur(14px)',
  _before: {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: { base: '4px', md: '6px' },
    bgGradient: 'linear(to-r, transparent, rgba(75, 85, 99, 0.62), rgba(31, 41, 55, 0.76), transparent)',
  },
  sx: {
    '& th': { color: 'rgba(63, 63, 70, 0.78)', borderColor: 'rgba(82, 82, 91, 0.18)' },
    '& td': { color: 'rgba(39, 39, 42, 0.90)', borderColor: 'rgba(82, 82, 91, 0.18)' },
    '& .chakra-form__label': { color: 'rgba(39, 39, 42, 0.90)' },
    '& input, & select': {
      background: 'rgba(252, 252, 253, 0.92)',
      color: '#27272a',
      borderColor: 'rgba(82, 82, 91, 0.18)',
    },
  },
} as const;

const outlineLightButtonProps = {
  variant: 'outline',
  color: '#27272a',
  borderColor: 'rgba(82, 82, 91, 0.18)',
  _hover: { bg: 'rgba(82, 82, 91, 0.18)' },
} as const;

const tableActionButtonProps = {
  variant: 'outline',
  color: '#3f3f46',
  borderColor: '#a1a1aa',
  _hover: { bg: 'rgba(82, 82, 91, 0.18)', color: '#27272a', borderColor: '#52525b' },
  _disabled: {
    color: 'rgba(82, 82, 91, 0.42)',
    borderColor: 'rgba(82, 82, 91, 0.18)',
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
  karteStatus: account.karteStatus === '保存済み' ? '保存済み' : '未作成',
  createdAt: timestamp,
  updatedAt: timestamp,
  logs: 0,
  initialInterviewRemaining: 1000,
  continuousInterviewRemaining: 0,
  initialLlmCallsPerInterview: 100,
  continuousLlmCallsPerInterview: 100,
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

const JobTitleSelectOptions = ({ includeNoChange = false }: { includeNoChange?: boolean }) => (
  <>
    {includeNoChange ? <option value="">変更しない</option> : <option value="">選択してください</option>}
    {JOB_TITLE_OPTIONS.map((jobTitle) => (
      <option key={jobTitle} value={jobTitle}>
        {jobTitle}
      </option>
    ))}
  </>
);

const createTenantQuotaForm = (tenantId: string): TenantQuotaForm => {
  const quota = getDemoUsageQuota(tenantId);
  return {
    totalLimit: quota.totalLimit.toString(),
    used: quota.used.toString(),
    perMeetingTurnLimit: quota.perMeetingTurnLimit.toString(),
  };
};

function Admin() {
  const toast = useToast();
  const csvModalDisclosure = useDisclosure();
  const userAddDisclosure = useDisclosure();
  const consultantAddDisclosure = useDisclosure();
  const editModalDisclosure = useDisclosure();
  const bulkEditDisclosure = useDisclosure();

  const [userAccounts, setUserAccounts] = useState<AccountRecord[]>(() =>
    demoAccounts
      .filter((account) => account.role === 'user' || account.role === 'company-admin' || account.role === 'operations-admin')
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
      { id: 'USR-2026-401', lastName: '高橋', firstName: '洋介', lastNameKana: 'タカハシ', firstNameKana: 'ヨウスケ', name: '高橋 洋介', nameKana: 'タカハシ ヨウスケ', email: 'y.takahashi@example.com', company: 'Career Carte Inc.', department: 'Marketing', role: '事務/管理職', permission: '一般ユーザー' },
      { id: 'USR-2026-402', lastName: '吉田', firstName: '里奈', lastNameKana: 'ヨシダ', firstNameKana: 'リナ', name: '吉田 里奈', nameKana: 'ヨシダ リナ', email: 'rina.yoshida@example.com', company: 'Career Carte Inc.', department: 'Human Resources', role: '事務/管理職', permission: '一般ユーザー' },
    ],
  });
  const [consultantCsvState, setConsultantCsvState] = useState<CsvState>({
    fileName: 'consultant_accounts.csv',
    preview: [
      { id: 'CNS-2026-405', lastName: '大谷', firstName: '翼', lastNameKana: 'オオタニ', firstNameKana: 'ツバサ', name: '大谷 翼', nameKana: 'オオタニ ツバサ', email: 't.subasa@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: '専門/資格（弁護士等）職', permission: 'キャリアコンサルタント' },
      { id: 'CNS-2026-406', lastName: '広瀬', firstName: '翔', lastNameKana: 'ヒロセ', firstNameKana: 'ショウ', name: '広瀬 翔', nameKana: 'ヒロセ ショウ', email: 'sho.hirose@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: '専門/資格（弁護士等）職', permission: 'キャリアコンサルタント' },
    ],
  });
  const [csvModalType, setCsvModalType] = useState<'user' | 'consultant'>('user');

  const [activeSection, setActiveSection] = useState<'user' | 'consultant' | 'tenant'>('user');
  const [demoState, setDemoState] = useState<DemoUserState>(() => loadDemoUserState());
  const [tenantQuotaForms, setTenantQuotaForms] = useState<Record<string, TenantQuotaForm>>(() =>
    Object.fromEntries(loadDemoUserState().tenants.map((tenant) => [tenant.id, createTenantQuotaForm(tenant.id)])),
  );
  const [passwordNotifications, setPasswordNotifications] = useState<DemoPasswordNotification[]>([]);

  useEffect(() => {
    let isActive = true;
    const unsubscribers = demoState.tenants.map((tenant) =>
      subscribeDemoUsageQuota((quota) => {
        setTenantQuotaForms((prev) => ({
          ...prev,
          [tenant.id]: {
            totalLimit: quota.totalLimit.toString(),
            used: quota.used.toString(),
            perMeetingTurnLimit: quota.perMeetingTurnLimit.toString(),
          },
        }));
      }, tenant.id),
    );

    queueMicrotask(() => {
      if (!isActive) return;
      setTenantQuotaForms((prev) => ({
        ...Object.fromEntries(demoState.tenants.map((tenant) => [tenant.id, prev[tenant.id] ?? createTenantQuotaForm(tenant.id)])),
      }));
    });

    return () => {
      isActive = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [demoState.tenants]);

  const employeeById = useMemo(
    () => new Map(demoState.companyEmployees.map((employee) => [employee.id, employee])),
    [demoState.companyEmployees],
  );

  const getAccountEmployee = (account: AccountRecord): CompanyEmployeeRecord | null =>
    employeeById.get(account.id) ?? null;

  const buildAccountKartePayload = (account: AccountRecord): KarteBatchExportPayload | null => {
    const employee = getAccountEmployee(account);
    if (!employee?.latestKarte) return null;
    const latestRecord = employee.karteRecords[0] ?? null;
    return {
      karte: employee.latestKarte,
      employeeName: employee.name,
      employeeId: employee.id,
      meta: {
        meetingType: latestRecord?.meetingType ?? null,
        createdAt: latestRecord?.atCreated ?? employee.createdAt,
        updatedAt: latestRecord?.atUpdated ?? employee.updatedAt,
        feedback: latestRecord?.feedback ?? null,
      },
    };
  };

  const buildTimestamp = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const buildEditForm = (account: AccountRecord): AccountEditForm => {
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
      initialInterviewRemaining: account.initialInterviewRemaining.toString(),
      continuousInterviewRemaining: account.continuousInterviewRemaining.toString(),
      initialLlmCallsPerInterview: account.initialLlmCallsPerInterview.toString(),
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

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const compared = valueA.localeCompare(valueB, 'ja');
        if (compared !== 0) return sort.direction === 'asc' ? compared : -compared;
        return 0;
      }

      if (valueA < valueB) return sort.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    };
  };

  const filteredUserAccounts = useMemo(() => {
    return userAccounts
      .map((account) => ({
        ...account,
        karteStatus: employeeById.get(account.id)?.latestKarte ? '保存済み' : '未作成',
      }))
      .filter((account) => {
        const keyword =
          account.id + account.name + account.nameKana + account.email + account.company + account.department + account.role + account.permission + account.karteStatus;
        const matchesQuery = keyword.toLowerCase().includes(userQuery.toLowerCase());
        return matchesQuery;
      })
      .sort(getComparator(userSort));
  }, [employeeById, userAccounts, userQuery, userSort]);

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

  const permissionOptions = ['一般ユーザー', '企業管理者', '運用管理者', 'キャリアコンサルタント', 'システム管理者'];

  const filteredUserIds = filteredUserAccounts.map((account) => account.id);
  const filteredConsultantIds = filteredConsultantAccounts.map((account) => account.id);
  const allFilteredUsersSelected =
    filteredUserIds.length > 0 && filteredUserIds.every((id) => selectedUserIds.includes(id));
  const allFilteredConsultantsSelected =
    filteredConsultantIds.length > 0 &&
    filteredConsultantIds.every((id) => selectedConsultantIds.includes(id));

  const handleAddUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUserForm.lastName || !newUserForm.firstName || !newUserForm.lastNameKana || !newUserForm.firstNameKana || !newUserForm.email || !newUserForm.company || !newUserForm.role || !newUserForm.permission) {
      toast({
        title: '入力不足',
        description: '姓、名、フリガナ、メール、会社名、職種、権限を入力してください。',
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
      role: newUserForm.role || DEFAULT_JOB_TITLE,
      permission: newUserForm.permission || '一般ユーザー',
      status: newUserForm.status,
      karteStatus: '未作成',
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: 0,
      initialInterviewRemaining: 1000,
      continuousInterviewRemaining: 0,
      initialLlmCallsPerInterview: 100,
      continuousLlmCallsPerInterview: 100,
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
    if (!newConsultantForm.lastName || !newConsultantForm.firstName || !newConsultantForm.lastNameKana || !newConsultantForm.firstNameKana || !newConsultantForm.email || !newConsultantForm.company || !newConsultantForm.role || !newConsultantForm.permission) {
      toast({
        title: '入力不足',
        description: '姓、名、フリガナ、メール、会社名、職種、権限を入力してください。',
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
      role: newConsultantForm.role || DEFAULT_JOB_TITLE,
      permission: newConsultantForm.permission || 'キャリアコンサルタント',
      status: newConsultantForm.status,
      karteStatus: '未作成',
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: 0,
      initialInterviewRemaining: 1000,
      continuousInterviewRemaining: 0,
      initialLlmCallsPerInterview: 100,
      continuousLlmCallsPerInterview: 100,
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
            { id: 'USR-2026-041', lastName: '中村', firstName: '愛', lastNameKana: 'ナカムラ', firstNameKana: 'アイ', name: '中村 愛', nameKana: 'ナカムラ アイ', email: 'ai.nakamura@example.com', company: 'Career Carte Inc.', department: 'Customer Success', role: '販売/サービススタッフ職', permission: '一般ユーザー' },
            { id: 'USR-2026-042', lastName: '小林', firstName: '真', lastNameKana: 'コバヤシ', firstNameKana: 'マコト', name: '小林 真', nameKana: 'コバヤシ マコト', email: 'makoto.kobayashi@example.com', company: 'Career Carte Inc.', department: 'Sales', role: '営業職', permission: '一般ユーザー' },
          ]
        : [
            { id: 'CNS-2026-407', lastName: '石井', firstName: '拓', lastNameKana: 'イシイ', firstNameKana: 'タク', name: '石井 拓', nameKana: 'イシイ タク', email: 'taku.ishii@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: '専門/資格（弁護士等）職', permission: 'キャリアコンサルタント' },
            { id: 'CNS-2026-408', lastName: '森本', firstName: '莉子', lastNameKana: 'モリモト', firstNameKana: 'リコ', name: '森本 莉子', nameKana: 'モリモト リコ', email: 'riko.morimoto@example.com', company: 'Career Carte Inc.', department: 'Career Consulting', role: '専門/資格（弁護士等）職', permission: 'キャリアコンサルタント' },
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
      karteStatus: '未作成',
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: 0,
      initialInterviewRemaining: 1000,
      continuousInterviewRemaining: 0,
      initialLlmCallsPerInterview: 100,
      continuousLlmCallsPerInterview: 100,
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

    if (!editForm.role) {
      toast({
        title: '入力不足',
        description: '職種を選択してください。',
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

  const getSelectedUserKartePayloads = () => {
    const selectedAccounts = userAccounts.filter((account) => selectedUserIds.includes(account.id));
    const payloads = selectedAccounts
      .map(buildAccountKartePayload)
      .filter((payload): payload is KarteBatchExportPayload => Boolean(payload));
    const skipped = selectedAccounts.length - payloads.length;
    if (skipped > 0) {
      toast({
        title: 'カルテ未作成のユーザーをスキップしました',
        description: `${skipped}件は出力対象から除外しました。`,
        status: 'info',
        duration: 2600,
        isClosable: true,
      });
    }
    return payloads;
  };

  const handleUserKarteCsv = (account: AccountRecord) => {
    const payload = buildAccountKartePayload(account);
    if (!payload) return;
    try {
      downloadKarteCsv(payload);
      toast({ title: 'CSVをダウンロードしました', status: 'success', duration: 2200, isClosable: true });
    } catch (error) {
      toast({
        title: 'CSV出力に失敗しました',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
    }
  };

  const handleUserKartePrint = async (account: AccountRecord) => {
    const payload = buildAccountKartePayload(account);
    if (!payload) return;
    try {
      await printKartePayloads([payload]);
    } catch (error) {
      toast({
        title: '印刷画面を開けませんでした',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
    }
  };

  const handleSelectedUserKarteCsv = () => {
    const payloads = getSelectedUserKartePayloads();
    if (payloads.length === 0) {
      toast({ title: '出力できるカルテがありません', status: 'warning', duration: 2400, isClosable: true });
      return;
    }
    try {
      downloadKarteCsvBatch(payloads);
      toast({ title: '一括CSVをダウンロードしました', status: 'success', duration: 2200, isClosable: true });
    } catch (error) {
      toast({
        title: '一括CSV出力に失敗しました',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
    }
  };

  const handleSelectedUserKartePrint = async () => {
    const payloads = getSelectedUserKartePayloads();
    if (payloads.length === 0) {
      toast({ title: '印刷できるカルテがありません', status: 'warning', duration: 2400, isClosable: true });
      return;
    }
    try {
      await printKartePayloads(payloads);
    } catch (error) {
      toast({
        title: '一括印刷画面を開けませんでした',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
    }
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

  const handleTenantQuotaFormChange = (tenantId: string, key: keyof TenantQuotaForm, value: string) => {
    setTenantQuotaForms((prev) => ({
      ...prev,
      [tenantId]: {
        ...(prev[tenantId] ?? createTenantQuotaForm(tenantId)),
        [key]: value,
      },
    }));
  };

  const handleTenantQuotaSubmit = (tenantId: string) => {
    const form = tenantQuotaForms[tenantId] ?? createTenantQuotaForm(tenantId);
    const totalLimit = Number(form.totalLimit);
    const used = Number(form.used);
    const perMeetingTurnLimit = Number(form.perMeetingTurnLimit);

    if (
      Number.isNaN(totalLimit) ||
      Number.isNaN(used) ||
      Number.isNaN(perMeetingTurnLimit) ||
      totalLimit < 0 ||
      used < 0 ||
      used > totalLimit ||
      perMeetingTurnLimit <= 0
    ) {
      toast({
        title: '企業API設定の入力値が正しくありません',
        description: '総回数は0以上、使用済み回数は総回数以下、最大ターン数は1以上で入力してください。',
        status: 'warning',
        duration: 3200,
        isClosable: true,
      });
      return;
    }

    const nextQuota = updateDemoUsageQuota(
      {
        totalLimit,
        used,
        perMeetingTurnLimit,
      },
      tenantId,
    );
    setTenantQuotaForms((prev) => ({
      ...prev,
      [tenantId]: {
        totalLimit: nextQuota.totalLimit.toString(),
        used: nextQuota.used.toString(),
        perMeetingTurnLimit: nextQuota.perMeetingTurnLimit.toString(),
      },
    }));
    toast({
      title: '企業API設定を更新しました',
      description: '同じ企業の企業管理画面、ユーザーホーム、面談画面へ同期されます。',
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
  };

  return (
    <Box bgGradient={adminPageBg} color="#27272a" maxH="100dvh" py={12} overflowY="scroll">
      <Container maxW="7xl">
        <Stack spacing={10}>
          <Box {...linePanelProps} px={{ base: 6, lg: 10 }} py={8}>
            <Stack spacing={3}>
              <Heading
                size="lg"
                bgGradient="linear(110deg, #27272a, #3f3f46, #27272a, #71717a)"
                bgClip="text"
                sx={{
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 1px 0 rgba(255, 255, 255, 0.82), 0 12px 26px rgba(63, 63, 70, 0.12)',
                }}
              >
                システム管理コンソール
              </Heading>
              <Text color="#52525b">
                PC向けレイアウトでアカウントとCSV一括登録を集中管理します。絞り込み検索や並び替えは表の上部から操作できます。
              </Text>
              <Text color="#71717a" fontSize="sm">
                最終更新: {new Date().toLocaleString('ja-JP')}
              </Text>
            </Stack>
            <Flex mt={6} gap={3} wrap="wrap">
              <Button
                variant={activeSection === 'user' ? 'solid' : 'outline'}
                colorScheme={activeSection === 'user' ? 'gray' : undefined}
                color={activeSection === 'user' ? undefined : '#27272a'}
                borderColor={activeSection === 'user' ? undefined : 'rgba(82, 82, 91, 0.18)'}
                _hover={activeSection === 'user' ? undefined : { bg: 'rgba(82, 82, 91, 0.18)' }}
                onClick={() => setActiveSection('user')}
              >
                ユーザーアカウント管理
              </Button>
              <Button
                variant={activeSection === 'consultant' ? 'solid' : 'outline'}
                colorScheme={activeSection === 'consultant' ? 'gray' : undefined}
                color={activeSection === 'consultant' ? undefined : '#27272a'}
                borderColor={activeSection === 'consultant' ? undefined : 'rgba(82, 82, 91, 0.18)'}
                _hover={activeSection === 'consultant' ? undefined : { bg: 'rgba(82, 82, 91, 0.18)' }}
                onClick={() => setActiveSection('consultant')}
              >
                コンサルアカウント管理
              </Button>
              <Button
                variant={activeSection === 'tenant' ? 'solid' : 'outline'}
                colorScheme={activeSection === 'tenant' ? 'gray' : undefined}
                color={activeSection === 'tenant' ? undefined : '#27272a'}
                borderColor={activeSection === 'tenant' ? undefined : 'rgba(82, 82, 91, 0.18)'}
                _hover={activeSection === 'tenant' ? undefined : { bg: 'rgba(82, 82, 91, 0.18)' }}
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
                  <Text color="#52525b" fontSize="sm">
                    アプリ内で発行した一時パスワードの通知文です。コピーして既存の業務メーラーで通知してください。
                  </Text>
                </Stack>
                <Badge alignSelf={{ base: 'flex-start', md: 'center' }} colorScheme={passwordNotifications.length > 0 ? 'gray' : 'gray'}>
                  {passwordNotifications.length}件
                </Badge>
              </Flex>
              {passwordNotifications.length === 0 ? (
                <Text color="#71717a" fontSize="sm">
                  まだ通知文はありません。アカウント追加、CSV一括追加、または一覧の再発行から作成できます。
                </Text>
              ) : (
                <Box borderWidth="1px" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="0" overflowX="auto" bg="rgba(244, 244, 245, 0.86)">
                  <Table size="sm">
                    <Thead bg="rgba(82, 82, 91, 0.18)">
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
                <Text color="#52525b">ユーザーアカウント専用の一覧。Excelライクな表で状態を確認できます。</Text>
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
                    color="#27272a"
                    borderColor="rgba(82, 82, 91, 0.18)"
                    _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
                    onClick={() => handleSelectAll('user')}
                  >
                    {allFilteredUsersSelected ? '選択解除' : '全ての行を選択'}
                  </Button>
                </Flex>
              </Stack>

              {selectedUserIds.length > 0 && (
                <Box border="1px solid" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="0" bg="rgba(244, 244, 245, 0.86)" p={4}>
                  <Flex direction={{ base: 'column', md: 'row' }} gap={3} align="center">
                    <Text fontWeight="semibold">選択中: {selectedUserIds.length}件</Text>
                    <Flex gap={2} wrap="wrap">
                      <PrimaryButton size="sm" onClick={() => openBulkEditModal('user')}>
                        全て編集
                      </PrimaryButton>
                      <Button
                        size="sm"
                        {...outlineLightButtonProps}
                        onClick={handleSelectedUserKartePrint}
                      >
                        選択カルテ印刷
                      </Button>
                      <PrimaryButton size="sm" onClick={handleSelectedUserKarteCsv}>
                        選択カルテCSV
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

              <Box border="1px solid" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="0" overflowX="auto" bg="rgba(244, 244, 245, 0.86)">
                <Table size="sm" variant="simple">
                  <Thead bg="rgba(82, 82, 91, 0.18)">
                    <Tr>
                      <Th>選択</Th>
                      <Th>
                        <SortButton onSort={handleSort} label="ID" target="user" column="id" />
                      </Th>
	                      <Th>
	                        <SortButton onSort={handleSort} label="氏名" target="user" column="name" />
	                      </Th>
                      <Th minW="160px">
                        <SortButton onSort={handleSort} label="フリガナ" target="user" column="nameKana" />
                      </Th>
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
                      <Th>
                        <SortButton onSort={handleSort} label="カルテ" target="user" column="karteStatus" />
                      </Th>
                      <Th>アクション</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredUserAccounts.map((rawAccount) => {
                      const account = rawAccount;
                      const hasKarte = account.karteStatus === '保存済み';
                      return (
                      <Tr
                        key={account.id}
                        bg={selectedUserIds.includes(account.id) ? 'rgba(82, 82, 91, 0.18)' : 'transparent'}
                        _hover={{
                          bg: 'rgba(82, 82, 91, 0.18)',
                        }}
                        _focusWithin={{
                          bg: selectedUserIds.includes(account.id) ? 'rgba(82, 82, 91, 0.18)' : 'transparent',
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
                        <Td minW="160px">{account.nameKana || '未設定'}</Td>
                        <Td fontSize="sm">{account.email}</Td>
                        <Td>{account.company}</Td>
                        <Td>{account.department}</Td>
                        <Td>{account.role}</Td>
                        <Td><Badge colorScheme="gray">{account.permission}</Badge></Td>
                        <Td>
                          <Badge colorScheme={hasKarte ? 'green' : 'gray'}>{account.karteStatus}</Badge>
                        </Td>
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
                            <Button
                              size="xs"
                              {...tableActionButtonProps}
                              onClick={() => handleUserKartePrint(account)}
                              isDisabled={!hasKarte}
                            >
                              印刷
                            </Button>
                            <Button
                              size="xs"
                              {...tableActionButtonProps}
                              onClick={() => handleUserKarteCsv(account)}
                              isDisabled={!hasKarte}
                            >
                              CSV
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
                  color="#27272a"
                  borderColor="rgba(82, 82, 91, 0.18)"
                  _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
                  onClick={userAddDisclosure.onToggle}
                >
                  {userAddDisclosure.isOpen ? '追加フォームを閉じる' : 'ユーザーアカウントを追加'}
                </Button>
                <Collapse in={userAddDisclosure.isOpen} animateOpacity>
                  <Box
                    mt={4}
                    border="1px solid"
                    borderColor="rgba(82, 82, 91, 0.18)"
                    borderRadius="0"
                    p={6}
                    bg="rgba(244, 244, 245, 0.86)"
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
                            <FormControl isRequired>
                              <FormLabel>職種</FormLabel>
                              <Select
                                value={newUserForm.role}
                                onChange={(event) =>
                                  setNewUserForm((prev) => ({ ...prev, role: event.target.value }))
                                }
                              >
                                <JobTitleSelectOptions />
                              </Select>
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
                          <Text color="#52525b">
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
                          <Text fontSize="sm" color="#71717a">
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
                <Text color="#52525b">
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
                    color="#27272a"
                    borderColor="rgba(82, 82, 91, 0.18)"
                    _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
                    onClick={() => handleSelectAll('consultant')}
                  >
                    {allFilteredConsultantsSelected ? '選択解除' : '全ての行を選択'}
                  </Button>
                </Flex>
              </Stack>

              {selectedConsultantIds.length > 0 && (
                <Box
                  border="1px solid"
                  borderColor="rgba(82, 82, 91, 0.18)"
                  borderRadius="0"
                  bg="rgba(244, 244, 245, 0.86)"
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

              <Box border="1px solid" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="0" overflowX="auto" bg="rgba(244, 244, 245, 0.86)">
                <Table size="sm" variant="simple">
                  <Thead bg="rgba(82, 82, 91, 0.18)">
                    <Tr>
                      <Th>選択</Th>
                      <Th>
                        <SortButton onSort={handleSort} label="ID" target="consultant" column="id" />
                      </Th>
	                      <Th>
	                        <SortButton onSort={handleSort} label="氏名" target="consultant" column="name" />
	                      </Th>
                      <Th minW="160px">
                        <SortButton onSort={handleSort} label="フリガナ" target="consultant" column="nameKana" />
                      </Th>
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
                        bg={selectedConsultantIds.includes(account.id) ? 'rgba(82, 82, 91, 0.18)' : 'transparent'}
                        _hover={{
                          bg: 'rgba(82, 82, 91, 0.18)',
                        }}
                        _focusWithin={{
                          bg: selectedConsultantIds.includes(account.id) ? 'rgba(82, 82, 91, 0.18)' : 'transparent',
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
                        <Td minW="160px">{account.nameKana || '未設定'}</Td>
                        <Td fontSize="sm">{account.email}</Td>
                        <Td>{account.company}</Td>
                        <Td>{account.department}</Td>
                        <Td>{account.role}</Td>
                        <Td><Badge colorScheme="gray">{account.permission}</Badge></Td>
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
                  color="#27272a"
                  borderColor="rgba(82, 82, 91, 0.18)"
                  _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
                  onClick={consultantAddDisclosure.onToggle}
                >
                  {consultantAddDisclosure.isOpen ? '追加フォームを閉じる' : 'コンサルタントアカウントを追加'}
                </Button>
                <Collapse in={consultantAddDisclosure.isOpen} animateOpacity>
                  <Box
                    mt={4}
                    border="1px solid"
                    borderColor="rgba(82, 82, 91, 0.18)"
                    borderRadius="0"
                    p={6}
                    bg="rgba(244, 244, 245, 0.86)"
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
                            <FormControl isRequired>
                              <FormLabel>職種</FormLabel>
                              <Select
                                value={newConsultantForm.role}
                                onChange={(event) =>
                                  setNewConsultantForm((prev) => ({ ...prev, role: event.target.value }))
                                }
                              >
                                <JobTitleSelectOptions />
                              </Select>
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
                          <Text color="#52525b">
                            CSVアップロードで複数のコンサルタントを同時に登録します。会社名、部署、職種、権限もCSVに含められます。
                          </Text>
                          <Button
                            {...outlineLightButtonProps}
                            leftIcon={<FiFileText />}
                            onClick={() => openCsvModal('consultant')}
                          >
                            CSV確認モーダルを開く
                          </Button>
                          <Text fontSize="sm" color="#71717a">
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
                <Text color="#52525b">
                  企業テナントごとに、企業API使用枠、面談1回あたり最大ターン数、面談前コンディションチェックと緊張度スコア表示の有効/無効を管理します。
                </Text>
              </Stack>
              <Box border="1px solid" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="0" overflowX="auto" bg="rgba(244, 244, 245, 0.86)">
                <Table size="sm" variant="simple">
                  <Thead bg="rgba(82, 82, 91, 0.18)">
                    <Tr>
                      <Th>tenantId</Th>
                      <Th>企業名</Th>
                      <Th>プラン</Th>
                      <Th>ステータス</Th>
                      <Th>企業API総回数</Th>
                      <Th>企業API使用済み回数</Th>
                      <Th>面談1回あたり最大ターン数</Th>
                      <Th>使用状況</Th>
                      <Th>緊張度スコア表示</Th>
                      <Th>ターンテイキング</Th>
                      <Th>ライトテーマ</Th>
                      <Th>測定件数</Th>
                      <Th>API設定</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {demoState.tenants.map((tenant) => {
                      const flags = getTenantFeatureFlags(demoState, tenant.id);
                      const conditionCount = demoState.conditionRecords.filter((record) => record.tenantId === tenant.id).length;
                      const quotaForm = tenantQuotaForms[tenant.id] ?? createTenantQuotaForm(tenant.id);
                      const apiUsage = getCompanyApiUsageSummary(getDemoUsageQuota(tenant.id));
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
                          <Td minW="140px">
                            <Input
                              size="sm"
                              type="number"
                              min="0"
                              value={quotaForm.totalLimit}
                              onChange={(event) => handleTenantQuotaFormChange(tenant.id, 'totalLimit', event.target.value)}
                            />
                          </Td>
                          <Td minW="150px">
                            <Input
                              size="sm"
                              type="number"
                              min="0"
                              value={quotaForm.used}
                              onChange={(event) => handleTenantQuotaFormChange(tenant.id, 'used', event.target.value)}
                            />
                          </Td>
                          <Td minW="180px">
                            <Input
                              size="sm"
                              type="number"
                              min="1"
                              value={quotaForm.perMeetingTurnLimit}
                              onChange={(event) => handleTenantQuotaFormChange(tenant.id, 'perMeetingTurnLimit', event.target.value)}
                            />
                          </Td>
                          <Td minW="160px">
                            <Stack spacing={1}>
                              <Text fontWeight="semibold">{apiUsage.usageLabel}</Text>
                              <Text fontSize="xs" color="#71717a">残り {apiUsage.remaining} 回</Text>
                            </Stack>
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
                            <Badge colorScheme={flags.lightThemeEnabled ? 'gray' : 'gray'}>
                              {flags.lightThemeEnabled ? 'ON' : 'OFF'}
                            </Badge>
                          </Td>
                          <Td>{conditionCount}件</Td>
                          <Td>
                            <PrimaryButton size="xs" onClick={() => handleTenantQuotaSubmit(tenant.id)}>
                              保存
                            </PrimaryButton>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
              <Text fontSize="sm" color="#71717a">
                デモ版では企業API設定と企業別オプションはメモリ状態を更新します。本番ではサーバー側の契約情報・利用実績・tenantId に接続します。
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
                <Text fontSize="sm" color="#71717a" mt={1}>
                  選択中: {activeCsvState.fileName}
                </Text>
              </FormControl>
              <Divider />
              <Text fontWeight="semibold">取り込み予定レコード（ダミー）</Text>
              <Box border="1px solid" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="lg" overflow="hidden">
                <Table size="sm">
                  <Thead bg="rgba(244, 244, 245, 0.86)">
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
              <Text fontSize="sm" color="#71717a">
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
                    <FormControl isRequired>
                      <FormLabel>職種</FormLabel>
                      <Select
                        value={editForm.role}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, role: event.target.value }))
                        }
                      >
                        <JobTitleSelectOptions />
                      </Select>
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
                </>
              ) : (
                <Text fontSize="sm" color="#52525b">
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
              <Text fontSize="sm" color="#52525b">
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
                  <Select
                    value={bulkForm.role}
                    onChange={(event) =>
                      setBulkForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                  >
                    <JobTitleSelectOptions includeNoChange />
                  </Select>
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
