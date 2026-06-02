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
  lightBorder,
  lightBorderStrong,
  lightMutedText,
  lightPanelBg,
  lightPanelStrongBg,
  lightPanelSubtleBg,
  lightShadow,
  lightSubtleText,
  lightText,
} from '../lib/lightThemeTokens';
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
  borderColor: lightBorder,
  borderRadius: '0',
  p: { base: 4, md: 5 },
  bg: lightPanelSubtleBg,
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.72)',
} as const;

const sectionTitleProps = {
  fontSize: 'sm',
  fontWeight: 'bold',
  color: lightText,
  letterSpacing: '0',
  mb: 3,
} as const;

const labelTextProps = {
  fontSize: 'xs',
  color: lightMutedText,
} as const;

const valueTextProps = {
  fontWeight: 'semibold',
  fontSize: 'sm',
  color: lightText,
} as const;

const valueBoxProps = (hasValue: boolean) => ({
  borderWidth: '1px',
  borderColor: hasValue ? lightBorderStrong : lightBorder,
  borderRadius: '0',
  p: 3,
  bg: hasValue ? lightPanelStrongBg : lightPanelSubtleBg,
  color: hasValue ? lightText : lightSubtleText,
  fontSize: 'sm',
  fontStyle: hasValue ? 'normal' : 'italic',
  minH: '56px',
  whiteSpace: 'pre-wrap' as const,
  boxShadow: hasValue ? 'inset 3px 0 0 rgba(100, 116, 139, 0.34)' : 'none',
});

const KartePanel = ({ data, showCondition = false }: Props) => {
  const surveyScores = Object.keys(SURVEY_LABELS).map((key) => data.survey.factors[key as SurveyFactorKey] ?? 0);
  const hasSurvey = surveyScores.some((score) => score > 0);
  const conditionSummary = data.conditionSummary;

  return (
    <Box
      bg="linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 46%, rgba(226, 232, 240, 0.92) 100%)"
      color={lightText}
      borderRadius="0"
      borderWidth="1px"
      borderColor={lightBorder}
      pt={7}
      pb={6}
      px={{ base: 4, md: 6 }}
      w="full"
      position="relative"
      overflow="hidden"
      boxShadow={lightShadow}
      _after={{
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        bg: 'radial-gradient(circle at 84% 10%, rgba(148, 163, 184, 0.18), transparent 30%)',
        opacity: 0.85,
      }}
    >
      <Stack spacing={6}>
        <Box {...sectionPanelProps}>
          <Text {...sectionTitleProps}>
            プロフィール (個人情報)
          </Text>
          <Tabs variant="line">
            <TabList mb={3} borderColor={lightBorder}>
              <Tab
                fontSize="sm"
                color={lightMutedText}
                _selected={{ color: lightText, borderColor: lightBorderStrong }}
                _hover={{ color: lightText }}
              >
                基本情報
              </Tab>
              <Tab
                fontSize="sm"
                color={lightMutedText}
                _selected={{ color: lightText, borderColor: lightBorderStrong }}
                _hover={{ color: lightText }}
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
                    <Text {...labelTextProps}>フリガナ</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.nameKana ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>メール</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.email ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>会社名</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.company ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>部署</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.department ?? '未入力'}
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
                    <Text {...labelTextProps}>生年月日</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.birthDate ?? '未入力'}
                    </Text>
                  </Box>
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
                  <Box>
                    <Text {...labelTextProps}>過去のマネージャー経験</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.managerExperience ?? '未入力'}
                    </Text>
                  </Box>
                  <Box>
                    <Text {...labelTextProps}>現在マネージャーか</Text>
                    <Text {...valueTextProps}>
                      {data.demographics.currentManager ?? '未入力'}
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
                  <Text fontSize="xs" fontWeight="bold" color={lightText} mb={1}>
                    {SHIRP_LABELS[key]}
                  </Text>
                  <Text fontSize="xs" color={lightSubtleText} mb={1}>
                    {SHIRP_HINTS[key]}
                  </Text>
                  <Box {...valueBoxProps(Boolean(value))}>
                    {value || '未聴取'}
                  </Box>
                  {isShirpDetailCategoryKey(key) && (
                    <Accordion allowToggle mt={2}>
                      <AccordionItem borderWidth="1px" borderColor={lightBorder} borderRadius="0" bg={lightPanelSubtleBg}>
                        <AccordionButton px={3} py={2} _hover={{ bg: 'gray.100' }}>
                          <Box flex="1" textAlign="left">
                            <Text fontSize="xs" fontWeight="bold" color={lightMutedText}>
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
                                  borderColor={lightBorder}
                                  borderRadius="0"
                                  p={3}
                                  bg={lightPanelBg}
                                >
                                  <Text fontSize="xs" fontWeight="bold" color={lightText} mb={1}>
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
          <Text fontSize="xs" color={lightSubtleText} textAlign="center" mt={4}>
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
              borderColor={conditionSummary ? 'orange.300' : lightBorder}
              borderRadius="0"
              p={4}
              bg={conditionSummary ? 'orange.50' : lightPanelSubtleBg}
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
                <Text fontSize="sm" color={lightMutedText}>
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
          <Box borderWidth="1px" borderColor={lightBorder} borderRadius="0" p={4} bg={lightPanelSubtleBg}>
            {hasSurvey ? (
              <Stack spacing={4}>
                <SurveyRadar
                  labels={Object.values(SURVEY_LABELS)}
                  values={surveyScores}
                  labelColor="#334155"
                  labelStroke="#ffffff"
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
                <Text fontSize="xs" color={lightSubtleText}>
                  最終更新: {data.survey.lastUpdated ?? '未回答'}
                </Text>
              </Stack>
            ) : (
              <Text fontSize="sm" color={lightMutedText}>
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
