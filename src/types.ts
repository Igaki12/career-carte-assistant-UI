export type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
};

export type MeetingType = 'initial' | 'continuous';

export type ContinuousMode = 'normal' | 'turn';

export type ShirpKey = 'S' | 'H' | 'I' | 'R' | 'P' | '#';

export type ShirpData = Record<ShirpKey, string | null>;

export type DemographicData = {
  name: string | null;
  age: string | null;
  company: string | null;
  jobTitle: string | null;
  workLocationPrefecture: string | null;
  jobChangeCount: string | null;
  yearsOfService: string | null;
  gender: string | null;
  maritalStatus: string | null;
  childrenCount: string | null;
  youngestChildAge: string | null;
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
  feedback: string | null;
  conversationLog: ConversationMessage[];
};

export type DraftSession = {
  meetingType: MeetingType;
  continuousMode: ContinuousMode | null;
  messages: ConversationMessage[];
  karte: KarteData;
  apiUsageCount: number;
  feedbackText: string;
  conversationStarted: boolean;
  hasSessionStarted: boolean;
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
  draftSessions: Record<MeetingType, DraftSession | null>;
};

export const SHIRP_KEYS: readonly ShirpKey[] = Object.freeze(['S', 'H', 'I', 'R', 'P', '#']);

export const INITIAL_SHIRP_STEP_ORDER: readonly ShirpKey[] = Object.freeze(['S', 'H', 'I', 'R']);
