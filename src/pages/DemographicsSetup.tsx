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
import { type ClipboardEvent, type KeyboardEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import {
  applyDemographicsToKarte,
  createEmptyDemographics,
  loadDemoUserState,
  saveDemoUserState,
} from '../lib/demoUserState';
import { joinName, joinNameKana } from '../lib/demoAccounts';
import { JOB_TITLE_OPTIONS } from '../lib/jobTitles';
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

const decoratedPanelProps = {
  bg: 'transparent',
  color: 'white',
  borderRadius: '0',
  borderWidth: '0',
  p: { base: 5, md: 8 },
  position: 'relative',
  boxShadow: '0 28px 80px rgba(15, 23, 42, 0.34)',
  sx: { backdropFilter: 'blur(14px)' },
  _before: {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: { base: '5px', md: '7px' },
    bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.72), rgba(226, 232, 240, 0.88), transparent)',
  },
} as const;

const formFieldSurfaceProps = {
  bg: 'whiteAlpha.900',
  color: 'gray.900',
  borderColor: 'whiteAlpha.600',
  _placeholder: { color: 'gray.500' },
} as const;

const readOnlyFieldSurfaceProps = {
  bg: 'rgba(15, 23, 42, 0.64)',
  color: 'rgba(248, 250, 252, 0.88)',
  borderColor: 'rgba(148, 163, 184, 0.34)',
  cursor: 'default',
  opacity: 1,
  _placeholder: { color: 'rgba(203, 213, 225, 0.48)' },
  _readOnly: {
    bg: 'rgba(15, 23, 42, 0.64)',
    color: 'rgba(248, 250, 252, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.34)',
  },
  _hover: { borderColor: 'rgba(148, 163, 184, 0.44)' },
  _focus: {
    bg: 'rgba(15, 23, 42, 0.64)',
    borderColor: 'rgba(148, 163, 184, 0.44)',
    boxShadow: 'none',
  },
} as const;

const formatPlaceholder = (placeholder?: string) => {
  if (!placeholder) return undefined;
  return placeholder.startsWith('例:') ? placeholder : `例: ${placeholder}`;
};

type FieldDefinition = {
  key: keyof DemographicData;
  label: string;
  placeholder?: string;
  kind?: 'text' | 'number' | 'select' | 'date';
  min?: number;
  step?: number;
  options?: readonly string[];
  isReadOnly?: boolean;
};

const PREFECTURE_OPTIONS = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];

const FIELD_LABELS: FieldDefinition[] = [
  { key: 'lastName', label: '姓', placeholder: '山田', isReadOnly: true },
  { key: 'firstName', label: '名', placeholder: '花子', isReadOnly: true },
  { key: 'lastNameKana', label: 'フリガナ（姓）', placeholder: 'ヤマダ', isReadOnly: true },
  { key: 'firstNameKana', label: 'フリガナ（名）', placeholder: 'ハナコ', isReadOnly: true },
  { key: 'email', label: 'メール', placeholder: 'hanako.yamada@example.com', isReadOnly: true },
  { key: 'company', label: '会社名', placeholder: 'Career Carte Inc.', isReadOnly: true },
  { key: 'department', label: '部署', placeholder: 'Product Division' },
  { key: 'jobTitle', label: '職種', kind: 'select', options: JOB_TITLE_OPTIONS },
  { key: 'birthDate', label: '生年月日', placeholder: '1980-05-01', kind: 'date' },
  { key: 'workLocationPrefecture', label: '勤務地(都道府県)', kind: 'select', options: PREFECTURE_OPTIONS },
  { key: 'jobChangeCount', label: '転職歴(回数)', placeholder: '2', kind: 'number', min: 0, step: 1 },
  { key: 'yearsOfService', label: '勤続年数(年)', placeholder: '4', kind: 'number', min: 0, step: 1 },
  { key: 'gender', label: '性別', kind: 'select', options: ['男', '女', 'その他'] },
  { key: 'maritalStatus', label: '現在の婚姻関係', kind: 'select', options: ['独身', '既婚', 'その他', '回答しない'] },
  { key: 'childrenCount', label: '子供の有無(人)', kind: 'select', options: ['0', '1', '2', '3', '4以上', '回答しない'] },
  { key: 'youngestChildAge', label: '末子の年齢(歳)', placeholder: '4', kind: 'number', min: 0, step: 1 },
  { key: 'managerExperience', label: '過去にマネージャー経験があるか', kind: 'select', options: ['ある', 'ない', '回答しない'] },
  { key: 'currentManager', label: '現在マネージャーか', kind: 'select', options: ['はい', 'いいえ', '回答しない'] },
];

const NUMBER_FIELD_KEYS: Array<keyof DemographicData> = [
  'jobChangeCount',
  'yearsOfService',
  'youngestChildAge',
];

const normalizeNumberInput = (value: string) => {
  if (!value) return null;
  const sanitized = value.replace(/[^\d]/g, '');
  return sanitized ? sanitized : null;
};

const normalizeDateInput = (value: string | null | undefined) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return null;
};

const getDateInputValue = (value: string | null | undefined) => normalizeDateInput(value) ?? '';

const ALLOWED_NUMERIC_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

const normalizeFormValues = (values: DemographicData): DemographicData => {
  const normalized = { ...values };
  NUMBER_FIELD_KEYS.forEach((key) => {
    normalized[key] = normalizeNumberInput(normalized[key] ?? '');
  });
  normalized.birthDate = normalizeDateInput(normalized.birthDate);
  normalized.name = joinName(normalized.lastName, normalized.firstName);
  normalized.nameKana = joinNameKana(normalized.lastNameKana, normalized.firstNameKana);

  if (!normalized.childrenCount || normalized.childrenCount === '0' || normalized.childrenCount === '回答しない') {
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
  const isYoungestChildAgeDisabled = !childrenCountValue || childrenCountValue === '0' || childrenCountValue === '回答しない';

  const handleNumberKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || ALLOWED_NUMERIC_CONTROL_KEYS.has(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleNumberPaste = (event: ClipboardEvent<HTMLInputElement>, key: keyof DemographicData) => {
    const digits = event.clipboardData.getData('text').replace(/[^\d]/g, '');
    event.preventDefault();
    setFormValues((prev) => ({
      ...prev,
      [key]: digits || null,
    }));
  };

  const handleSave = () => {
    const currentState = loadDemoUserState();
    const normalizedValues = normalizeFormValues(formValues);
    const nextState = {
      ...currentState,
      demographicsSkipped: false,
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

  const handleSkipForDemo = () => {
    const currentState = loadDemoUserState();
    saveDemoUserState({
      ...currentState,
      demographicsSkipped: true,
    });
    toast({
      title: 'デモ用にスキップしました',
      description: 'あとからユーザーホームでプロフィールを入力できます。',
      status: 'info',
      duration: 2600,
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
        bgGradient="linear(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)"
        backgroundSize="300% 300%"
        animation={`${bgGradientAnim} 15s ease infinite`}
        py={{ base: 8, md: 12 }}
      >
        <Container maxW="4xl" animation={`${contentFadeIn} 4s ease-out forwards`}>
          <Stack spacing={8}>
            <Stack spacing={3}>
              <Heading
                size="lg"
                bgGradient="linear(110deg, #f1f5f9, #cbd5e1, #f8fafc, #94a3b8)"
                bgClip="text"
                backgroundSize="240% 240%"
                sx={{
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 1px 0 rgba(255, 255, 255, 0.22), 0 -1px 0 rgba(15, 23, 42, 0.55), 0 10px 24px rgba(15, 23, 42, 0.35)',
                  animation: 'demographicsTitleGradient 12s ease-in-out infinite',
                  '@keyframes demographicsTitleGradient': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                  },
                }}
              >
                プロフィール初期設定
              </Heading>
              <Text color="whiteAlpha.900" fontWeight="medium" textShadow="0 1px 3px rgba(0,0,0,0.2)">
                初回面談とユーザーホームで使う基本情報を登録します。未入力の項目があっても保存して進めます。
              </Text>
            </Stack>

            <Box {...decoratedPanelProps}>
              <Stack spacing={6}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                  {FIELD_LABELS.map((field) => (
                    <FormControl key={field.key}>
                      <FormLabel fontSize="sm" color="whiteAlpha.900" fontWeight="bold">
                        {field.label}
                      </FormLabel>
                      {field.kind === 'select' ? (
                        <Select
                          {...formFieldSurfaceProps}
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
                          {...formFieldSurfaceProps}
                          {...(field.isReadOnly ? readOnlyFieldSurfaceProps : {})}
                          type={field.kind === 'date' ? 'date' : 'text'}
                          inputMode={field.kind === 'number' ? 'numeric' : undefined}
                          pattern={field.kind === 'number' ? '[0-9]*' : undefined}
                          min={field.kind === 'date' ? '1900-01-01' : undefined}
                          max={field.kind === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
                          value={field.kind === 'date' ? getDateInputValue(formValues[field.key]) : formValues[field.key] ?? ''}
                          placeholder={formatPlaceholder(field.placeholder)}
                          isReadOnly={field.isReadOnly}
                          isDisabled={field.key === 'youngestChildAge' && isYoungestChildAgeDisabled}
                          onKeyDown={field.kind === 'number' ? handleNumberKeyDown : undefined}
                          onPaste={field.kind === 'number' ? (event) => handleNumberPaste(event, field.key) : undefined}
                          onChange={(event) =>
                            setFormValues((prev) => ({
                              ...prev,
                              [field.key]:
                                field.kind === 'number'
                                  ? normalizeNumberInput(event.target.value)
                                  : field.kind === 'date'
                                    ? event.target.value || null
                                  : event.target.value || null,
                            }))
                          }
                        />
                      )}
                    </FormControl>
                  ))}
                </SimpleGrid>

                <Stack direction={{ base: 'column', sm: 'row' }} justify="flex-end" spacing={3}>
                  <Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.160' }} onClick={() => navigate(returnTo)}>
                    キャンセル
                  </Button>
                  <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.160' }} onClick={handleSkipForDemo}>
                    デモ用にスキップして進む
                  </Button>
                  <PrimaryButton onClick={handleSave}>
                    保存して進む
                  </PrimaryButton>
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
