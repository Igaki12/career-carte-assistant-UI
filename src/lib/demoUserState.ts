import type {
  ConditionRecord,
  ConditionSummary,
  DemoUserState,
  DemographicData,
  DraftSession,
  KarteData,
  MeetingType,
  SurveyResult,
  Tenant,
  TenantFeatureFlags,
} from '../types';
import { cloneShirpDetails, createEmptyShirpDetails } from './shirp';

export const LOCAL_STORAGE_DEMO_USER_KEY = 'cca-demo-user-state';
export const LEGACY_LOCAL_STORAGE_KARTE_KEY = 'cca-karte';
export const DEFAULT_TENANT_ID = 'tenant-career-carte-demo';
export const DEFAULT_DEMO_USER_ID = 'USR-2024-021';
export const CONDITION_CONSENT_VERSION = 'condition-demo-v1';

export const createDefaultTenants = (): Tenant[] => [
  {
    id: DEFAULT_TENANT_ID,
    name: 'Career Carte Inc.',
    status: 'active',
    plan: 'demo',
    enabledFeatures: ['stressAnalysis', 'turnTaking'],
    createdAt: '2026-04-10',
  },
  {
    id: 'tenant-connect-systems',
    name: 'Connect Systems',
    status: 'active',
    plan: 'standard',
    enabledFeatures: ['turnTaking'],
    createdAt: '2026-04-10',
  },
];

export const createDefaultFeatureFlags = (): TenantFeatureFlags[] => [
  {
    tenantId: DEFAULT_TENANT_ID,
    stressAnalysisEnabled: true,
    turnTakingEnabled: true,
    lightThemeEnabled: false,
  },
  {
    tenantId: 'tenant-connect-systems',
    stressAnalysisEnabled: false,
    turnTakingEnabled: true,
    lightThemeEnabled: false,
  },
];

export const createEmptyDemographics = (): DemographicData => ({
  name: null,
  age: null,
  company: null,
  jobTitle: null,
  workLocationPrefecture: null,
  jobChangeCount: null,
  yearsOfService: null,
  gender: null,
  maritalStatus: null,
  childrenCount: null,
  youngestChildAge: null,
});

export const createEmptySurvey = (): SurveyResult => ({
  factors: {
    growth_orientation: null,
    problem_solving_orientation: null,
    organization_contribution_orientation: null,
    interpersonal_adaptation_orientation: null,
    emotional_response_tendency: null,
  },
  lastUpdated: null,
});

export const createEmptyKarte = (): KarteData => ({
  demographics: createEmptyDemographics(),
  shirp: {
    S: null,
    H: null,
    I: null,
    R: null,
    P: null,
    '#': null,
  },
  shirpDetails: createEmptyShirpDetails(),
  survey: createEmptySurvey(),
  conditionSummary: null,
});

export const createEmptyDemoUserState = (): DemoUserState => ({
  tenantId: DEFAULT_TENANT_ID,
  tenants: createDefaultTenants(),
  featureFlags: createDefaultFeatureFlags(),
  conditionRecords: [],
  demographicsSkipped: false,
  demographics: createEmptyDemographics(),
  demographicsSavedAt: null,
  latestKarte: null,
  karteRecords: [],
  draftSessions: {
    initial: null,
    continuous: null,
  },
});

export const hasConfiguredDemographics = (demographics: DemographicData | null | undefined) =>
  Boolean(
    demographics &&
      Object.values(demographics).some((value) => typeof value === 'string' && value.trim().length > 0),
  );

export const hasSavedDemographics = (state: Pick<DemoUserState, 'demographics' | 'demographicsSavedAt'> | null | undefined) =>
  Boolean(state?.demographicsSavedAt || hasConfiguredDemographics(state?.demographics));

export const canEnterWithDemographics = (
  state: Pick<DemoUserState, 'demographics' | 'demographicsSavedAt' | 'demographicsSkipped'> | null | undefined,
) => Boolean(hasSavedDemographics(state) || state?.demographicsSkipped);

export const mergeDemographics = (
  base: DemographicData | null | undefined,
  incoming: DemographicData | null | undefined,
): DemographicData => {
  return {
    ...createEmptyDemographics(),
    ...(base ?? {}),
    ...(incoming ?? {}),
  };
};

export const applyDemographicsToKarte = (
  karte: KarteData | null | undefined,
  demographics: DemographicData | null | undefined,
): KarteData => {
  const nextKarte = karte ? { ...karte } : createEmptyKarte();
  return {
    ...nextKarte,
    demographics: mergeDemographics(nextKarte.demographics, demographics),
    shirpDetails: nextKarte.shirpDetails ? cloneShirpDetails(nextKarte.shirpDetails) : createEmptyShirpDetails(),
    survey: nextKarte.survey ?? createEmptySurvey(),
    conditionSummary: nextKarte.conditionSummary ?? null,
  };
};

export const getConditionLevel = (score: number) => {
  if (score >= 70) return '高め';
  if (score >= 40) return '標準';
  return '低め';
};

export const createConditionSummary = (score: number, measuredAt = new Date().toISOString()): ConditionSummary => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: normalizedScore,
    level: getConditionLevel(normalizedScore),
    measuredAt,
    source: 'demo',
    consentVersion: CONDITION_CONSENT_VERSION,
  };
};

export const applyConditionToKarte = (
  karte: KarteData | null | undefined,
  conditionSummary: ConditionSummary | null | undefined,
): KarteData => ({
  ...(karte ?? createEmptyKarte()),
  conditionSummary: conditionSummary ?? null,
});

export const resolveTenantId = (state: Pick<DemoUserState, 'tenantId'> | null | undefined) =>
  state?.tenantId || DEFAULT_TENANT_ID;

export const getTenantFeatureFlags = (
  state: Pick<DemoUserState, 'featureFlags' | 'tenantId'> | null | undefined,
  tenantId = resolveTenantId(state),
) => {
  const defaults = createDefaultFeatureFlags();
  return (
    state?.featureFlags?.find((flags) => flags.tenantId === tenantId) ??
    defaults.find((flags) => flags.tenantId === tenantId) ??
    defaults[0]
  );
};

export const isStressAnalysisEnabled = (
  state: Pick<DemoUserState, 'featureFlags' | 'tenantId'> | null | undefined,
  tenantId = resolveTenantId(state),
) => Boolean(getTenantFeatureFlags(state, tenantId)?.stressAnalysisEnabled);

export const updateTenantFeatureFlags = (
  state: DemoUserState,
  tenantId: string,
  updates: Partial<Omit<TenantFeatureFlags, 'tenantId'>>,
): DemoUserState => {
  const currentFlags = getTenantFeatureFlags(state, tenantId);
  const nextFlags = {
    ...currentFlags,
    tenantId,
    ...updates,
  };
  const hasFlags = state.featureFlags.some((flags) => flags.tenantId === tenantId);
  return {
    ...state,
    featureFlags: hasFlags
      ? state.featureFlags.map((flags) => (flags.tenantId === tenantId ? nextFlags : flags))
      : [...state.featureFlags, nextFlags],
  };
};

export const getLatestConditionRecord = (
  state: Pick<DemoUserState, 'conditionRecords' | 'tenantId'> | null | undefined,
  tenantId = resolveTenantId(state),
  userId = DEFAULT_DEMO_USER_ID,
) => {
  const records = Array.isArray(state?.conditionRecords) ? state.conditionRecords : [];
  return (
    records
      .filter((record) => record.tenantId === tenantId && record.userId === userId)
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0] ?? null
  );
};

export const upsertConditionRecord = (
  state: DemoUserState,
  summary: ConditionSummary,
  userId = DEFAULT_DEMO_USER_ID,
): DemoUserState => {
  const tenantId = resolveTenantId(state);
  const nextRecord: ConditionRecord = {
    ...summary,
    id: `condition-${Date.now()}`,
    tenantId,
    userId,
  };
  return {
    ...state,
    conditionRecords: [nextRecord, ...state.conditionRecords],
    latestKarte: state.latestKarte ? applyConditionToKarte(state.latestKarte, summary) : state.latestKarte,
    karteRecords:
      state.karteRecords.length > 0
        ? [
            {
              ...state.karteRecords[0],
              data: applyConditionToKarte(state.karteRecords[0].data, summary),
            },
            ...state.karteRecords.slice(1),
          ]
        : state.karteRecords,
  };
};

const normalizeDraftSession = (meetingType: MeetingType, draft: DraftSession | null | undefined): DraftSession | null => {
  if (!draft) return null;
  return {
    ...draft,
    meetingType,
    continuousMode: draft.continuousMode ?? null,
    karte: applyDemographicsToKarte(draft.karte, draft.karte?.demographics),
    updatedAt: draft.updatedAt ?? '',
  };
};

const normalizeState = (value: Partial<DemoUserState> | null | undefined): DemoUserState => {
  const empty = createEmptyDemoUserState();
  const tenants = Array.isArray(value?.tenants) && value!.tenants.length > 0 ? value!.tenants : empty.tenants;
  const tenantId =
    typeof value?.tenantId === 'string' && tenants.some((tenant) => tenant.id === value.tenantId)
      ? value.tenantId
      : DEFAULT_TENANT_ID;
  const featureFlags = Array.isArray(value?.featureFlags) && value!.featureFlags.length > 0 ? value!.featureFlags : empty.featureFlags;
  const conditionRecords = Array.isArray(value?.conditionRecords) ? value!.conditionRecords : [];
  const latestKarte = value?.latestKarte ? applyDemographicsToKarte(value.latestKarte, value.latestKarte.demographics) : null;
  const demographicsSavedAt = typeof value?.demographicsSavedAt === 'string' ? value.demographicsSavedAt : null;
  const demographicsSkipped = value?.demographicsSkipped === true && !demographicsSavedAt && !hasConfiguredDemographics(value?.demographics);
  const demographics = demographicsSavedAt || hasConfiguredDemographics(value?.demographics)
    ? mergeDemographics(empty.demographics, value?.demographics)
    : latestKarte?.demographics
      ? mergeDemographics(empty.demographics, latestKarte.demographics)
      : empty.demographics;

  return {
    tenantId,
    tenants,
    featureFlags,
    conditionRecords,
    demographicsSkipped,
    demographics,
    demographicsSavedAt,
    latestKarte,
    karteRecords: Array.isArray(value?.karteRecords)
      ? value!.karteRecords.map((record) => ({
          ...record,
          data: applyDemographicsToKarte(record.data, record.data.demographics),
        }))
      : [],
    draftSessions: {
      initial: normalizeDraftSession('initial', value?.draftSessions?.initial),
      continuous: normalizeDraftSession('continuous', value?.draftSessions?.continuous),
    },
  };
};

export const loadDemoUserState = (): DemoUserState => {
  if (typeof window === 'undefined') {
    return createEmptyDemoUserState();
  }

  let parsedState: Partial<DemoUserState> | null = null;
  const stored = window.localStorage.getItem(LOCAL_STORAGE_DEMO_USER_KEY);
  if (stored) {
    try {
      parsedState = JSON.parse(stored) as Partial<DemoUserState>;
    } catch {
      parsedState = null;
    }
  }

  const nextState = normalizeState(parsedState);

  if (!nextState.latestKarte) {
    const legacyStored = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KARTE_KEY);
    if (legacyStored) {
      try {
        const legacyKarte = JSON.parse(legacyStored) as KarteData;
        nextState.latestKarte = applyDemographicsToKarte(legacyKarte, legacyKarte.demographics);
        nextState.demographics = mergeDemographics(nextState.demographics, legacyKarte.demographics);
      } catch {
        // Ignore invalid legacy payloads.
      }
    }
  }

  return nextState;
};

export const saveDemoUserState = (state: DemoUserState) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeState(state);
  window.localStorage.setItem(LOCAL_STORAGE_DEMO_USER_KEY, JSON.stringify(normalized));
};
