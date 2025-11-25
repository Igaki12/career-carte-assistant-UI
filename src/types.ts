export type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
};

export type ModeType = 'step' | 'free';

export type KarteKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type KarteData = Record<KarteKey, string | null>;

export type LlmResponse = {
  reply: string;
  updated_karte?: Partial<Record<KarteKey, string>>;
  is_complete?: boolean;
};
