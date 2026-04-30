import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Checkbox,
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
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KartePanel from '../components/KartePanel';
import {
  getCompanyAdminEmployees,
  getTenantFeatureFlags,
  loadDemoUserState,
  resolveTenantId,
  saveDemoUserState,
  updateTenantFeatureFlags,
} from '../lib/demoUserState';
import {
  getDemoUsageQuota,
  getMeetingQuotaSummary,
  subscribeDemoUsageQuota,
  updateDemoUsageQuota,
  type DemoUsageQuota,
} from '../lib/demoUsageQuota';
import { downloadKartePdf, downloadKartePdfBatch, printKartePayloads, type KarteBatchExportPayload } from '../lib/karteExport';
import type { CompanyEmployeeRecord, DemoUserState } from '../types';

type EmployeeSortColumn = 'id' | 'name' | 'email' | 'company' | 'department' | 'jobTitle' | 'status' | 'updatedAt';

type EmployeeSortState = {
  column: EmployeeSortColumn;
  direction: 'asc' | 'desc';
};

const quotaToForm = (quota: DemoUsageQuota) => ({
  initialMonthlyLimit: quota.initialMonthlyLimit.toString(),
  continuousMonthlyLimit: quota.continuousMonthlyLimit.toString(),
  initialLlmCallsPerInterview: quota.initialLlmCallsPerInterview.toString(),
  continuousLlmCallsPerInterview: quota.continuousLlmCallsPerInterview.toString(),
});

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
  const [usageQuota, setUsageQuota] = useState<DemoUsageQuota>(() => getDemoUsageQuota());
  const [quotaForm, setQuotaForm] = useState(() => quotaToForm(getDemoUsageQuota()));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<EmployeeSortState>({ column: 'updatedAt', direction: 'desc' });
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [viewingEmployee, setViewingEmployee] = useState<CompanyEmployeeRecord | null>(null);

  const tenantId = resolveTenantId(userState);
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
  const initialQuota = getMeetingQuotaSummary(usageQuota, 'initial');
  const continuousQuota = getMeetingQuotaSummary(usageQuota, 'continuous');
  const employeesWithKarte = employees.filter((employee) => employee.latestKarte).length;

  useEffect(() => {
    return subscribeDemoUsageQuota((nextQuota) => {
      setUsageQuota(nextQuota);
      setQuotaForm(quotaToForm(nextQuota));
    });
  }, []);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees
      .filter((employee) => {
        const haystack = [
          employee.id,
          employee.name,
          employee.email,
          employee.company,
          employee.department,
          employee.jobTitle,
        ].join(' ').toLowerCase();
        const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
        const matchesStatus = statusFilter === 'all' ? true : employee.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const rawA = sort.column === 'updatedAt' ? new Date(a.updatedAt || 0).getTime() : a[sort.column];
        const rawB = sort.column === 'updatedAt' ? new Date(b.updatedAt || 0).getTime() : b[sort.column];
        const valueA = typeof rawA === 'string' ? rawA.toLowerCase() : rawA;
        const valueB = typeof rawB === 'string' ? rawB.toLowerCase() : rawB;
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

  const handleEmployeePdf = async (employee: CompanyEmployeeRecord) => {
    const payload = buildExportPayload(employee);
    if (!payload) return;
    try {
      await downloadKartePdf(payload);
      toast({ title: 'PDFをダウンロードしました', status: 'success', duration: 2200, isClosable: true });
    } catch (error) {
      toast({
        title: 'PDF出力に失敗しました',
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

  const handleBatchPdf = async () => {
    const payloads = getSelectedPayloads(selectedEmployees);
    if (payloads.length === 0) {
      toast({ title: '出力できるカルテがありません', status: 'warning', duration: 2400, isClosable: true });
      return;
    }
    try {
      await downloadKartePdfBatch(payloads);
      toast({ title: '一括PDFをダウンロードしました', status: 'success', duration: 2200, isClosable: true });
    } catch (error) {
      toast({
        title: '一括PDF出力に失敗しました',
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

  const handleStressToggle = (isChecked: boolean) => {
    persistState(updateTenantFeatureFlags(userState, tenantId, { stressAnalysisEnabled: isChecked }));
    toast({
      title: isChecked ? '緊張度スコア表示を有効にしました' : '緊張度スコア表示を無効にしました',
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  const handleQuotaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const initialMonthlyLimit = Number(quotaForm.initialMonthlyLimit);
    const continuousMonthlyLimit = Number(quotaForm.continuousMonthlyLimit);
    const initialLlmCallsPerInterview = Number(quotaForm.initialLlmCallsPerInterview);
    const continuousLlmCallsPerInterview = Number(quotaForm.continuousLlmCallsPerInterview);

    if (
      Number.isNaN(initialMonthlyLimit) ||
      Number.isNaN(continuousMonthlyLimit) ||
      Number.isNaN(initialLlmCallsPerInterview) ||
      Number.isNaN(continuousLlmCallsPerInterview) ||
      initialMonthlyLimit < 0 ||
      continuousMonthlyLimit < 0 ||
      initialLlmCallsPerInterview <= 0 ||
      continuousLlmCallsPerInterview <= 0
    ) {
      toast({
        title: '入力値が正しくありません',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    updateDemoUsageQuota({
      initialMonthlyLimit,
      continuousMonthlyLimit,
      initialLlmCallsPerInterview,
      continuousLlmCallsPerInterview,
    });
    toast({
      title: '面談利用回数を更新しました',
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  return (
    <Box bgGradient="linear(to-br, gray.50, pink.50, gray.100)" height="100dvh" overflowY="scroll" py={{ base: 8, md: 12 }}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="pink.100" boxShadow="sm" p={{ base: 5, md: 8 }}>
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
              <Stack spacing={2}>
                <Heading size="lg">企業管理者ホーム</Heading>
                <Text color="gray.600">
                  {tenant?.name ?? 'デモ企業'} の従業員カルテ、利用状況、契約オプションを管理します。
                </Text>
                <Flex gap={2} wrap="wrap">
                  <Badge colorScheme="pink">tenantId: {tenantId}</Badge>
                  <Badge colorScheme={tenant?.status === 'active' ? 'green' : 'gray'}>{tenant?.status ?? 'active'}</Badge>
                  <Badge colorScheme="purple">一般ユーザーと同一ログイン入口想定</Badge>
                </Flex>
              </Stack>
              <Button variant="outline" onClick={() => navigate('/')}>
                ホームへ戻る
              </Button>
            </Flex>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5}>
            <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>社員アカウント</StatLabel>
                <StatNumber>{employees.length}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="gray.500">
                カルテ保存済み: {employeesWithKarte}件
              </Text>
            </Box>
            <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>今月の残り使用回数</StatLabel>
                <StatNumber>{initialQuota.remaining + continuousQuota.remaining}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="gray.500">
                初回{initialQuota.remaining}回 / 継続{continuousQuota.remaining}回
              </Text>
            </Box>
            <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>コンディション測定件数</StatLabel>
                <StatNumber>{tenantConditionRecords.length}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="gray.500">
                直近: {latestMeasuredAt}
              </Text>
            </Box>
            <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>緊張度スコア表示</StatLabel>
                <StatNumber>{flags.stressAnalysisEnabled ? 'ON' : 'OFF'}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="gray.500">
                AI使用可能回数: 初回面談{initialQuota.llmCallsPerInterview}回 / 継続面談{continuousQuota.llmCallsPerInterview}回
              </Text>
            </Box>
          </SimpleGrid>

          <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" boxShadow="sm" p={{ base: 5, md: 7 }}>
            <Stack spacing={4}>
              <Heading size="md">企業別オプション</Heading>
              <Checkbox isChecked={flags.stressAnalysisEnabled} onChange={(event) => handleStressToggle(event.target.checked)}>
                面談前コンディションチェックと緊張度スコア表示を有効にする
              </Checkbox>
              <Text fontSize="sm" color="gray.500">
                個人別の顔分析結果は企業管理者画面には表示せず、測定件数などの集計のみ扱います。
              </Text>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" boxShadow="sm" p={{ base: 5, md: 7 }}>
            <form onSubmit={handleQuotaSubmit}>
              <Stack spacing={4}>
                <Heading size="md">面談利用回数・会話ターン制限</Heading>
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>初回面談月間上限</FormLabel>
                    <Input
                      type="number"
                      min="0"
                      value={quotaForm.initialMonthlyLimit}
                      onChange={(event) => setQuotaForm((prev) => ({ ...prev, initialMonthlyLimit: event.target.value }))}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>継続面談月間上限</FormLabel>
                    <Input
                      type="number"
                      min="0"
                      value={quotaForm.continuousMonthlyLimit}
                      onChange={(event) => setQuotaForm((prev) => ({ ...prev, continuousMonthlyLimit: event.target.value }))}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>初回面談1回あたりのAI使用可能回数</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      value={quotaForm.initialLlmCallsPerInterview}
                      onChange={(event) => setQuotaForm((prev) => ({ ...prev, initialLlmCallsPerInterview: event.target.value }))}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>継続面談1回あたりのAI使用可能回数</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      value={quotaForm.continuousLlmCallsPerInterview}
                      onChange={(event) => setQuotaForm((prev) => ({ ...prev, continuousLlmCallsPerInterview: event.target.value }))}
                    />
                  </FormControl>
                </SimpleGrid>
                <Text fontSize="sm" color="gray.500">
                  初回面談: 上限{initialQuota.limit}回 / 使用済み{initialQuota.used}回 / 残り{initialQuota.remaining}回、継続面談:
                  上限{continuousQuota.limit}回 / 使用済み{continuousQuota.used}回 / 残り{continuousQuota.remaining}回
                </Text>
                <Button type="submit" colorScheme="pink" alignSelf="flex-start">
                  設定を保存
                </Button>
              </Stack>
            </form>
          </Box>

          <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" boxShadow="sm" p={{ base: 5, md: 7 }}>
            <Stack spacing={5}>
              <Flex justify="space-between" align={{ base: 'stretch', lg: 'center' }} gap={4} direction={{ base: 'column', lg: 'row' }}>
                <Stack spacing={1}>
                  <Heading size="md">自社従業員カルテ</Heading>
                  <Text fontSize="sm" color="gray.500">
                    表示中 {filteredEmployees.length}件 / 全{employees.length}件、選択中 {selectedEmployeeIds.length}件
                  </Text>
                </Stack>
                <Flex gap={2} wrap="wrap">
                  <Button size="sm" variant="outline" onClick={handleSelectAll}>
                    {allFilteredSelected ? '表示中の選択解除' : '表示中を一括選択'}
                  </Button>
                  <Button size="sm" colorScheme="pink" onClick={handleBatchPdf} isDisabled={selectedEmployeeIds.length === 0}>
                    選択カルテPDF
                  </Button>
                  <Button size="sm" variant="outline" colorScheme="pink" onClick={handleBatchPrint} isDisabled={selectedEmployeeIds.length === 0}>
                    選択カルテ印刷
                  </Button>
                </Flex>
              </Flex>

              <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                <Input
                  placeholder="名前 / メール / 会社名 / 部署 / 職種 / ID で検索"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Select maxW={{ md: '240px' }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">すべてのステータス</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Flex>

              <Box borderWidth="1px" borderColor="gray.100" borderRadius="lg" overflowX="auto">
                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>選択</Th>
                      <Th><SortButton label="ID" column="id" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="氏名" column="name" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="メール" column="email" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="会社名" column="company" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="部署" column="department" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="職種" column="jobTitle" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="ステータス" column="status" sort={sort} onSort={handleSort} /></Th>
                      <Th><SortButton label="更新日時" column="updatedAt" sort={sort} onSort={handleSort} /></Th>
                      <Th>カルテ</Th>
                      <Th>操作</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredEmployees.map((employee) => {
                      const hasKarte = Boolean(employee.latestKarte);
                      return (
                        <Tr key={employee.id} bg={selectedEmployeeIds.includes(employee.id) ? 'pink.50' : 'transparent'}>
                          <Td>
                            <Checkbox
                              isChecked={selectedEmployeeIds.includes(employee.id)}
                              onChange={(event) => toggleSelection(employee.id, event.target.checked)}
                              aria-label={`${employee.name}を選択`}
                            />
                          </Td>
                          <Td fontWeight="medium">{employee.id}</Td>
                          <Td>{employee.name}</Td>
                          <Td color="gray.600">{employee.email || '未設定'}</Td>
                          <Td>{employee.company || tenant?.name || '未設定'}</Td>
                          <Td>{employee.department || '未設定'}</Td>
                          <Td>{employee.jobTitle || '未設定'}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(employee.status)}>{employee.status}</Badge>
                          </Td>
                          <Td>{formatDateTime(employee.updatedAt)}</Td>
                          <Td>
                            <Badge colorScheme={hasKarte ? 'green' : 'gray'}>{hasKarte ? '保存済み' : '未作成'}</Badge>
                          </Td>
                          <Td>
                            <Stack direction="row" spacing={2}>
                              <Button size="xs" variant="outline" onClick={() => setViewingEmployee(employee)} isDisabled={!hasKarte}>
                                表示
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => handleEmployeePrint(employee)} isDisabled={!hasKarte}>
                                印刷
                              </Button>
                              <Button size="xs" colorScheme="pink" variant="outline" onClick={() => handleEmployeePdf(employee)} isDisabled={!hasKarte}>
                                PDF
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

      <Modal isOpen={Boolean(viewingEmployee)} onClose={() => setViewingEmployee(null)} size="5xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Stack spacing={1}>
              <Text>{viewingEmployee?.name ?? '従業員'} のキャリアカルテ</Text>
              <Text fontSize="sm" color="gray.500" fontWeight="normal">
                {viewingEmployee?.department || '部署未設定'} / {viewingEmployee?.email || 'メール未設定'}
              </Text>
            </Stack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewingEmployee?.latestKarte && <KartePanel data={viewingEmployee.latestKarte} showCondition={flags.stressAnalysisEnabled} />}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="outline" onClick={() => viewingEmployee && handleEmployeePrint(viewingEmployee)} isDisabled={!viewingEmployee?.latestKarte}>
              印刷
            </Button>
            <Button colorScheme="pink" onClick={() => viewingEmployee && handleEmployeePdf(viewingEmployee)} isDisabled={!viewingEmployee?.latestKarte}>
              PDF
            </Button>
            <Button variant="ghost" onClick={() => setViewingEmployee(null)}>
              閉じる
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default CompanyAdminHome;
