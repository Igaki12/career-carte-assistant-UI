export type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
};

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

export type KarteData = {
  demographics: DemographicData;
  shirp: ShirpData;
  survey: SurveyResult;
};

export type LlmResponse = {
  reply: string;
  updated_shirp?: Partial<Record<ShirpKey, string>>;
  is_complete?: boolean;
  feedback?: string;
};

export const SHIRP_KEYS: readonly ShirpKey[] = Object.freeze(['S', 'H', 'I', 'R', 'P', '#']);

export const INITIAL_SHIRP_STEP_ORDER: readonly ShirpKey[] = Object.freeze(['S', 'H', 'I', 'R']);
