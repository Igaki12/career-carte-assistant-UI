import {
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createConditionSummary,
  getLatestConditionRecord,
  isStressAnalysisEnabled,
  loadDemoUserState,
  saveDemoUserState,
  upsertConditionRecord,
} from '../lib/demoUserState';

const formatMeasuredAt = (value: string | null | undefined) => {
  if (!value) return '未測定';
  return new Date(value).toLocaleString('ja-JP');
};

function ConditionCheck() {
  const toast = useToast();
  const navigate = useNavigate();
  const [userState, setUserState] = useState(() => loadDemoUserState());
  const latestCondition = useMemo(() => getLatestConditionRecord(userState), [userState]);
  const [score, setScore] = useState(() => latestCondition?.score.toString() ?? '55');
  const stressEnabled = isStressAnalysisEnabled(userState);

  const handleGenerateDemoScore = () => {
    const nextScore = Math.round(35 + Math.random() * 45);
    setScore(nextScore.toString());
  };

  const handleSave = () => {
    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      toast({
        title: 'スコアを確認してください',
        description: '0から100の範囲で入力してください。',
        status: 'warning',
        duration: 2600,
        isClosable: true,
      });
      return;
    }

    const currentState = loadDemoUserState();
    const summary = createConditionSummary(numericScore);
    const nextState = upsertConditionRecord(currentState, summary);
    saveDemoUserState(nextState);
    setUserState(nextState);
    toast({
      title: 'コンディションを保存しました',
      description: '面談画面とカルテに反映します。',
      status: 'success',
      duration: 2600,
      isClosable: true,
    });
    navigate('/user');
  };

  return (
    <Box minH="100dvh" bgGradient="linear(to-br, #ffffff, #f7f7f8, #eeeeef)" py={{ base: 8, md: 12 }}>
      <Container maxW="3xl">
        <Stack spacing={6}>
          <Stack spacing={2}>
            <Heading size="lg">面談前コンディションチェック</Heading>
            <Text color="#3f6678">
              この機能は表情から面談前後の緊張傾向を参考値として表示する想定のデモです。医療・心理診断ではありません。
            </Text>
          </Stack>

          <Box bg="#fbfdfe" borderRadius="xl" borderWidth="1px" borderColor="orange.100" boxShadow="sm" p={{ base: 5, md: 7 }}>
            <Stack spacing={5}>
              <Stack spacing={2}>
                <Badge alignSelf="flex-start" colorScheme={stressEnabled ? 'orange' : 'cyan'}>
                  {stressEnabled ? '契約オプション有効' : '契約オプション未有効'}
                </Badge>
                <Text fontSize="sm" color="#3f6678">
                  顔画像・動画は保存しません。現時点では実測せず、ダミースコアは画面確認用の一時状態として扱います。
                </Text>
                <Text fontSize="sm" color="#66889a">
                  直近の測定: {latestCondition ? `${latestCondition.score} / 100 (${latestCondition.level})` : '未測定'}
                  {' / '}
                  {formatMeasuredAt(latestCondition?.measuredAt)}
                </Text>
              </Stack>

              {!stressEnabled ? (
                <Box borderWidth="1px" borderRadius="lg" bg="rgba(232, 243, 248, 0.84)" borderColor="rgba(22, 94, 131, 0.18)" p={4}>
                  <Text fontSize="sm" color="#3f6678">
                    現在の企業では面談前コンディションチェックが無効です。管理画面または企業管理者画面で有効化できます。
                  </Text>
                </Box>
              ) : (
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>ダミー緊張度スコア</FormLabel>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={score}
                      onChange={(event) => setScore(event.target.value)}
                    />
                  </FormControl>
                  <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
                    <Button variant="outline" colorScheme="orange" onClick={handleGenerateDemoScore}>
                      ダミースコアを生成
                    </Button>
                    <Button colorScheme="orange" onClick={handleSave}>
                      保存してユーザーホームへ戻る
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Box>

          <Button alignSelf="flex-start" variant="outline" onClick={() => navigate('/user')}>
            ユーザーホームへ戻る
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

export default ConditionCheck;
