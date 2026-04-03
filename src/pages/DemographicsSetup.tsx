import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  applyDemographicsToKarte,
  createEmptyDemographics,
  loadDemoUserState,
  saveDemoUserState,
} from '../lib/demoUserState';
import type { DemographicData } from '../types';

type FieldDefinition = {
  key: keyof DemographicData;
  label: string;
  placeholder?: string;
  kind?: 'text' | 'number' | 'select';
  min?: number;
  step?: number;
  options?: string[];
};

const FIELD_LABELS: FieldDefinition[] = [
  { key: 'name', label: '氏名', placeholder: '山田 花子' },
  { key: 'age', label: '年齢', placeholder: '32', kind: 'number', min: 0, step: 1 },
  { key: 'company', label: '所属企業', placeholder: 'Career Carte Inc.' },
  { key: 'jobTitle', label: '職種', placeholder: 'Product Manager' },
  { key: 'workLocationPrefecture', label: '勤務地(都道府県)', placeholder: '東京都' },
  { key: 'jobChangeCount', label: '転職歴(回数)', placeholder: '2', kind: 'number', min: 0, step: 1 },
  { key: 'yearsOfService', label: '勤続年数(年)', placeholder: '4', kind: 'number', min: 0, step: 1 },
  { key: 'gender', label: '性別', kind: 'select', options: ['男', '女', 'その他'] },
  { key: 'maritalStatus', label: '現在の婚姻関係', kind: 'select', options: ['独身', '既婚', 'その他'] },
  { key: 'childrenCount', label: '子供の有無(人)', placeholder: '1', kind: 'number', min: 0, step: 1 },
  { key: 'youngestChildAge', label: '末子の年齢(歳)', placeholder: '4', kind: 'number', min: 0, step: 1 },
];

const NUMBER_FIELD_KEYS: Array<keyof DemographicData> = [
  'age',
  'jobChangeCount',
  'yearsOfService',
  'childrenCount',
  'youngestChildAge',
];

const normalizeNumberInput = (value: string) => {
  if (!value) return null;
  const sanitized = value.replace(/[^\d]/g, '');
  return sanitized ? sanitized : null;
};

const normalizeFormValues = (values: DemographicData): DemographicData => {
  const normalized = { ...values };
  NUMBER_FIELD_KEYS.forEach((key) => {
    normalized[key] = normalizeNumberInput(normalized[key] ?? '');
  });

  if ((normalized.childrenCount ?? '0') === '0') {
    normalized.youngestChildAge = null;
  }

  return normalized;
};

function DemographicsSetup() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formValues, setFormValues] = useState<DemographicData>(() => {
    const stored = loadDemoUserState();
    return {
      ...createEmptyDemographics(),
      ...stored.demographics,
    };
  });

  const returnTo = useMemo(() => searchParams.get('returnTo') || '/user', [searchParams]);
  const childrenCountValue = formValues.childrenCount ?? '';
  const isYoungestChildAgeDisabled = !childrenCountValue || childrenCountValue === '0';

  const handleSave = () => {
    const currentState = loadDemoUserState();
    const normalizedValues = normalizeFormValues(formValues);
    const nextState = {
      ...currentState,
      demographics: { ...normalizedValues },
      latestKarte: currentState.latestKarte ? applyDemographicsToKarte(currentState.latestKarte, normalizedValues) : null,
      draftSessions: {
        initial: currentState.draftSessions.initial
          ? {
              ...currentState.draftSessions.initial,
              karte: applyDemographicsToKarte(currentState.draftSessions.initial.karte, normalizedValues),
            }
          : null,
        continuous: currentState.draftSessions.continuous
          ? {
              ...currentState.draftSessions.continuous,
              karte: applyDemographicsToKarte(currentState.draftSessions.continuous.karte, normalizedValues),
            }
          : null,
      },
    };

    saveDemoUserState(nextState);
    toast({
      title: 'デモグラフィックを保存しました',
      description: 'プロフィール設定を反映しました。',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
    navigate(returnTo);
  };

  return (
    <Box
      minH="100dvh"
      h="100dvh"
      overflowY="auto"
      bgGradient="linear(to-br, orange.50, white, teal.50)"
      py={{ base: 8, md: 12 }}
    >
      <Container maxW="4xl">
        <Stack spacing={8}>
          <Stack spacing={3}>
            <Heading size="lg">デモグラフィック初期設定</Heading>
            <Text color="gray.600">
              まだプロフィールが設定されていないため、初回面談とユーザーホームで使う基本情報を先に登録します。
            </Text>
          </Stack>

          <Box bg="white" borderRadius="2xl" p={{ base: 5, md: 8 }} boxShadow="xl" borderWidth="1px" borderColor="orange.100">
            <Stack spacing={6}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                {FIELD_LABELS.map((field) => (
                  <FormControl key={field.key}>
                    <FormLabel fontSize="sm" color="gray.700">
                      {field.label}
                    </FormLabel>
                    {field.kind === 'select' ? (
                      <Select
                        placeholder="選択してください"
                        value={formValues[field.key] ?? ''}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [field.key]: event.target.value || null,
                          }))
                        }
                      >
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        type={field.kind === 'number' ? 'number' : 'text'}
                        inputMode={field.kind === 'number' ? 'numeric' : undefined}
                        min={field.kind === 'number' ? field.min : undefined}
                        step={field.kind === 'number' ? field.step : undefined}
                        value={formValues[field.key] ?? ''}
                        placeholder={field.placeholder}
                        isDisabled={field.key === 'youngestChildAge' && isYoungestChildAgeDisabled}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [field.key]:
                              field.kind === 'number'
                                ? normalizeNumberInput(event.target.value)
                                : event.target.value || null,
                          }))
                        }
                      />
                    )}
                  </FormControl>
                ))}
              </SimpleGrid>

              <Stack direction={{ base: 'column', sm: 'row' }} justify="flex-end" spacing={3}>
                <Button variant="outline" onClick={() => navigate(returnTo)}>
                  キャンセル
                </Button>
                <Button colorScheme="orange" onClick={handleSave}>
                  保存して進む
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default DemographicsSetup;
