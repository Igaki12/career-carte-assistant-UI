import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import SurveyRadar from './SurveyRadar';
import { SHIRP_KEYS } from '../types';
import type { KarteData, ShirpKey, SurveyFactorKey } from '../types';

const SHIRP_LABELS: Record<ShirpKey, string> = {
  S: 'S. 現状 (Satisfaction/現状)',
  H: 'H. 希望 (Hope/希望)',
  I: 'I. 課題 (Issue/課題)',
  R: 'R. 資源 (Resource/資源)',
  P: 'P. プラン (Plan/プラン)',
  '#': '# その他 (自由記述)',
};

const SHIRP_HINTS: Record<ShirpKey, string> = {
  S: '組織適応 / 自身への評価 / 良好な人間関係 / #そのほかの現状',
  H: '希望する収入 / 希望する仕事内容 / 希望する勤務形態 / #そのほかの希望',
  I: 'スキルの課題 / 健康上の課題 / 年齢の課題 / 家庭の課題 / #そのほかの課題',
  R: '強みとなる資格 / 強みとなる経験 / 強みとなる協力者 / 強みとなる時間や資金 / #そのほかの強み',
  P: 'S〜Rの情報を元に、AIが解決に向けたプランを生成する',
  '#': 'S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄',
};

const SURVEY_LABELS: Record<SurveyFactorKey, string> = {
  growth_orientation: '成長志向',
  problem_solving_orientation: '課題解決志向',
  organization_contribution_orientation: '組織貢献志向',
  interpersonal_adaptation_orientation: '対人適応志向',
  emotional_response_tendency: '情動反応傾向',
};

type Props = {
  data: KarteData;
};

const KartePanel = ({ data }: Props) => {
  const surveyScores = Object.keys(SURVEY_LABELS).map((key) => data.survey.factors[key as SurveyFactorKey] ?? 0);
  const hasSurvey = surveyScores.some((score) => score > 0);

  return (
    <Box bg="white" borderRadius="2xl" pt={6} pb={6} w="full">
      <Stack spacing={6}>
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={3}>
            デモグラフィック (個人情報)
          </Text>
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
                </Box>
              );
            })}
          </Stack>
          <Text fontSize="xs" color="gray.500" textAlign="center" mt={4}>
            会話から自動で抽出・更新されます
          </Text>
        </Box>

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
