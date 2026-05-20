import type {
  CompanyEmployeeRecord,
  ConditionRecord,
  ConditionSummary,
  DemoUserState,
  DemographicData,
  DraftSession,
  InitialPromptVariant,
  KarteData,
  MeetingType,
  SurveyResult,
  Tenant,
  TenantFeatureFlags,
} from '../types';
import { INITIAL_PROMPT_VARIANTS } from '../types';
import { demoAccounts, joinName, joinNameKana, type DemoAccountRecord } from './demoAccounts';
import { cloneShirpDetails, createEmptyShirpDetails, SHIRP_DETAIL_CATEGORY_KEYS, SHIRP_DETAIL_FIELDS, SHIRP_DETAIL_ITEM_LABELS } from './shirp';

export const LOCAL_STORAGE_DEMO_USER_KEY = 'cca-demo-user-state';
export const LEGACY_LOCAL_STORAGE_KARTE_KEY = 'cca-karte';
export const DEFAULT_TENANT_ID = 'tenant-career-carte-demo';
export const DEFAULT_DEMO_USER_ID = 'USR-2024-021';
export const CONDITION_CONSENT_VERSION = 'condition-demo-v1';

const createEmptyShirp = (): KarteData['shirp'] => ({
  S: null,
  H: null,
  I: null,
  R: null,
  P: null,
  '#': null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeInitialPromptVariant = (value: unknown): InitialPromptVariant =>
  typeof value === 'string' && INITIAL_PROMPT_VARIANTS.includes(value as (typeof INITIAL_PROMPT_VARIANTS)[number])
    ? (value as InitialPromptVariant)
    : 'current';

const mergeText = (base: string | null | undefined, addition: string) => {
  const next = addition.trim();
  if (!next) return base ?? null;
  if (!base?.trim()) return next;
  return `${base.trim()}\n${next}`;
};

const LEGACY_SHIRP_DETAIL_MIGRATIONS: Record<
  string,
  Record<string, { field: string; item?: string; appendToTopLevel?: boolean }>
> = {
  S: {
    organizationFit: { field: 'relationshipsAndOrgFit', item: 'organizationalCultureFit' },
    selfEvaluation: { field: 'selfEvaluationAndAcceptance', item: 'selfEvaluation' },
    relationshipQuality: { field: 'relationshipsAndOrgFit', item: 'colleagueRelationship' },
    otherCurrent: { field: 'relationshipsAndOrgFit', appendToTopLevel: true },
  },
  H: {
    desiredIncome: { field: 'treatmentPreferences', item: 'desiredIncome' },
    desiredWork: { field: 'workPreferences', item: 'desiredJobContent' },
    desiredWorkStyle: { field: 'workStylePreferences', item: 'desiredWorkStyle' },
    otherHope: { field: 'workPreferences', appendToTopLevel: true },
  },
  I: {
    skillIssue: { field: 'capabilityExperienceIssues', item: 'skillGap' },
    healthIssue: { field: 'healthLifeConstraints', item: 'healthConstraint' },
    ageIssue: { field: 'organizationalEnvironmentalConstraints', item: 'ageLifeStageConstraint' },
    familyIssue: { field: 'healthLifeConstraints', item: 'familyConstraint' },
    otherIssue: { field: 'organizationalEnvironmentalConstraints', appendToTopLevel: true },
  },
  R: {
    strengthQualification: { field: 'capabilityResources', item: 'qualification' },
    strengthExperience: { field: 'capabilityResources', item: 'experience' },
    supporters: { field: 'interpersonalResources', item: 'supporter' },
    timeOrMoney: { field: 'environmentalResources' },
    otherResource: { field: 'environmentalResources', appendToTopLevel: true },
  },
};

const normalizeShirpState = (
  shirp: Partial<KarteData['shirp']> | null | undefined,
  rawDetails: unknown,
): Pick<KarteData, 'shirp' | 'shirpDetails'> => {
  const nextShirp = {
    ...createEmptyShirp(),
    ...(shirp ?? {}),
  };
  const nextShirpDetails = createEmptyShirpDetails();

  if (!isRecord(rawDetails)) {
    return {
      shirp: nextShirp,
      shirpDetails: nextShirpDetails,
    };
  }

  SHIRP_DETAIL_CATEGORY_KEYS.forEach((category) => {
    const rawCategory = rawDetails[category];
    if (!isRecord(rawCategory)) return;

    SHIRP_DETAIL_FIELDS[category].forEach((field) => {
      const rawField = rawCategory[field];
      if (isRecord(rawField)) {
        if (typeof rawField.summary === 'string' && rawField.summary.trim()) {
          nextShirpDetails[category][field].summary = rawField.summary;
        }
        const rawItems = isRecord(rawField.items) ? rawField.items : null;
        if (rawItems) {
          Object.keys(SHIRP_DETAIL_ITEM_LABELS[category][field]).forEach((itemKey) => {
            const itemValue = rawItems[itemKey];
            if (typeof itemValue === 'string' && itemValue.trim()) {
              nextShirpDetails[category][field].items[itemKey] = itemValue;
            }
          });
        }
      }
    });
  });

  (['S', 'H', 'I', 'R'] as const).forEach((category) => {
    const rawCategory = rawDetails[category];
    if (!isRecord(rawCategory)) return;
    const categoryMigrations = LEGACY_SHIRP_DETAIL_MIGRATIONS[category];

    Object.entries(rawCategory).forEach(([legacyKey, legacyValue]) => {
      if (typeof legacyValue !== 'string' || !legacyValue.trim()) return;
      const migration = categoryMigrations[legacyKey];
      if (!migration) return;

      const detailField = nextShirpDetails[category][migration.field];
      if (!detailField.summary) {
        detailField.summary = legacyValue;
      } else if (detailField.summary !== legacyValue) {
        detailField.summary = mergeText(detailField.summary, legacyValue);
      }

      if (migration.item && !detailField.items[migration.item]) {
        detailField.items[migration.item] = legacyValue;
      }

      if (migration.appendToTopLevel) {
        nextShirp[category] = mergeText(nextShirp[category], legacyValue);
      }
    });
  });

  return {
    shirp: nextShirp,
    shirpDetails: nextShirpDetails,
  };
};

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
  {
    id: 'tenant-alpha-robotics',
    name: 'Alpha Robotics',
    status: 'active',
    plan: 'standard',
    enabledFeatures: [],
    createdAt: '2026-05-13',
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
  {
    tenantId: 'tenant-alpha-robotics',
    stressAnalysisEnabled: false,
    turnTakingEnabled: false,
    lightThemeEnabled: false,
  },
];

export const createEmptyDemographics = (): DemographicData => ({
  accountId: null,
  name: null,
  lastName: null,
  firstName: null,
  nameKana: null,
  lastNameKana: null,
  firstNameKana: null,
  email: null,
  age: null,
  birthDate: null,
  company: null,
  department: null,
  jobTitle: null,
  permission: null,
  workLocationPrefecture: null,
  jobChangeCount: null,
  yearsOfService: null,
  gender: null,
  maritalStatus: null,
  childrenCount: null,
  youngestChildAge: null,
  managerExperience: null,
  currentManager: null,
});

export const createDemographicsFromDemoAccount = (account: DemoAccountRecord): DemographicData => ({
  ...createEmptyDemographics(),
  accountId: account.id,
  name: joinName(account.lastName, account.firstName),
  lastName: account.lastName,
  firstName: account.firstName,
  nameKana: joinNameKana(account.lastNameKana, account.firstNameKana),
  lastNameKana: account.lastNameKana,
  firstNameKana: account.firstNameKana,
  email: account.email,
  company: account.company,
  department: account.department,
  jobTitle: account.jobTitle,
  permission: account.permission,
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
  shirp: createEmptyShirp(),
  shirpDetails: createEmptyShirpDetails(),
  survey: createEmptySurvey(),
  conditionSummary: null,
});

const createSampleKarte = (
  demographics: Partial<DemographicData>,
  shirp: Partial<KarteData['shirp']>,
): KarteData => {
  const details = createEmptyShirpDetails();
  details.S.jobContent.summary = '現在の役割で顧客対応と業務改善を担当し、成果が見える場面にやりがいを感じている。';
  details.H.workStylePreferences.summary = '家庭や学習時間との両立を意識し、柔軟な働き方を希望している。';
  details.I.capabilityExperienceIssues.summary = '次の役割に向けて専門知識と言語化の経験を増やす必要がある。';
  details.R.interpersonalResources.summary = '上司や同僚に相談できる関係があり、社内制度も一部活用できる。';

  return {
    ...createEmptyKarte(),
    demographics: {
      ...createEmptyDemographics(),
      ...demographics,
    },
    shirp: {
      ...createEmptyShirp(),
      ...shirp,
    },
    shirpDetails: details,
  };
};

const createSampleKarteRecord = (
  id: string,
  atCreated: string,
  data: KarteData,
  feedback: string,
): CompanyEmployeeRecord['karteRecords'][number] => ({
  id,
  atCreated,
  atUpdated: atCreated,
  statusLabel: '保存済み',
  data,
  meetingType: 'initial',
  continuousMode: null,
  feedback,
  conversationLog: [
    { role: 'user', content: '今の仕事の整理をしたいです。' },
    { role: 'assistant', content: '現在の役割で感じていることから一緒に整理しましょう。' },
  ],
});

export const createDefaultCompanyEmployees = (): CompanyEmployeeRecord[] => {
  const sampleKarteById: Record<string, KarteData> = {
    'USR-2026-101': createSampleKarte(createDemographicsFromDemoAccount(demoAccounts[0]), {
      S: '顧客対応とチーム内調整にやりがいを感じる一方、業務量の波に負担がある。',
      H: '顧客支援の専門性を高め、柔軟な働き方も維持したい。',
      I: '次の役割に必要なデータ活用経験と自己PRの整理が課題。',
      R: '上司への相談機会と顧客理解の蓄積が強み。',
      P: '実績整理とデータ分析の学習を進め、次回面談で方向性を確認する。',
      '#': '管理者画面の一括出力確認用データ。',
    }),
    'USR-2026-102': createSampleKarte(createDemographicsFromDemoAccount(demoAccounts[1]), {
      S: '営業職として数値管理を担い、部門横断の調整に手応えがある。',
      H: 'マネジメントだけでなく企画専門性も伸ばせる役割を希望している。',
      I: '管理職志向と専門職志向の優先順位を整理する必要がある。',
      R: '営業現場との関係性と過去の改善実績を活用できる。',
      P: '希望役割の条件を整理し、社内面談で相談する準備を進める。',
      '#': null,
    }),
    'USR-2026-201': createSampleKarte(createDemographicsFromDemoAccount(demoAccounts[3]), {
      S: '技術組織の運営に責任を持ち、採用と育成に課題を感じている。',
      H: '組織開発と技術戦略の両面に関われる役割を希望している。',
      I: '事業視点での意思決定経験を増やす必要がある。',
      R: '開発経験とチームからの信頼を活用できる。',
      P: '経営視点の学習と上長への相談を進める。',
      '#': null,
    }),
  };

  return demoAccounts
    .filter((account) => account.role === 'user')
    .map((account, index) => {
      const latestKarte = sampleKarteById[account.id] ?? null;
      const createdAt = `2026-04-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`;
      const updatedAt = latestKarte ? `2026-04-${String(index + 12).padStart(2, '0')}T10:00:00.000Z` : createdAt;
      return {
        id: account.id,
        tenantId: account.tenantId ?? DEFAULT_TENANT_ID,
        name: account.name,
        lastName: account.lastName,
        firstName: account.firstName,
        nameKana: account.nameKana,
        lastNameKana: account.lastNameKana,
        firstNameKana: account.firstNameKana,
        email: account.email,
        company: account.company,
        department: account.department,
        jobTitle: account.jobTitle,
        permission: account.permission,
        status: latestKarte ? '完了' : '未作成',
        latestKarte,
        karteRecords: latestKarte
          ? [
              createSampleKarteRecord(
                `karte-${account.id.toLowerCase()}`,
                updatedAt,
                latestKarte,
                '希望条件と現状整理が進んでいます。次回は優先順位と実行計画を具体化しましょう。',
              ),
            ]
          : [],
        createdAt,
        updatedAt,
      };
    });
};

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
  companyEmployees: createDefaultCompanyEmployees(),
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
  const merged = {
    ...createEmptyDemographics(),
    ...(base ?? {}),
    ...(incoming ?? {}),
  };
  return {
    ...merged,
    name: joinName(merged.lastName, merged.firstName),
    nameKana: joinNameKana(merged.lastNameKana, merged.firstNameKana),
  };
};

export const applyDemographicsToKarte = (
  karte: KarteData | null | undefined,
  demographics: DemographicData | null | undefined,
): KarteData => {
  const nextKarte = karte ? { ...karte } : createEmptyKarte();
  const normalizedShirpState = normalizeShirpState(nextKarte.shirp, nextKarte.shirpDetails);
  return {
    ...nextKarte,
    demographics: mergeDemographics(nextKarte.demographics, demographics),
    shirp: normalizedShirpState.shirp,
    shirpDetails: cloneShirpDetails(normalizedShirpState.shirpDetails),
    survey: nextKarte.survey ?? createEmptySurvey(),
    conditionSummary: nextKarte.conditionSummary ?? null,
  };
};

export const normalizeCompanyEmployees = (value: unknown): CompanyEmployeeRecord[] => {
  if (!Array.isArray(value)) {
    return createDefaultCompanyEmployees();
  }

  return value
    .filter(isRecord)
    .map((employee) => {
      const latestKarte = isRecord(employee.latestKarte)
        ? applyDemographicsToKarte(employee.latestKarte as KarteData, (employee.latestKarte as KarteData).demographics)
        : null;
      const karteRecords = Array.isArray(employee.karteRecords)
        ? employee.karteRecords
            .filter(isRecord)
            .map((record) => ({
              ...(record as CompanyEmployeeRecord['karteRecords'][number]),
              data: applyDemographicsToKarte(
                (record as CompanyEmployeeRecord['karteRecords'][number]).data,
                (record as CompanyEmployeeRecord['karteRecords'][number]).data?.demographics,
              ),
              continuousMode: (record as CompanyEmployeeRecord['karteRecords'][number]).continuousMode ?? null,
              feedback: (record as CompanyEmployeeRecord['karteRecords'][number]).feedback ?? null,
              conversationLog: Array.isArray((record as CompanyEmployeeRecord['karteRecords'][number]).conversationLog)
                ? (record as CompanyEmployeeRecord['karteRecords'][number]).conversationLog
                : [],
            }))
        : [];
      const id = getStringValue(employee.id) || `employee-${Date.now()}`;
      const email = getStringValue(employee.email);
      const demoAccount = demoAccounts.find((account) => account.id === id || account.email === email) ?? null;
      const latestDemographics = latestKarte?.demographics ?? null;
      const lastName = getStringValue(employee.lastName) || latestDemographics?.lastName || demoAccount?.lastName || '';
      const firstName = getStringValue(employee.firstName) || latestDemographics?.firstName || demoAccount?.firstName || '';
      const lastNameKana = getStringValue(employee.lastNameKana) || latestDemographics?.lastNameKana || demoAccount?.lastNameKana || '';
      const firstNameKana = getStringValue(employee.firstNameKana) || latestDemographics?.firstNameKana || demoAccount?.firstNameKana || '';
      const name = getStringValue(employee.name) || joinName(lastName, firstName) || latestDemographics?.name || demoAccount?.name || '未設定';
      const nameKana =
        getStringValue(employee.nameKana) ||
        joinNameKana(lastNameKana, firstNameKana) ||
        latestDemographics?.nameKana ||
        demoAccount?.nameKana ||
        '';
      const normalizedEmail = email || latestDemographics?.email || demoAccount?.email || '';
      const tenantId = getStringValue(employee.tenantId) || demoAccount?.tenantId || DEFAULT_TENANT_ID;
      const company = getStringValue(employee.company) || latestDemographics?.company || demoAccount?.company || '';
      const department = getStringValue(employee.department) || latestDemographics?.department || demoAccount?.department || '';
      const jobTitle = getStringValue(employee.jobTitle) || latestDemographics?.jobTitle || demoAccount?.jobTitle || '';
      const permission = getStringValue(employee.permission) || latestDemographics?.permission || demoAccount?.permission || '一般ユーザー';
      const employeeDemographics: DemographicData = {
        ...(latestDemographics ?? createEmptyDemographics()),
        accountId: id,
        name,
        lastName,
        firstName,
        nameKana,
        lastNameKana,
        firstNameKana,
        email: normalizedEmail,
        company,
        department,
        jobTitle,
        permission,
      };
      const normalizedLatestKarte = latestKarte ? applyDemographicsToKarte(latestKarte, employeeDemographics) : null;
      const normalizedKarteRecords = karteRecords.map((record) => ({
        ...record,
        data: applyDemographicsToKarte(record.data, employeeDemographics),
      }));

      return {
        id,
        tenantId,
        name,
        lastName,
        firstName,
        nameKana,
        lastNameKana,
        firstNameKana,
        email: normalizedEmail,
        company,
        department,
        jobTitle,
        permission,
        status: getStringValue(employee.status) || (normalizedLatestKarte ? '完了' : '未作成'),
        latestKarte: normalizedLatestKarte,
        karteRecords: normalizedKarteRecords,
        createdAt: getStringValue(employee.createdAt),
        updatedAt: getStringValue(employee.updatedAt),
      };
    });
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

export const getCompanyAdminEmployees = (
  state: DemoUserState,
  tenantId = resolveTenantId(state),
): CompanyEmployeeRecord[] => {
  const tenant = state.tenants.find((entry) => entry.id === tenantId);
  const latestRecord = state.karteRecords[0] ?? null;
  const demoKarte = state.latestKarte ? applyDemographicsToKarte(state.latestKarte, state.demographics) : null;
  const demoEmployee: CompanyEmployeeRecord = {
    id: DEFAULT_DEMO_USER_ID,
    tenantId,
    name: state.demographics.name || demoKarte?.demographics.name || 'デモユーザー',
    lastName: state.demographics.lastName || demoKarte?.demographics.lastName || '',
    firstName: state.demographics.firstName || demoKarte?.demographics.firstName || '',
    nameKana: state.demographics.nameKana || demoKarte?.demographics.nameKana || '',
    lastNameKana: state.demographics.lastNameKana || demoKarte?.demographics.lastNameKana || '',
    firstNameKana: state.demographics.firstNameKana || demoKarte?.demographics.firstNameKana || '',
    email: state.demographics.email || demoKarte?.demographics.email || 'demo.user@example.com',
    company: state.demographics.company || demoKarte?.demographics.company || tenant?.name || 'デモ企業',
    department: state.demographics.department || demoKarte?.demographics.department || 'Demo',
    jobTitle: state.demographics.jobTitle || demoKarte?.demographics.jobTitle || '未設定',
    permission: state.demographics.permission || demoKarte?.demographics.permission || '一般ユーザー',
    status: demoKarte ? '完了' : state.demographicsSavedAt || state.demographicsSkipped ? '面談準備中' : '未設定',
    latestKarte: demoKarte,
    karteRecords: state.karteRecords,
    createdAt: state.demographicsSavedAt ?? latestRecord?.atCreated ?? '',
    updatedAt: latestRecord?.atUpdated ?? state.demographicsSavedAt ?? '',
  };
  const tenantEmployees = state.companyEmployees.filter(
    (employee) => employee.tenantId === tenantId && employee.id !== DEFAULT_DEMO_USER_ID,
  );
  return [demoEmployee, ...tenantEmployees];
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
    initialPromptVariant: meetingType === 'initial' ? normalizeInitialPromptVariant(draft.initialPromptVariant) : null,
    hasFinalizedInitial: meetingType === 'initial' ? draft.hasFinalizedInitial === true : false,
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
  const companyEmployees = normalizeCompanyEmployees(value?.companyEmployees);
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
    companyEmployees,
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
