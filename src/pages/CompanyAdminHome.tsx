import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Flex,
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
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KartePanel from '../components/KartePanel';
import PrimaryButton from '../components/PrimaryButton';
import {
  getCompanyAdminEmployees,
  getTenantFeatureFlags,
  loadDemoUserState,
  resolveTenantId,
  saveDemoUserState,
  updateTenantFeatureFlags,
} from '../lib/demoUserState';
import {
  buildPasswordNotification,
  copyTextToClipboard,
  type DemoPasswordNotification,
} from '../lib/demoPassword';
import {
  getCompanyApiUsageSummary,
  getDemoUsageQuota,
  subscribeDemoUsageQuota,
  type DemoUsageQuota,
} from '../lib/demoUsageQuota';
import { downloadKarteCsv, downloadKarteCsvBatch, printKartePayloads, type KarteBatchExportPayload } from '../lib/karteExport';
import type { CompanyEmployeeRecord, DemoUserState } from '../types';

type EmployeeSortColumn =
  | 'id'
  | 'name'
  | 'nameKana'
  | 'email'
  | 'company'
  | 'department'
  | 'jobTitle'
  | 'permission'
  | 'status'
  | 'updatedAt'
  | 'karteStatus';

type EmployeeSortState = {
  column: EmployeeSortColumn;
  direction: 'asc' | 'desc';
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '未設定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ja-JP');
};

const getStatusColor = (status: string) => {
  if (status === '完了') return 'green';
  if (status === '未作成' || status === '未設定') return 'gray';
  return 'purple';
};

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
  },
} as const;

const translucentPanelProps = {
  bg: 'rgba(244, 244, 245, 0.86)',
  color: '#27272a',
  borderRadius: '0',
  borderWidth: '1px',
  borderColor: 'rgba(82, 82, 91, 0.18)',
  boxShadow: '0 18px 46px rgba(63, 63, 70, 0.10)',
  backdropFilter: 'blur(12px)',
} as const;

const formControlProps = {
  bg: '#fcfcfd',
  color: '#27272a',
  borderColor: 'rgba(82, 82, 91, 0.18)',
  _placeholder: { color: '#71717a' },
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

const SortButton = ({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: EmployeeSortColumn;
  sort: EmployeeSortState;
  onSort: (column: EmployeeSortColumn) => void;
}) => (
  <Button
    size="xs"
    variant="ghost"
    color="#3f3f46"
    _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
    rightIcon={<ChevronDownIcon transform={sort.column === column && sort.direction === 'asc' ? 'rotate(180deg)' : undefined} />}
    onClick={() => onSort(column)}
  >
    {label}
  </Button>
);

const buildExportPayload = (employee: CompanyEmployeeRecord): KarteBatchExportPayload | null => {
  if (!employee.latestKarte) return null;
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

function CompanyAdminHome() {
  const toast = useToast();
  const navigate = useNavigate();
  const [userState, setUserState] = useState<DemoUserState>(() => loadDemoUserState());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<EmployeeSortState>({ column: 'updatedAt', direction: 'desc' });
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [viewingEmployee, setViewingEmployee] = useState<CompanyEmployeeRecord | null>(null);
  const [passwordNotifications, setPasswordNotifications] = useState<DemoPasswordNotification[]>([]);

  const tenantId = resolveTenantId(userState);
  const [usageQuota, setUsageQuota] = useState<DemoUsageQuota>(() => getDemoUsageQuota(resolveTenantId(loadDemoUserState())));
  const tenant = userState.tenants.find((entry) => entry.id === tenantId) ?? userState.tenants[0];
  const flags = getTenantFeatureFlags(userState, tenantId);
  const employees = useMemo(() => getCompanyAdminEmployees(userState, tenantId), [tenantId, userState]);
  const tenantConditionRecords = useMemo(
    () => userState.conditionRecords.filter((record) => record.tenantId === tenantId),
    [tenantId, userState.conditionRecords],
  );
  const latestMeasuredAt = tenantConditionRecords[0]?.measuredAt
    ? new Date(tenantConditionRecords[0].measuredAt).toLocaleString('ja-JP')
    : '未測定';
  const apiUsage = getCompanyApiUsageSummary(usageQuota);
  const employeesWithKarte = employees.filter((employee) => employee.latestKarte).length;

  useEffect(() => {
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) setUsageQuota(getDemoUsageQuota(tenantId));
    });
    const unsubscribe = subscribeDemoUsageQuota(setUsageQuota, tenantId);
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [tenantId]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees
      .filter((employee) => {
        const haystack = [
          employee.id,
          employee.name,
          employee.nameKana,
          employee.email,
          employee.company,
          employee.department,
          employee.jobTitle,
          employee.permission,
        ].join(' ').toLowerCase();
        const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
        const matchesStatus = statusFilter === 'all' ? true : employee.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const rawA =
          sort.column === 'updatedAt'
            ? new Date(a.updatedAt || 0).getTime()
            : sort.column === 'karteStatus'
              ? (a.latestKarte ? '保存済み' : '未作成')
              : a[sort.column];
        const rawB =
          sort.column === 'updatedAt'
            ? new Date(b.updatedAt || 0).getTime()
            : sort.column === 'karteStatus'
              ? (b.latestKarte ? '保存済み' : '未作成')
              : b[sort.column];
        const valueA = typeof rawA === 'string' ? rawA.toLowerCase() : rawA;
        const valueB = typeof rawB === 'string' ? rawB.toLowerCase() : rawB;
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          const compared = valueA.localeCompare(valueB, 'ja');
          if (compared !== 0) return sort.direction === 'asc' ? compared : -compared;
          return 0;
        }
        if (valueA < valueB) return sort.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [employees, query, sort, statusFilter]);

  const filteredEmployeeIds = filteredEmployees.map((employee) => employee.id);
  const selectedEmployees = employees.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const allFilteredSelected =
    filteredEmployeeIds.length > 0 && filteredEmployeeIds.every((id) => selectedEmployeeIds.includes(id));
  const statusOptions = Array.from(new Set(employees.map((employee) => employee.status))).filter(Boolean);

  const persistState = (nextState: DemoUserState) => {
    setUserState(nextState);
    saveDemoUserState(nextState);
  };

  const handleSort = (column: EmployeeSortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = () => {
    const nextSelected = new Set(selectedEmployeeIds);
    if (allFilteredSelected) {
      filteredEmployeeIds.forEach((id) => nextSelected.delete(id));
    } else {
      filteredEmployeeIds.forEach((id) => nextSelected.add(id));
    }
    setSelectedEmployeeIds(Array.from(nextSelected));
  };

  const toggleSelection = (employeeId: string, isChecked: boolean) => {
    setSelectedEmployeeIds((prev) =>
      isChecked ? [...new Set([...prev, employeeId])] : prev.filter((id) => id !== employeeId),
    );
  };

  const getSelectedPayloads = (targetEmployees: CompanyEmployeeRecord[]) => {
    const payloads = targetEmployees.map(buildExportPayload).filter((payload): payload is KarteBatchExportPayload => Boolean(payload));
    const skipped = targetEmployees.length - payloads.length;
    if (skipped > 0) {
      toast({
        title: 'カルテ未作成の従業員をスキップしました',
        description: `${skipped}件は出力対象から除外しました。`,
        status: 'info',
        duration: 2600,
        isClosable: true,
      });
    }
    return payloads;
  };

  const handleEmployeeCsv = (employee: CompanyEmployeeRecord) => {
    const payload = buildExportPayload(employee);
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

  const handleEmployeePrint = async (employee: CompanyEmployeeRecord) => {
    const payload = buildExportPayload(employee);
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

  const handleBatchCsv = () => {
    const payloads = getSelectedPayloads(selectedEmployees);
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

  const handleBatchPrint = async () => {
    const payloads = getSelectedPayloads(selectedEmployees);
    if (payloads.length === 0) {
      toast({ title: '印刷できるカルテがありません', status: 'warning', duration: 2400, isClosable: true });
      return;
    }
    try {
      await printKartePayloads(payloads);
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

  const handleEmployeePasswordReset = (employee: CompanyEmployeeRecord) => {
    const notification = buildPasswordNotification({
      accountId: employee.id,
      accountName: employee.name,
      email: employee.email || '未設定',
      roleLabel: employee.permission || '一般ユーザー',
    });
    setPasswordNotifications((prev) => [notification, ...prev]);
    toast({
      title: '一時パスワードを発行しました',
      description: '通知文一覧からコピーし、既存の業務メーラーで通知してください。',
      status: 'info',
      duration: 2600,
      isClosable: true,
    });
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

  const handleStressToggle = (isChecked: boolean) => {
    persistState(updateTenantFeatureFlags(userState, tenantId, { stressAnalysisEnabled: isChecked }));
    toast({
      title: isChecked ? '緊張度スコア表示を有効にしました' : '緊張度スコア表示を無効にしました',
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  return (
    <Box bgGradient={adminPageBg} color="#27272a" height="100dvh" overflowY="scroll" py={{ base: 8, md: 12 }}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Box {...linePanelProps} p={{ base: 5, md: 8 }}>
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
              <Stack spacing={2}>
                <Heading
                  size="lg"
                  bgGradient="linear(110deg, #18181b, #27272a, #18181b, #3f3f46)"
                  bgClip="text"
                  sx={{
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 1px 0 rgba(255, 255, 255, 0.82), 0 12px 26px rgba(63, 63, 70, 0.12)',
                  }}
                >
                  企業管理者ホーム
                </Heading>
                <Text color="#52525b">
                  {tenant?.name ?? 'デモ企業'} の従業員カルテ、利用状況、契約オプションを管理します。
                </Text>
                <Flex gap={2} wrap="wrap">
                  <Badge colorScheme="pink">tenantId: {tenantId}</Badge>
                  <Badge colorScheme={tenant?.status === 'active' ? 'green' : 'gray'}>{tenant?.status ?? 'active'}</Badge>
                  <Badge colorScheme="purple">一般ユーザーと同一ログイン入口想定</Badge>
                </Flex>
              </Stack>
              <Button
                variant="outline"
                color="#27272a"
                borderColor="rgba(82, 82, 91, 0.18)"
                _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
                onClick={() => navigate('/user')}
              >
                マイページへ戻る
              </Button>
            </Flex>
          </Box>

          <SimpleGrid columns={{ base: 2, md: 2 }} spacing={5}>
            <Box {...translucentPanelProps} p={5}>
              <Stat>
                <StatLabel color="#71717a">社員アカウント</StatLabel>
                <StatNumber>{employees.length}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="#71717a">
                カルテ保存済み: {employeesWithKarte}件
              </Text>
            </Box>
            <Box {...translucentPanelProps} p={5}>
              <Stat>
                <StatLabel color="#71717a">残り面談回数</StatLabel>
                <StatNumber>{apiUsage.remaining}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="#71717a">
                使用状況: {apiUsage.usageLabel}
              </Text>
            </Box>
            <Box {...translucentPanelProps} p={5} display="none">
              <Stat>
                <StatLabel color="#71717a">コンディション測定件数</StatLabel>
                <StatNumber>{tenantConditionRecords.length}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="#71717a">
                直近: {latestMeasuredAt}
              </Text>
            </Box>
            <Box {...translucentPanelProps} p={5} display="none">
              <Stat>
                <StatLabel color="#71717a">緊張度スコア表示</StatLabel>
                <StatNumber>{flags.stressAnalysisEnabled ? 'ON' : 'OFF'}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="#71717a">
                面談1回あたり最大{apiUsage.perMeetingTurnLimit}ターン
              </Text>
            </Box>
          </SimpleGrid>

          <Box {...linePanelProps} p={{ base: 5, md: 7 }} display="none">
            <Stack spacing={4}>
              <Flex justify="space-between" gap={3} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                <Stack spacing={1}>
                  <Heading size="md">パスワード通知文一覧</Heading>
                  <Text color="#52525b" fontSize="sm">
                    自社従業員向けに発行した一時パスワードの通知文です。コピーして既存の業務メーラーで通知してください。
                  </Text>
                </Stack>
                <Badge alignSelf={{ base: 'flex-start', md: 'center' }} colorScheme={passwordNotifications.length > 0 ? 'gray' : 'gray'}>
                  {passwordNotifications.length}件
                </Badge>
              </Flex>
              {passwordNotifications.length === 0 ? (
                <Text color="#71717a" fontSize="sm">
                  まだ通知文はありません。従業員一覧の再発行から作成できます。
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

          <Box {...linePanelProps} p={{ base: 5, md: 7 }} display="none">
            <Stack spacing={4}>
              <Heading size="md">企業別オプション</Heading>
              <Checkbox isChecked={flags.stressAnalysisEnabled} onChange={(event) => handleStressToggle(event.target.checked)}>
                面談前コンディションチェックと緊張度スコア表示を有効にする
              </Checkbox>
              <Text fontSize="sm" color="#71717a">
                個人別の顔分析結果は企業管理者画面には表示せず、測定件数などの集計のみ扱います。
              </Text>
            </Stack>
          </Box>

          <Box {...linePanelProps} p={{ base: 5, md: 7 }}>
            <Stack spacing={5}>
              <Flex justify="space-between" align={{ base: 'stretch', lg: 'center' }} gap={4} direction={{ base: 'column', lg: 'row' }}>
                <Stack spacing={1}>
                  <Heading size="md">自社従業員カルテ</Heading>
                  <Text fontSize="sm" color="#71717a">
                    表示中 {filteredEmployees.length}件 / 全{employees.length}件、選択中 {selectedEmployeeIds.length}件
                  </Text>
                </Stack>
                <Flex gap={2} wrap="wrap">
                  <Button size="sm" variant="outline" color="#27272a" borderColor="rgba(82, 82, 91, 0.18)" _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }} onClick={handleSelectAll}>
                    {allFilteredSelected ? '表示中の選択解除' : '表示中を一括選択'}
                  </Button>
                  <PrimaryButton size="sm" onClick={handleBatchCsv} isDisabled={selectedEmployeeIds.length === 0}>
                    選択カルテCSV
                  </PrimaryButton>
                  <Button size="sm" variant="outline" color="#27272a" borderColor="rgba(82, 82, 91, 0.18)" _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }} onClick={handleBatchPrint} isDisabled={selectedEmployeeIds.length === 0}>
                    選択カルテ印刷
                  </Button>
                </Flex>
              </Flex>

              <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                <Input
                  placeholder="ID / 氏名 / フリガナ / メール / 会社名 / 部署 / 職種 / 権限 で検索"
                  value={query}
                  {...formControlProps}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Select maxW={{ md: '240px' }} value={statusFilter} {...formControlProps} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">すべてのステータス</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Flex>

              <Box borderWidth="1px" borderColor="rgba(82, 82, 91, 0.18)" borderRadius="0" overflowX="auto" bg="rgba(244, 244, 245, 0.86)">
                <Table size="sm">
                  <Thead bg="rgba(82, 82, 91, 0.18)">
                    <Tr>
                      <Th>選択</Th>
                      <Th><SortButton label="ID" column="id" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="氏名" column="name" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="フリガナ" column="nameKana" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="メール" column="email" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="会社名" column="company" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="部署" column="department" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="職種" column="jobTitle" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="権限" column="permission" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="ステータス" column="status" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="更新日時" column="updatedAt" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="カルテ" column="karteStatus" sort={sort} onSort={handleSort} /></Th>
                      <Th>操作</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredEmployees.map((employee) => {
                      const hasKarte = Boolean(employee.latestKarte);
                      return (
                        <Tr
                          key={employee.id}
                          bg={selectedEmployeeIds.includes(employee.id) ? 'rgba(82, 82, 91, 0.18)' : 'transparent'}
                          _hover={{ bg: 'rgba(82, 82, 91, 0.18)' }}
                        >
                          <Td>
                            <Checkbox
                              isChecked={selectedEmployeeIds.includes(employee.id)}
                              onChange={(event) => toggleSelection(employee.id, event.target.checked)}
                              aria-label={`${employee.name}を選択`}
                            />
                          </Td>
                          <Td fontWeight="medium">{employee.id}</Td>
                          <Td>{employee.name}</Td>
                          <Td>{employee.nameKana || '未設定'}</Td>
                          <Td color="#52525b">{employee.email || '未設定'}</Td>
                          <Td>{employee.company || tenant?.name || '未設定'}</Td>
                          <Td>{employee.department || '未設定'}</Td>
                          <Td>{employee.jobTitle || '未設定'}</Td>
                          <Td><Badge colorScheme="gray">{employee.permission || '一般ユーザー'}</Badge></Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(employee.status)}>{employee.status}</Badge>
                          </Td>
                          <Td>{formatDateTime(employee.updatedAt)}</Td>
                          <Td>
                            <Badge colorScheme={hasKarte ? 'green' : 'gray'}>{hasKarte ? '保存済み' : '未作成'}</Badge>
                          </Td>
                          <Td>
                            <Stack direction="row" spacing={2}>
                              <Button size="xs" {...tableActionButtonProps} onClick={() => setViewingEmployee(employee)} isDisabled={!hasKarte}>
                                表示
                              </Button>
                              <Button size="xs" {...tableActionButtonProps} onClick={() => handleEmployeePrint(employee)} isDisabled={!hasKarte}>
                                印刷
                              </Button>
                              <Button size="xs" {...tableActionButtonProps} onClick={() => handleEmployeePasswordReset(employee)} display="none">
                                再発行
                              </Button>
                              <Button
                                size="xs"
                                {...tableActionButtonProps}
                                borderColor={hasKarte ? 'pink.400' : 'rgba(82, 82, 91, 0.18)'}
                                _hover={hasKarte ? { bg: 'pink.500', color: '#27272a', borderColor: 'pink.300' } : tableActionButtonProps._hover}
                                onClick={() => handleEmployeeCsv(employee)}
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
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Modal isOpen={Boolean(viewingEmployee)} onClose={() => setViewingEmployee(null)} size="full" scrollBehavior="inside">
        <ModalOverlay bg="rgba(82, 82, 91, 0.18)" backdropFilter="blur(7px)" />
        <ModalContent
          bg="rgba(252, 252, 253, 0.98)"
          color="#27272a"
          borderRadius="0"
          borderWidth="1px"
          borderColor="rgba(82, 82, 91, 0.18)"
          boxShadow="0 34px 110px rgba(63, 63, 70, 0.18)"
          overflow="hidden"
          maxW={{ base: '100vw', lg: '94vw', '2xl': '1480px' }}
          maxH={{ base: '100dvh', md: 'calc(100dvh - 32px)' }}
          my={{ base: 0, md: 4 }}
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            bgGradient: 'linear(to-r, transparent, rgba(75, 85, 99, 0.58), rgba(31, 41, 55, 0.68), transparent)',
            zIndex: 1,
          }}
        >
          <ModalHeader
            pt={8}
            pb={5}
            bg="linear-gradient(135deg, rgba(252, 252, 253, 0.98), rgba(244, 244, 245, 0.96))"
            borderBottomWidth="1px"
            borderColor="rgba(82, 82, 91, 0.18)"
          >
            <Stack spacing={1}>
              <Text>{viewingEmployee?.name ?? '従業員'} のキャリアカルテ</Text>
              <Text fontSize="sm" color="#71717a" fontWeight="normal">
                {viewingEmployee?.department || '部署未設定'} / {viewingEmployee?.email || 'メール未設定'}
              </Text>
            </Stack>
          </ModalHeader>
          <ModalCloseButton color="#52525b" top={5} _hover={{ bg: 'rgba(82, 82, 91, 0.18)', color: '#27272a' }} />
          <ModalBody
            bg="rgba(244, 244, 245, 0.86)"
            px={0}
            py={0}
            position="relative"
          >
            {viewingEmployee?.latestKarte && <KartePanel data={viewingEmployee.latestKarte} showCondition={flags.stressAnalysisEnabled} />}
          </ModalBody>
          <ModalFooter
            gap={2}
            bg="linear-gradient(135deg, rgba(252, 252, 253, 0.98), rgba(244, 244, 245, 0.96))"
            borderTopWidth="1px"
            borderColor="rgba(82, 82, 91, 0.18)"
          >
            <Button
              variant="outline"
              color="#3f3f46"
              borderColor="rgba(82, 82, 91, 0.18)"
              _hover={{ bg: 'rgba(82, 82, 91, 0.18)', color: '#27272a', borderColor: '#52525b' }}
              onClick={() => viewingEmployee && handleEmployeePrint(viewingEmployee)}
              isDisabled={!viewingEmployee?.latestKarte}
            >
              印刷
            </Button>
            <PrimaryButton onClick={() => viewingEmployee && handleEmployeeCsv(viewingEmployee)} isDisabled={!viewingEmployee?.latestKarte}>
              CSVとして保存
            </PrimaryButton>
            <Button variant="ghost" color="#3f3f46" _hover={{ bg: 'rgba(82, 82, 91, 0.18)', color: '#27272a' }} onClick={() => setViewingEmployee(null)}>
              閉じる
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default CompanyAdminHome;
