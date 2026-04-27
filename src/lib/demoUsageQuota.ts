import type { MeetingType } from '../types';

export type DemoUsageQuota = {
  initialMonthlyLimit: number;
  continuousMonthlyLimit: number;
  initialUsed: number;
  continuousUsed: number;
  initialLlmCallsPerInterview: number;
  continuousLlmCallsPerInterview: number;
};

export type MeetingQuotaSummary = {
  limit: number;
  used: number;
  remaining: number;
  llmCallsPerInterview: number;
};

export const DEFAULT_DEMO_USAGE_QUOTA: DemoUsageQuota = {
  initialMonthlyLimit: 10,
  continuousMonthlyLimit: 4,
  initialUsed: 0,
  continuousUsed: 0,
  initialLlmCallsPerInterview: 10,
  continuousLlmCallsPerInterview: 7,
};

const listeners = new Set<(quota: DemoUsageQuota) => void>();
const consumedSessionIds = new Set<string>();
let currentQuota: DemoUsageQuota = { ...DEFAULT_DEMO_USAGE_QUOTA };

const toNonNegativeInteger = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const toPositiveInteger = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
};

const normalizeQuota = (quota: DemoUsageQuota): DemoUsageQuota => {
  const initialMonthlyLimit = toNonNegativeInteger(quota.initialMonthlyLimit, DEFAULT_DEMO_USAGE_QUOTA.initialMonthlyLimit);
  const continuousMonthlyLimit = toNonNegativeInteger(
    quota.continuousMonthlyLimit,
    DEFAULT_DEMO_USAGE_QUOTA.continuousMonthlyLimit,
  );

  return {
    initialMonthlyLimit,
    continuousMonthlyLimit,
    initialUsed: Math.min(toNonNegativeInteger(quota.initialUsed, 0), initialMonthlyLimit),
    continuousUsed: Math.min(toNonNegativeInteger(quota.continuousUsed, 0), continuousMonthlyLimit),
    initialLlmCallsPerInterview: toPositiveInteger(
      quota.initialLlmCallsPerInterview,
      DEFAULT_DEMO_USAGE_QUOTA.initialLlmCallsPerInterview,
    ),
    continuousLlmCallsPerInterview: toPositiveInteger(
      quota.continuousLlmCallsPerInterview,
      DEFAULT_DEMO_USAGE_QUOTA.continuousLlmCallsPerInterview,
    ),
  };
};

const emitQuota = () => {
  const snapshot = getDemoUsageQuota();
  listeners.forEach((listener) => listener(snapshot));
};

export const getDemoUsageQuota = (): DemoUsageQuota => ({ ...currentQuota });

export const getMeetingQuotaSummary = (
  quota: DemoUsageQuota,
  meetingType: MeetingType,
): MeetingQuotaSummary => {
  const limit = meetingType === 'initial' ? quota.initialMonthlyLimit : quota.continuousMonthlyLimit;
  const used = meetingType === 'initial' ? quota.initialUsed : quota.continuousUsed;
  const llmCallsPerInterview =
    meetingType === 'initial' ? quota.initialLlmCallsPerInterview : quota.continuousLlmCallsPerInterview;

  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    llmCallsPerInterview,
  };
};

export const updateDemoUsageQuota = (patch: Partial<DemoUsageQuota>): DemoUsageQuota => {
  currentQuota = normalizeQuota({
    ...currentQuota,
    ...patch,
  });
  emitQuota();
  return getDemoUsageQuota();
};

export const consumeMeetingQuota = (meetingType: MeetingType, sessionId: string): boolean => {
  if (consumedSessionIds.has(sessionId)) return true;

  const summary = getMeetingQuotaSummary(currentQuota, meetingType);
  if (summary.remaining <= 0) return false;

  currentQuota = normalizeQuota({
    ...currentQuota,
    initialUsed: meetingType === 'initial' ? currentQuota.initialUsed + 1 : currentQuota.initialUsed,
    continuousUsed: meetingType === 'continuous' ? currentQuota.continuousUsed + 1 : currentQuota.continuousUsed,
  });
  consumedSessionIds.add(sessionId);
  emitQuota();
  return true;
};

export const subscribeDemoUsageQuota = (listener: (quota: DemoUsageQuota) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
