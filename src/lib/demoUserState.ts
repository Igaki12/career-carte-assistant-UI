import type {
  DemoUserState,
  DemographicData,
  DraftSession,
  KarteData,
  MeetingType,
  SurveyResult,
} from '../types';

export const LOCAL_STORAGE_DEMO_USER_KEY = 'cca-demo-user-state';
export const LEGACY_LOCAL_STORAGE_KARTE_KEY = 'cca-karte';

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
  survey: createEmptySurvey(),
});

export const createEmptyDemoUserState = (): DemoUserState => ({
  demographics: createEmptyDemographics(),
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
  };
};

const normalizeDraftSession = (meetingType: MeetingType, draft: DraftSession | null | undefined): DraftSession | null => {
  if (!draft) return null;
  return {
    ...draft,
    meetingType,
    continuousMode: draft.continuousMode ?? null,
    updatedAt: draft.updatedAt ?? '',
  };
};

const normalizeState = (value: Partial<DemoUserState> | null | undefined): DemoUserState => {
  const empty = createEmptyDemoUserState();
  const latestKarte = value?.latestKarte ? applyDemographicsToKarte(value.latestKarte, value.latestKarte.demographics) : null;
  const demographics = hasConfiguredDemographics(value?.demographics)
    ? mergeDemographics(empty.demographics, value?.demographics)
    : latestKarte?.demographics
      ? mergeDemographics(empty.demographics, latestKarte.demographics)
      : empty.demographics;

  return {
    demographics,
    latestKarte,
    karteRecords: Array.isArray(value?.karteRecords) ? value!.karteRecords : [],
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
