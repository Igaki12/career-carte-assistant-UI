import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import SurveyRadar from './SurveyRadar';
import {
  isShirpDetailCategoryKey,
  SHIRP_DETAIL_FIELDS,
  SHIRP_DETAIL_LABELS,
  SHIRP_HINTS,
  SHIRP_LABELS,
} from '../lib/shirp';
import { SHIRP_KEYS } from '../types';
import type { KarteData, SurveyFactorKey } from '../types';

const SURVEY_LABELS: Record<SurveyFactorKey, string> = {
  growth_orientation: '成長志向',
  problem_solving_orientation: '課題解決志向',
  organization_contribution_orientation: '組織貢献志向',
  interpersonal_adaptation_orientation: '対人適応志向',
  emotional_response_tendency: '情動反応傾向',
};

type Props = {
  data: KarteData;
  showCondition?: boolean;
};

const KartePanel = ({ data, showCondition = false }: Props) => {
  const surveyScores = Object.keys(SURVEY_LABELS).map((key) => data.survey.factors[key as SurveyFactorKey] ?? 0);
  const hasSurvey = surveyScores.some((score) => score > 0);
  const conditionSummary = data.conditionSummary;

  return (
    <Box bg="white" borderRadius="2xl" pt={6} pb={6} w="full">
      <Stack spacing={6}>
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={3}>
            プロフィール (個人情報)
          </Text>
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList mb={3}>
              <Tab fontSize="sm">基本情報</Tab>
              <Tab fontSize="sm">個人情報詳細</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">氏名</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.name ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">年齢</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.age ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">所属企業</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.company ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">職種</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.jobTitle ?? '未入力'}
                    </Text>
                  </Box>
                </SimpleGrid>
              </TabPanel>
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">勤務地(都道府県)</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.workLocationPrefecture ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">転職歴(回数)</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.jobChangeCount ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">勤続年数(年)</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.yearsOfService ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">性別</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.gender ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">現在の婚姻関係</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.maritalStatus ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">子供の有無(人)</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.childrenCount ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">末子の年齢(歳)</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {data.demographics.youngestChildAge ?? '未入力'}
                    </Text>
                  </Box>
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={3}>
            電子カルテ (SHIRP形式)
          </Text>
          <Stack spacing={3}>
            {SHIRP_KEYS.map((key) => {
              const value = data.shirp[key];
              return (
                <Box key={key}>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                    {SHIRP_LABELS[key]}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mb={1}>
                    {SHIRP_HINTS[key]}
                  </Text>
                  <Box
                    borderWidth="1px"
                    borderRadius="lg"
                    p={3}
                    bg={value ? 'blue.50' : 'white'}
                    color={value ? 'gray.800' : 'gray.400'}
                    fontSize="sm"
                    fontStyle={value ? 'normal' : 'italic'}
                    minH="56px"
                    whiteSpace="pre-wrap"
                  >
                    {value || '未聴取'}
                  </Box>
                  {isShirpDetailCategoryKey(key) && (
                    <Accordion allowToggle mt={2}>
                      <AccordionItem borderWidth="1px" borderColor="gray.200" borderRadius="lg">
                        <AccordionButton px={3} py={2}>
                          <Box flex="1" textAlign="left">
                            <Text fontSize="xs" fontWeight="bold" color="gray.600">
                              詳細を確認
                            </Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pt={2}>
                          {(() => {
                            const detailLabels = SHIRP_DETAIL_LABELS[key] as Record<string, string>;
                            const detailValues = data.shirpDetails[key] as Record<string, string | null>;
                            return (
                          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                            {SHIRP_DETAIL_FIELDS[key].map((field) => {
                              const detailValue = detailValues[field];
                              return (
                                <Box key={`${key}-${field}`}>
                                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                                    {detailLabels[field]}
                                  </Text>
                                  <Box
                                    borderWidth="1px"
                                    borderRadius="md"
                                    p={3}
                                    bg={detailValue ? 'gray.50' : 'white'}
                                    color={detailValue ? 'gray.800' : 'gray.400'}
                                    fontSize="sm"
                                    fontStyle={detailValue ? 'normal' : 'italic'}
                                    minH="56px"
                                    whiteSpace="pre-wrap"
                                  >
                                    {detailValue || '未聴取'}
                                  </Box>
                                </Box>
                              );
                            })}
                          </SimpleGrid>
                            );
                          })()}
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  )}
                </Box>
              );
            })}
          </Stack>
          <Text fontSize="xs" color="gray.500" textAlign="center" mt={4}>
            会話から自動で抽出・更新されます
          </Text>
        </Box>

        {showCondition && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={3}>
              面談時コンディション
            </Text>
            <Box borderWidth="1px" borderRadius="xl" p={4} bg={conditionSummary ? 'orange.50' : 'gray.50'}>
              {conditionSummary ? (
                <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">緊張度スコア</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {conditionSummary.score} / 100
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">レベル</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {conditionSummary.level}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">測定日時</Text>
                    <Text fontWeight="semibold" fontSize="sm">
                      {new Date(conditionSummary.measuredAt).toLocaleString('ja-JP')}
                    </Text>
                  </Box>
                </SimpleGrid>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  面談前コンディションチェックは未測定です。
                </Text>
              )}
            </Box>
          </Box>
        )}

        <Box>
          <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={3}>
            ユーザーアンケート結果
          </Text>
          <Box borderWidth="1px" borderRadius="xl" p={4} bg="gray.50">
            {hasSurvey ? (
              <Stack spacing={4}>
                <SurveyRadar
                  labels={Object.values(SURVEY_LABELS)}
                  values={surveyScores}
                />
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  {Object.entries(SURVEY_LABELS).map(([key, label]) => (
                    <Box key={key}>
                      <Text fontSize="xs" color="gray.500">
                        {label}
                      </Text>
                      <Text fontWeight="semibold" fontSize="sm">
                        {data.survey.factors[key as SurveyFactorKey] ?? 0}点 / 100点
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <Text fontSize="xs" color="gray.500">
                  最終更新: {data.survey.lastUpdated ?? '未回答'}
                </Text>
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                アンケートは未回答です。回答するとレーダーチャートが表示されます。
              </Text>
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default KartePanel;
