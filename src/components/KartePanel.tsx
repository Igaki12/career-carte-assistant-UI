import { Badge, Box, Flex, Stack, Text } from '@chakra-ui/react';
import type { KarteData, KarteKey } from '../types';

const LABELS: Record<KarteKey, string> = {
  A: 'A. 主訴 (いま困っていること)',
  B: 'B. キャリア歴 (経験・転機)',
  C: 'C. 現在の業務状況',
  D: 'D. キャリア観・価値観',
  E: 'E. 将来イメージ (3~5年後)',
  F: 'F. 学び・成長ニーズ',
  G: 'G. 面談で話したいテーマ',
};

type Props = {
  data: KarteData;
};

const KartePanel = ({ data }: Props) => {
  const filledCount = (Object.keys(data) as KarteKey[]).reduce((acc, key) => (data[key] ? acc + 1 : acc), 0);
  const progress = Math.round((filledCount / 7) * 100);

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="lg"
      p={4}
      w="full"
      maxH={{ base: 'none', xl: 'calc(100vh - 160px)' }}
      overflowY="auto"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontWeight="bold" fontSize="sm">
          <Text as="span" mr={2} color="blue.500">
            📋
          </Text>
          キャリアカルテ
        </Text>
        <Badge colorScheme={progress === 100 ? 'green' : 'purple'} borderRadius="md">
          {progress}%
        </Badge>
      </Flex>
      <Stack spacing={3}>
        {(Object.keys(LABELS) as KarteKey[]).map((key) => {
          const value = data[key];
          return (
            <Box key={key}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                {LABELS[key]}
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
  );
};

export default KartePanel;
