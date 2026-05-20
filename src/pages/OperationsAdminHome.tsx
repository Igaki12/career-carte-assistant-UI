import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
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
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useMemo, useState } from 'react';
import { FiBriefcase, FiDownload, FiEye, FiFileText } from 'react-icons/fi';
import KartePanel from '../components/KartePanel';
import { findDemoAccount } from '../lib/demoAccounts';
import { loadDemoAuthSession } from '../lib/demoAuth';
import { getCompanyApiUsageSummary, getDemoUsageQuota } from '../lib/demoUsageQuota';
import { loadDemoUserState } from '../lib/demoUserState';
import { downloadKarteCsv, downloadKartePdf, type KarteExportPayload } from '../lib/karteExport';
import type { CompanyEmployeeRecord, Tenant } from '../types';

type SortColumn = 'company' | 'id' | 'name' | 'nameKana' | 'email' | 'department' | 'jobTitle' | 'status' | 'karteStatus' | 'updatedAt';
type SortState = {
  column: SortColumn;
  direction: 'asc' | 'desc';
};

const adminPageBg = 'linear(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)';
const panelProps = {
  bg: 'transparent',
  color: 'white',
  borderRadius: '0',
  borderWidth: '0',
  p: 6,
  position: 'relative',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
  _before: {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '5px',
    bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.74), rgba(226, 232, 240, 0.88), transparent)',
  },
} as const;
const outlineButtonProps = {
  color: 'white',
  borderColor: 'whiteAlpha.500',
  variant: 'outline',
  _hover: { bg: 'whiteAlpha.160' },
} as const;

const getKarteStatus = (employee: CompanyEmployeeRecord) => (employee.latestKarte ? '保存済み' : '未作成');

const getSortValue = (employee: CompanyEmployeeRecord, column: SortColumn) => {
  if (column === 'karteStatus') return getKarteStatus(employee);
  return String(employee[column] ?? '');
};

const createKartePayload = (employee: CompanyEmployeeRecord): KarteExportPayload | null => {
  if (!employee.latestKarte) return null;
  const latestRecord = employee.karteRecords[0] ?? null;
  return {
    karte: employee.latestKarte,
    meta: {
      meetingType: latestRecord?.meetingType ?? null,
      createdAt: latestRecord?.atCreated ?? employee.createdAt,
      updatedAt: latestRecord?.atUpdated ?? employee.updatedAt,
      feedback: latestRecord?.feedback ?? null,
    },
  };
};

const SortButton = ({
  label,
  column,
  onSort,
}: {
  label: string;
  column: SortColumn;
  onSort: (column: SortColumn) => void;
}) => (
  <Button
    size="sm"
    variant="ghost"
    color="whiteAlpha.900"
    _hover={{ bg: 'whiteAlpha.200' }}
    rightIcon={<ChevronDownIcon fontSize="1rem" />}
    onClick={() => onSort(column)}
  >
    {label}
  </Button>
);

function OperationsAdminHome() {
  const toast = useToast();
  const karteModal = useDisclosure();
  const [state] = useState(() => loadDemoUserState());
  const [session] = useState(() => loadDemoAuthSession());
  const [query, setQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [sort, setSort] = useState<SortState>({ column: 'company', direction: 'asc' });
  const [viewingEmployee, setViewingEmployee] = useState<CompanyEmployeeRecord | null>(null);

  const account = useMemo(() => findDemoAccount(session?.accountId ?? ''), [session?.accountId]);
  const managedTenantIds = useMemo(
    () =>
      account?.managedTenantIds?.length
        ? account.managedTenantIds
        : state.tenants.map((tenant) => tenant.id),
    [account?.managedTenantIds, state.tenants],
  );
  const managedTenantSet = useMemo(() => new Set(managedTenantIds), [managedTenantIds]);
  const managedTenants = useMemo(
    () => state.tenants.filter((tenant) => managedTenantSet.has(tenant.id)),
    [managedTenantSet, state.tenants],
  );

  const employees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return state.companyEmployees
      .filter((employee) => managedTenantSet.has(employee.tenantId))
      .filter((employee) => tenantFilter === 'all' || employee.tenantId === tenantFilter)
      .filter((employee) => {
        if (!normalizedQuery) return true;
        return [
          employee.id,
          employee.name,
          employee.nameKana,
          employee.email,
          employee.company,
          employee.department,
          employee.jobTitle,
          employee.permission,
          employee.status,
          getKarteStatus(employee),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        const left = getSortValue(a, sort.column);
        const right = getSortValue(b, sort.column);
        return sort.direction === 'asc' ? left.localeCompare(right, 'ja') : right.localeCompare(left, 'ja');
      });
  }, [managedTenantSet, query, sort, state.companyEmployees, tenantFilter]);

  const handleSort = (column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openKarte = (employee: CompanyEmployeeRecord) => {
    if (!employee.latestKarte) {
      toast({
        title: 'カルテ未作成です',
        status: 'info',
        duration: 2200,
        isClosable: true,
      });
      return;
    }
    setViewingEmployee(employee);
    karteModal.onOpen();
  };

  const downloadCsv = (employee: CompanyEmployeeRecord) => {
    const payload = createKartePayload(employee);
    if (!payload) return;
    downloadKarteCsv(payload);
  };

  const downloadPdf = async (employee: CompanyEmployeeRecord) => {
    const payload = createKartePayload(employee);
    if (!payload) return;
    await downloadKartePdf(payload);
  };

  const tenantSummaries = managedTenants.map((tenant: Tenant) => {
    const tenantEmployees = state.companyEmployees.filter((employee) => employee.tenantId === tenant.id);
    const savedCount = tenantEmployees.filter((employee) => employee.latestKarte).length;
    const usage = getCompanyApiUsageSummary(getDemoUsageQuota(tenant.id));
    return {
      tenant,
      employeeCount: tenantEmployees.length,
      savedCount,
      remaining: usage.remaining,
      usageLabel: usage.usageLabel,
      perMeetingTurnLimit: usage.perMeetingTurnLimit,
    };
  });

  return (
    <Box bgGradient={adminPageBg} color="white" height="100dvh" overflowY="scroll" py={{ base: 8, md: 12 }}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Box {...panelProps}>
            <Stack spacing={3}>
              <Heading size="xl">運用管理者ホーム</Heading>
              <Text color="whiteAlpha.850">
                複数企業にまたがる従業員カルテ、企業別状況、契約オプション確認を行います。
              </Text>
              <Flex gap={2} wrap="wrap">
                <Badge colorScheme="cyan">運用管理者</Badge>
                <Badge colorScheme="purple">管理対象企業: {managedTenants.length}社</Badge>
                <Badge colorScheme="green">表示中ユーザー: {employees.length}件</Badge>
              </Flex>
            </Stack>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
            {tenantSummaries.map(({ tenant, employeeCount, savedCount, remaining, usageLabel, perMeetingTurnLimit }) => (
              <Box key={tenant.id} {...panelProps}>
                <Stack spacing={3}>
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <FiBriefcase /> {tenant.name}
                  </Heading>
                  <Flex gap={2} wrap="wrap">
                    <Badge colorScheme={tenant.status === 'active' ? 'green' : 'red'}>{tenant.status.toUpperCase()}</Badge>
                    <Badge colorScheme="blue">{tenant.id}</Badge>
                  </Flex>
                  <SimpleGrid columns={2} spacing={3}>
                    <Box>
                      <Text color="whiteAlpha.700" fontSize="sm">従業員</Text>
                      <Text fontSize="2xl" fontWeight="bold">{employeeCount}</Text>
                    </Box>
                    <Box>
                      <Text color="whiteAlpha.700" fontSize="sm">カルテ保存済み</Text>
                      <Text fontSize="2xl" fontWeight="bold">{savedCount}</Text>
                    </Box>
                    <Box>
                      <Text color="whiteAlpha.700" fontSize="sm">残り面談回数</Text>
                      <Text fontSize="2xl" fontWeight="bold">{remaining}</Text>
                    </Box>
                    <Box>
                      <Text color="whiteAlpha.700" fontSize="sm">最大ターン数</Text>
                      <Text fontSize="2xl" fontWeight="bold">{perMeetingTurnLimit}</Text>
                    </Box>
                  </SimpleGrid>
                  <Text color="whiteAlpha.800" fontSize="sm">使用状況: {usageLabel}</Text>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>

          <Box {...panelProps}>
            <Stack spacing={4}>
              <Heading size="lg">横断ユーザー管理</Heading>
              <Text color="whiteAlpha.800">
                ユーザーが所属している企業名を確認し、氏名・フリガナ・メール・企業名・職種で検索できます。
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ID / 氏名 / フリガナ / メール / 会社名 / 部署 / 職種 で検索"
                  bg="whiteAlpha.900"
                  color="gray.900"
                  _placeholder={{ color: 'gray.500' }}
                />
                <Select
                  value={tenantFilter}
                  onChange={(event) => setTenantFilter(event.target.value)}
                  bg="whiteAlpha.900"
                  color="gray.900"
                >
                  <option value="all">すべての管理対象企業</option>
                  {managedTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </Select>
              </SimpleGrid>
              <Box overflowX="auto" borderWidth="1px" borderColor="whiteAlpha.200">
                <Table variant="simple" size="md" minW="1120px">
                  <Thead bg="whiteAlpha.080">
                    <Tr>
                      <Th><SortButton label="ID" column="id" onSort={handleSort} /></Th>
                      <Th><SortButton label="氏名" column="name" onSort={handleSort} /></Th>
                      <Th><SortButton label="フリガナ" column="nameKana" onSort={handleSort} /></Th>
                      <Th><SortButton label="メール" column="email" onSort={handleSort} /></Th>
                      <Th><SortButton label="会社名" column="company" onSort={handleSort} /></Th>
                      <Th><SortButton label="部署" column="department" onSort={handleSort} /></Th>
                      <Th><SortButton label="職種" column="jobTitle" onSort={handleSort} /></Th>
                      <Th><SortButton label="ステータス" column="status" onSort={handleSort} /></Th>
                      <Th><SortButton label="カルテ" column="karteStatus" onSort={handleSort} /></Th>
                      <Th color="whiteAlpha.900">操作</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {employees.map((employee) => {
                      const hasKarte = Boolean(employee.latestKarte);
                      return (
                        <Tr key={`${employee.tenantId}-${employee.id}`}>
                          <Td>{employee.id}</Td>
                          <Td>{employee.name}</Td>
                          <Td>{employee.nameKana || '-'}</Td>
                          <Td>{employee.email}</Td>
                          <Td fontWeight="semibold">{employee.company}</Td>
                          <Td>{employee.department || '-'}</Td>
                          <Td>{employee.jobTitle || '-'}</Td>
                          <Td>
                            <Badge colorScheme={employee.status === '完了' ? 'green' : 'gray'}>{employee.status}</Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={hasKarte ? 'green' : 'gray'}>{getKarteStatus(employee)}</Badge>
                          </Td>
                          <Td>
                            <Flex gap={2} wrap="wrap">
                              <Button size="sm" leftIcon={<FiEye />} {...outlineButtonProps} onClick={() => openKarte(employee)} isDisabled={!hasKarte}>
                                表示
                              </Button>
                              <Button size="sm" leftIcon={<FiFileText />} {...outlineButtonProps} onClick={() => downloadCsv(employee)} isDisabled={!hasKarte}>
                                CSV
                              </Button>
                              <Button size="sm" leftIcon={<FiDownload />} {...outlineButtonProps} onClick={() => void downloadPdf(employee)} isDisabled={!hasKarte}>
                                PDF
                              </Button>
                            </Flex>
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

      <Modal isOpen={karteModal.isOpen} onClose={karteModal.onClose} size="full" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.760" backdropFilter="blur(7px)" />
        <ModalContent bg="rgba(15, 23, 42, 0.98)" color="white" borderRadius="0" maxW={{ base: '100vw', xl: '1480px' }}>
          <ModalHeader>{viewingEmployee?.name ?? 'カルテ'} のカルテ</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            {viewingEmployee?.latestKarte ? <KartePanel data={viewingEmployee.latestKarte} /> : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default OperationsAdminHome;
