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
import { keyframes } from '@emotion/react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  applyDemographicsToKarte,
  createEmptyDemographics,
  loadDemoUserState,
  saveDemoUserState,
} from '../lib/demoUserState';
import type { DemographicData } from '../types';

const bgGradientAnim = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const introFadeOut = keyframes`
  0% { opacity: 1; visibility: visible; }
  80% { opacity: 1; visibility: visible; transform: scale(1); }
  100% { opacity: 0; visibility: hidden; transform: scale(1.1); }
`;

const waveDeform1 = keyframes`
  0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.05); }
  100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(360deg) scale(1); }
`;

const waveDeform2 = keyframes`
  0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(360deg) scale(1.1); }
  50% { transform: rotate(180deg) scale(0.95); }
  100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg) scale(1.1); }
`;

const contentFadeIn = keyframes`
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
`;

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
      demographicsSavedAt: new Date().toISOString(),
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
      title: 'プロフィールを保存しました',
      description: 'プロフィール設定を反映しました。',
      status: 'success',
      duration: 2400,
      isClosable: true,
    });
    navigate(returnTo);
  };

  return (
    <>
      <Box
        position="fixed"
        top={0}
        left={0}
        w="100vw"
        h="100vh"
        zIndex={9999}
        pointerEvents="none"
        animation={`${introFadeOut} 1s cubic-bezier(0.8, 0, 0.2, 1) forwards`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        bg="gray.900"
      >
        <Box
          position="absolute"
          w={{ base: '180vw', md: '120vw' }}
          h={{ base: '180vw', md: '120vw' }}
          bgGradient="linear(45deg, #1C0147, #0B194E, #3b0066, #001e36)"
          opacity={0.8}
          animation={`${waveDeform1} 6s linear infinite`}
          filter="blur(60px)"
        />
        <Box
          position="absolute"
          w={{ base: '160vw', md: '100vw' }}
          h={{ base: '160vw', md: '100vw' }}
          bgGradient="linear(-45deg, #090029, #020C26, #2d004d, #001A33)"
          opacity={0.7}
          animation={`${waveDeform2} 8s linear infinite`}
          filter="blur(70px)"
        />
        <Box
          position="absolute"
          w="100vw"
          h="100vh"
          bg="rgba(0,0,0,0.4)"
          sx={{ backdropFilter: 'blur(30px)' }}
        />
      </Box>

      <Box
        minH="100dvh"
        h="100dvh"
        overflowY="auto"
        bgGradient="linear(-45deg, gray.900, blue.900, purple.900, black)"
        backgroundSize="300% 300%"
        animation={`${bgGradientAnim} 15s ease infinite`}
        py={{ base: 8, md: 12 }}
      >
        <Container maxW="4xl" animation={`${contentFadeIn} 4s ease-out forwards`}>
          <Stack spacing={8}>
            <Stack spacing={3}>
              <Heading size="lg" color="white" textShadow="0 2px 4px rgba(0,0,0,0.3)">
                プロフィール初期設定
              </Heading>
              <Text color="whiteAlpha.900" fontWeight="medium" textShadow="0 1px 3px rgba(0,0,0,0.2)">
                初回面談とユーザーホームで使う基本情報を登録します。未入力の項目があっても保存して進めます。
              </Text>
            </Stack>

            <Box
              bg="rgba(255, 255, 255, 0.85)"
              sx={{ backdropFilter: 'blur(16px)' }}
              borderRadius="2xl"
              p={{ base: 5, md: 8 }}
              boxShadow="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.600"
            >
              <Stack spacing={6}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                  {FIELD_LABELS.map((field) => (
                    <FormControl key={field.key}>
                      <FormLabel fontSize="sm" color="gray.700" fontWeight="bold">
                        {field.label}
                      </FormLabel>
                      {field.kind === 'select' ? (
                        <Select
                          bg="white"
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
                          bg="white"
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
                  <Button variant="outline" bg="white" onClick={() => navigate(returnTo)}>
                    キャンセル
                  </Button>
                  <Button colorScheme="orange" boxShadow="md" onClick={handleSave}>
                    保存して進む
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

export default DemographicsSetup;
