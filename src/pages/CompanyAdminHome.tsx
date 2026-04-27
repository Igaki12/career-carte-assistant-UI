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
import {
  DEFAULT_DEMO_USER_ID,
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
import type { DemoUserState } from '../types';

function CompanyAdminHome() {
  const toast = useToast();
  const navigate = useNavigate();
  const [userState, setUserState] = useState<DemoUserState>(() => loadDemoUserState());
  const [usageQuota, setUsageQuota] = useState<DemoUsageQuota>(() => getDemoUsageQuota());
  const [quotaForm, setQuotaForm] = useState({
    initialMonthlyLimit: '',
    continuousMonthlyLimit: '',
    initialLlmCallsPerInterview: '',
    continuousLlmCallsPerInterview: '',
  });
  const tenantId = resolveTenantId(userState);
  const tenant = userState.tenants.find((entry) => entry.id === tenantId) ?? userState.tenants[0];
  const flags = getTenantFeatureFlags(userState, tenantId);
  const tenantConditionRecords = useMemo(
    () => userState.conditionRecords.filter((record) => record.tenantId === tenantId),
    [tenantId, userState.conditionRecords],
  );
  const latestMeasuredAt = tenantConditionRecords[0]?.measuredAt
    ? new Date(tenantConditionRecords[0].measuredAt).toLocaleString('ja-JP')
    : '未測定';
  const initialQuota = getMeetingQuotaSummary(usageQuota, 'initial');
  const continuousQuota = getMeetingQuotaSummary(usageQuota, 'continuous');

  useEffect(() => subscribeDemoUsageQuota(setUsageQuota), []);

  useEffect(() => {
    setQuotaForm({
      initialMonthlyLimit: usageQuota.initialMonthlyLimit.toString(),
      continuousMonthlyLimit: usageQuota.continuousMonthlyLimit.toString(),
      initialLlmCallsPerInterview: usageQuota.initialLlmCallsPerInterview.toString(),
      continuousLlmCallsPerInterview: usageQuota.continuousLlmCallsPerInterview.toString(),
    });
  }, [usageQuota]);

  const persistState = (nextState: DemoUserState) => {
    setUserState(nextState);
    saveDemoUserState(nextState);
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
    <Box
      bgGradient="linear(to-br, gray.50, pink.50, gray.100)"
      height="100dvh"
      overflowY="scroll"
      py={{ base: 8, md: 12 }}
    >
      <Container maxW="6xl">
        <Stack spacing={8}>
          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="pink.100" boxShadow="sm" p={{ base: 5, md: 8 }}>
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
              <Stack spacing={2}>
                <Heading size="lg">企業管理者ホーム</Heading>
                <Text color="gray.600">
                  {tenant?.name ?? 'デモ企業'} の社員アカウントと契約オプションを管理します。
                </Text>
                <Flex gap={2} wrap="wrap">
                  <Badge colorScheme="pink">tenantId: {tenantId}</Badge>
                  <Badge colorScheme={tenant?.status === 'active' ? 'green' : 'gray'}>
                    {tenant?.status ?? 'active'}
                  </Badge>
                </Flex>
              </Stack>
              <Button variant="outline" onClick={() => navigate('/')}>
                ホームへ戻る
              </Button>
            </Flex>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
            <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>社員アカウント</StatLabel>
                <StatNumber>1</StatNumber>
              </Stat>
            </Box>
            <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>コンディション測定件数</StatLabel>
                <StatNumber>{tenantConditionRecords.length}</StatNumber>
              </Stat>
              <Text mt={2} fontSize="xs" color="gray.500">
                直近: {latestMeasuredAt}
              </Text>
            </Box>
            <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.100" p={5}>
              <Stat>
                <StatLabel>緊張度スコア表示</StatLabel>
                <StatNumber>{flags.stressAnalysisEnabled ? 'ON' : 'OFF'}</StatNumber>
              </Stat>
            </Box>
          </SimpleGrid>

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.100" boxShadow="sm" p={{ base: 5, md: 7 }}>
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

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.100" boxShadow="sm" p={{ base: 5, md: 7 }}>
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
                  初回面談: 使用済み{initialQuota.used}回 / 残り{initialQuota.remaining}回、継続面談: 使用済み{continuousQuota.used}回 / 残り{continuousQuota.remaining}回
                </Text>
                <Button type="submit" colorScheme="pink" alignSelf="flex-start">
                  設定を保存
                </Button>
              </Stack>
            </form>
          </Box>

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.100" boxShadow="sm" p={{ base: 5, md: 7 }} overflowX="auto">
            <Stack spacing={4}>
              <Heading size="md">自社ユーザー</Heading>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>氏名</Th>
                    <Th>所属企業</Th>
                    <Th>初回面談残り</Th>
                    <Th>継続面談残り</Th>
                    <Th>AI使用可能回数/面談</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>{DEFAULT_DEMO_USER_ID}</Td>
                    <Td>{userState.demographics.name || '未設定'}</Td>
                    <Td>{tenant?.name ?? 'デモ企業'}</Td>
                    <Td>上限{initialQuota.limit} / 使用{initialQuota.used} / 残{initialQuota.remaining}</Td>
                    <Td>上限{continuousQuota.limit} / 使用{continuousQuota.used} / 残{continuousQuota.remaining}</Td>
                    <Td>初回面談{initialQuota.llmCallsPerInterview}回 / 継続面談{continuousQuota.llmCallsPerInterview}回</Td>
                  </Tr>
                </Tbody>
              </Table>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default CompanyAdminHome;
