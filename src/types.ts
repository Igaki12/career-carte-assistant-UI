export type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
};

export type MeetingType = 'initial' | 'continuous';

export type ContinuousMode = 'normal' | 'turn';

export type InitialPromptVariant = 'current' | 'front_light' | 'late_focus' | 'coverage_first';

export const INITIAL_PROMPT_VARIANTS: readonly InitialPromptVariant[] = Object.freeze([
  'current',
  'front_light',
  'late_focus',
  'coverage_first',
]);

export type ShirpKey = 'S' | 'H' | 'I' | 'R' | 'P' | '#';

export type ShirpData = Record<ShirpKey, string | null>;

export type ShirpDetailCategoryKey = 'S' | 'H' | 'I' | 'R' | 'P';

export type ShirpDetailFieldData = {
  summary: string | null;
  items: Record<string, string | null>;
};

export type ShirpDetailsData = Record<ShirpDetailCategoryKey, Record<string, ShirpDetailFieldData>>;

export type ShirpDetailFieldUpdates = {
  summary?: string | null;
  items?: Record<string, string | null>;
};

export type ShirpDetailUpdates = Partial<Record<ShirpDetailCategoryKey, Record<string, ShirpDetailFieldUpdates>>>;

export type DemographicData = {
  accountId: string | null;
  name: string | null;
  lastName: string | null;
  firstName: string | null;
  nameKana: string | null;
  lastNameKana: string | null;
  firstNameKana: string | null;
  email: string | null;
  age: string | null;
  birthDate: string | null;
  company: string | null;
  department: string | null;
  jobTitle: string | null;
  permission: string | null;
  workLocationPrefecture: string | null;
  jobChangeCount: string | null;
  yearsOfService: string | null;
  gender: string | null;
  maritalStatus: string | null;
  childrenCount: string | null;
  youngestChildAge: string | null;
  managerExperience: string | null;
  currentManager: string | null;
};

export type SurveyFactorKey =
  | 'growth_orientation'
  | 'problem_solving_orientation'
  | 'organization_contribution_orientation'
  | 'interpersonal_adaptation_orientation'
  | 'emotional_response_tendency';

export type SurveyResult = {
  factors: Record<SurveyFactorKey, number | null>;
  lastUpdated: string | null;
};

export type ConditionLevel = '低め' | '標準' | '高め';

export type ConditionSummary = {
  score: number;
  level: ConditionLevel;
  measuredAt: string;
  source: 'demo';
  consentVersion: string;
};

export type KarteData = {
  demographics: DemographicData;
  shirp: ShirpData;
  shirpDetails: ShirpDetailsData;
  survey: SurveyResult;
  conditionSummary: ConditionSummary | null;
};

export type Tenant = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  plan: string;
  enabledFeatures: string[];
  createdAt: string;
};

export type TenantFeatureFlags = {
  tenantId: string;
  stressAnalysisEnabled: boolean;
  turnTakingEnabled: boolean;
  lightThemeEnabled: boolean;
};

export type ConditionRecord = ConditionSummary & {
  id: string;
  tenantId: string;
  userId: string;
};

export type LlmResponse = {
  reply: string;
  updated_shirp?: Partial<Record<ShirpKey, string>>;
  updated_shirp_details?: ShirpDetailUpdates;
  is_complete?: boolean;
  feedback?: string;
};

export type StoredKarteRecord = {
  id: string;
  atCreated: string;
  atUpdated: string;
  statusLabel: string;
  data: KarteData;
  meetingType: MeetingType;
  continuousMode: ContinuousMode | null;
  initialPromptVariant?: InitialPromptVariant | null;
  feedback: string | null;
  conversationLog: ConversationMessage[];
};

export type CompanyEmployeeRecord = {
  id: string;
  tenantId: string;
  name: string;
  lastName: string;
  firstName: string;
  nameKana: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  company: string;
  department: string;
  jobTitle: string;
  permission: string;
  status: string;
  latestKarte: KarteData | null;
  karteRecords: StoredKarteRecord[];
  createdAt: string;
  updatedAt: string;
};

export type DraftSession = {
  meetingType: MeetingType;
  continuousMode: ContinuousMode | null;
  initialPromptVariant?: InitialPromptVariant | null;
  messages: ConversationMessage[];
  karte: KarteData;
  apiUsageCount: number;
  feedbackText: string;
  conversationStarted: boolean;
  hasSessionStarted: boolean;
  hasFinalizedInitial?: boolean;
  updatedAt: string;
};

export type DemoUserState = {
  tenantId: string;
  tenants: Tenant[];
  featureFlags: TenantFeatureFlags[];
  conditionRecords: ConditionRecord[];
  demographicsSkipped: boolean;
  demographics: DemographicData;
  demographicsSavedAt: string | null;
  latestKarte: KarteData | null;
  karteRecords: StoredKarteRecord[];
  companyEmployees: CompanyEmployeeRecord[];
  draftSessions: Record<MeetingType, DraftSession | null>;
};

export const SHIRP_KEYS: readonly ShirpKey[] = Object.freeze(['S', 'H', 'I', 'R', 'P', '#']);

export const INITIAL_SHIRP_STEP_ORDER: readonly ShirpKey[] = Object.freeze(['S', 'H', 'I', 'R']);
