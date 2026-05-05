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
  getShirpDetailFieldEntries,
  getShirpDetailItemEntries,
  isShirpDetailCategoryKey,
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

const sectionPanelProps = {
  borderWidth: '1px',
  borderColor: 'rgba(255, 255, 255, 0.18)',
  borderRadius: '0',
  p: { base: 4, md: 5 },
  bg: 'rgba(15, 23, 42, 0.38)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
} as const;

const sectionTitleProps = {
  fontSize: 'sm',
  fontWeight: 'bold',
  color: 'rgba(255, 255, 255, 0.92)',
  letterSpacing: '0',
  mb: 3,
} as const;

const labelTextProps = {
  fontSize: 'xs',
  color: 'rgba(255, 255, 255, 0.65)',
} as const;

const valueTextProps = {
  fontWeight: 'semibold',
  fontSize: 'sm',
  color: 'rgba(255, 255, 255, 0.92)',
} as const;

const valueBoxProps = (hasValue: boolean) => ({
  borderWidth: '1px',
  borderColor: hasValue ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.16)',
  borderRadius: '0',
  p: 3,
  bg: hasValue ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.38)',
  color: hasValue ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.52)',
  fontSize: 'sm',
  fontStyle: hasValue ? 'normal' : 'italic',
  minH: '56px',
  whiteSpace: 'pre-wrap' as const,
  boxShadow: hasValue ? 'inset 3px 0 0 rgba(203, 213, 225, 0.42)' : 'none',
});

const KartePanel = ({ data, showCondition = false }: Props) => {
  const surveyScores = Object.keys(SURVEY_LABELS).map((key) => data.survey.factors[key as SurveyFactorKey] ?? 0);
  const hasSurvey = surveyScores.some((score) => score > 0);
  const conditionSummary = data.conditionSummary;

  return (
    <Box
      bg="linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 46%, rgba(51, 65, 85, 0.92) 100%)"
      color="white"
      borderRadius="0"
      borderWidth="1px"
      borderColor="rgba(255, 255, 255, 0.18)"
      pt={7}
      pb={6}
      px={{ base: 4, md: 6 }}
      w="full"
      position="relative"
      overflow="hidden"
      boxShadow="0 26px 80px rgba(2, 6, 23, 0.36)"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '5px',
        bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.72), rgba(241, 245, 249, 0.9), transparent)',
      }}
      _after={{
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        bg: 'radial-gradient(circle at 84% 10%, rgba(148, 163, 184, 0.14), transparent 30%)',
        opacity: 0.85,
      }}
      sx={{
        '@keyframes karte-panel-line': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '&::before': {
          backgroundSize: '200% 100%',
          animation: 'karte-panel-line 8s ease-in-out infinite',
        },
      }}
    >
      <Stack spacing={6}>
        <Box {...sectionPanelProps}>
          <Text {...sectionTitleProps}>
            プロフィール (個人情報)
          </Text>
          <Tabs variant="line">
            <TabList mb={3} borderColor="rgba(255, 255, 255, 0.22)">
              <Tab
                fontSize="sm"
                color="rgba(255, 255, 255, 0.7)"
                _selected={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.9)' }}
                _hover={{ color: 'white' }}
              >
                基本情報
              </Tab>
              <Tab
                fontSize="sm"
                color="rgba(255, 255, 255, 0.7)"
                _selected={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.9)' }}
                _hover={{ color: 'white' }}
              >
                個人情報詳細
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  <Box>
                    <Text {...labelTextProps}>氏名</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.name ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>年齢</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.age ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>所属企業</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.company ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>職種</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.jobTitle ?? '未入力'}
                    </Text>
                  </Box>
                </SimpleGrid>
              </TabPanel>
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  <Box>
                    <Text {...labelTextProps}>勤務地(都道府県)</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.workLocationPrefecture ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>転職歴(回数)</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.jobChangeCount ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>勤続年数(年)</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.yearsOfService ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>性別</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.gender ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>現在の婚姻関係</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.maritalStatus ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>子供の有無(人)</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.childrenCount ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>末子の年齢(歳)</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.youngestChildAge ?? '未入力'}
                    </Text>
                  </Box>
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Box {...sectionPanelProps}>
          <Text {...sectionTitleProps}>
            電子カルテ (SHIRP形式)
          </Text>
          <Stack spacing={3}>
            {SHIRP_KEYS.map((key) => {
              const value = data.shirp[key];
              return (
                <Box key={key}>
                  <Text fontSize="xs" fontWeight="bold" color="rgba(255, 255, 255, 0.8)" mb={1}>
                    {SHIRP_LABELS[key]}
                  </Text>
                  <Text fontSize="xs" color="rgba(255, 255, 255, 0.56)" mb={1}>
                    {SHIRP_HINTS[key]}
                  </Text>
                  <Box {...valueBoxProps(Boolean(value))}>
                    {value || '未聴取'}
                  </Box>
                  {isShirpDetailCategoryKey(key) && (
                    <Accordion allowToggle mt={2}>
                      <AccordionItem borderWidth="1px" borderColor="rgba(255, 255, 255, 0.18)" borderRadius="0" bg="rgba(15, 23, 42, 0.28)">
                        <AccordionButton px={3} py={2} _hover={{ bg: 'rgba(255, 255, 255, 0.12)' }}>
                          <Box flex="1" textAlign="left">
                            <Text fontSize="xs" fontWeight="bold" color="rgba(255, 255, 255, 0.76)">
                              詳細を確認
                            </Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pt={2}>
                          <Stack spacing={4}>
                            {getShirpDetailFieldEntries(key).map(([field, definition]) => {
                              const detailValue = data.shirpDetails[key]?.[field];
                              return (
                                <Box
                                  key={`${key}-${field}`}
                                  borderWidth="1px"
                                  borderColor="rgba(255, 255, 255, 0.16)"
                                  borderRadius="0"
                                  p={3}
                                  bg="rgba(15, 23, 42, 0.36)"
                                >
                                  <Text fontSize="xs" fontWeight="bold" color="rgba(255, 255, 255, 0.78)" mb={1}>
                                    {definition.label}
                                  </Text>
                                  <Box {...valueBoxProps(Boolean(detailValue?.summary))}>
                                    {detailValue?.summary || '未聴取'}
                                  </Box>
                                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mt={3}>
                                    {getShirpDetailItemEntries(key, field).map(([itemKey, itemLabel]) => {
                                      const itemValue = detailValue?.items?.[itemKey];
                                      return (
                                        <Box key={`${key}-${field}-${itemKey}`}>
                                          <Text {...labelTextProps} mb={1}>
                                            {itemLabel}
                                          </Text>
                                          <Box {...valueBoxProps(Boolean(itemValue))}>
                                            {itemValue || '未記載'}
                                          </Box>
                                        </Box>
                                      );
                                    })}
                                  </SimpleGrid>
                                </Box>
                              );
                            })}
                          </Stack>
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                  )}
                </Box>
              );
            })}
          </Stack>
          <Text fontSize="xs" color="rgba(255, 255, 255, 0.56)" textAlign="center" mt={4}>
            会話から自動で抽出・更新されます
          </Text>
        </Box>

        {showCondition && (
          <Box {...sectionPanelProps}>
            <Text {...sectionTitleProps}>
              面談時コンディション
            </Text>
            <Box
              borderWidth="1px"
              borderColor={conditionSummary ? 'orange.300' : 'rgba(255, 255, 255, 0.18)'}
              borderRadius="0"
              p={4}
              bg={conditionSummary ? 'rgba(124, 45, 18, 0.28)' : 'rgba(15, 23, 42, 0.38)'}
            >
              {conditionSummary ? (
                <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                  <Box>
                    <Text {...labelTextProps}>緊張度スコア</Text>
                    <Text {...valueTextProps}>
                      {conditionSummary.score} / 100
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>レベル</Text>
                    <Text {...valueTextProps}>
                      {conditionSummary.level}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>測定日時</Text>
                    <Text {...valueTextProps}>
                      {new Date(conditionSummary.measuredAt).toLocaleString('ja-JP')}
                    </Text>
                  </Box>
                </SimpleGrid>
              ) : (
                <Text fontSize="sm" color="rgba(255, 255, 255, 0.65)">
                  面談前コンディションチェックは未測定です。
                </Text>
              )}
            </Box>
          </Box>
        )}

        <Box {...sectionPanelProps}>
          <Text {...sectionTitleProps}>
            ユーザーアンケート結果
          </Text>
          <Box borderWidth="1px" borderColor="rgba(255, 255, 255, 0.18)" borderRadius="0" p={4} bg="rgba(15, 23, 42, 0.38)">
            {hasSurvey ? (
              <Stack spacing={4}>
                <SurveyRadar
                  labels={Object.values(SURVEY_LABELS)}
                  values={surveyScores}
                  labelColor="#f8fafc"
                  labelStroke="#0f172a"
                />
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  {Object.entries(SURVEY_LABELS).map(([key, label]) => (
                    <Box key={key}>
                      <Text {...labelTextProps}>
                        {label}
                      </Text>
                      <Text {...valueTextProps}>
                        {data.survey.factors[key as SurveyFactorKey] ?? 0}点 / 100点
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <Text fontSize="xs" color="rgba(255, 255, 255, 0.56)">
                  最終更新: {data.survey.lastUpdated ?? '未回答'}
                </Text>
              </Stack>
            ) : (
              <Text fontSize="sm" color="rgba(255, 255, 255, 0.65)">
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
