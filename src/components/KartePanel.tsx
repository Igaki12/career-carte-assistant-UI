import { Box, Stack, Text } from '@chakra-ui/react';
import { KARTE_KEYS } from '../types';
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
  return (
    <Box
      bg="white"
      borderRadius="2xl"
      pt={6}
      pb={6}
      w="full"
    >
      <Stack spacing={3}>
        {KARTE_KEYS.map((key) => {
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
