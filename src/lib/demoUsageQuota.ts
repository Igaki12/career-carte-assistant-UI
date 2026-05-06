import type { MeetingType } from '../types';

export type DemoUsageQuota = {
  totalLimit: number;
  used: number;
  perMeetingTurnLimit: number;
  /**
   * Compatibility fields for older admin/user UI code. They mirror the company-wide
   * API usage pool and should not be treated as individual quotas.
   */
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
  totalLimit: number;
  perMeetingTurnLimit: number;
  usageLabel: string;
  canStartMeeting: boolean;
};

export const DEFAULT_DEMO_USAGE_QUOTA: DemoUsageQuota = {
  totalLimit: 1000,
  used: 0,
  perMeetingTurnLimit: 100,
  initialMonthlyLimit: 1000,
  continuousMonthlyLimit: 1000,
  initialUsed: 0,
  continuousUsed: 0,
  initialLlmCallsPerInterview: 100,
  continuousLlmCallsPerInterview: 100,
};

const listeners = new Set<(quota: DemoUsageQuota) => void>();
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
  const totalLimit = toNonNegativeInteger(
    quota.totalLimit ?? quota.initialMonthlyLimit,
    DEFAULT_DEMO_USAGE_QUOTA.totalLimit,
  );
  const used = Math.min(toNonNegativeInteger(quota.used ?? quota.initialUsed, 0), totalLimit);
  const perMeetingTurnLimit = toPositiveInteger(
    quota.perMeetingTurnLimit ?? quota.initialLlmCallsPerInterview,
    DEFAULT_DEMO_USAGE_QUOTA.perMeetingTurnLimit,
  );

  return {
    totalLimit,
    used,
    perMeetingTurnLimit,
    initialMonthlyLimit: totalLimit,
    continuousMonthlyLimit: totalLimit,
    initialUsed: used,
    continuousUsed: used,
    initialLlmCallsPerInterview: perMeetingTurnLimit,
    continuousLlmCallsPerInterview: perMeetingTurnLimit,
  };
};

const emitQuota = () => {
  const snapshot = getDemoUsageQuota();
  listeners.forEach((listener) => listener(snapshot));
};

export const getDemoUsageQuota = (): DemoUsageQuota => ({ ...currentQuota });

export const getCompanyApiUsageSummary = (quota: DemoUsageQuota): MeetingQuotaSummary => {
  const normalized = normalizeQuota(quota);
  const remaining = Math.max(normalized.totalLimit - normalized.used, 0);

  return {
    limit: normalized.totalLimit,
    used: normalized.used,
    remaining,
    llmCallsPerInterview: normalized.perMeetingTurnLimit,
    totalLimit: normalized.totalLimit,
    perMeetingTurnLimit: normalized.perMeetingTurnLimit,
    usageLabel: `${normalized.used}/${normalized.totalLimit}`,
    canStartMeeting: remaining >= normalized.perMeetingTurnLimit,
  };
};

export const getMeetingQuotaSummary = (
  quota: DemoUsageQuota,
  _meetingType: MeetingType,
): MeetingQuotaSummary => {
  void _meetingType;
  return getCompanyApiUsageSummary(quota);
};

export const updateDemoUsageQuota = (patch: Partial<DemoUsageQuota>): DemoUsageQuota => {
  const nextLimit = patch.totalLimit ?? patch.initialMonthlyLimit ?? patch.continuousMonthlyLimit;
  const nextUsed = patch.used ?? patch.initialUsed ?? patch.continuousUsed;
  const nextTurnLimit = patch.perMeetingTurnLimit ?? patch.initialLlmCallsPerInterview ?? patch.continuousLlmCallsPerInterview;

  currentQuota = normalizeQuota({
    ...currentQuota,
    ...patch,
    ...(nextLimit !== undefined ? { totalLimit: nextLimit } : {}),
    ...(nextUsed !== undefined ? { used: nextUsed } : {}),
    ...(nextTurnLimit !== undefined ? { perMeetingTurnLimit: nextTurnLimit } : {}),
  });
  emitQuota();
  return getDemoUsageQuota();
};

export const consumeCompanyApiUsage = (amount = 1): boolean => {
  const normalizedAmount = toPositiveInteger(amount, 1);
  const summary = getCompanyApiUsageSummary(currentQuota);
  if (summary.remaining < normalizedAmount) return false;

  currentQuota = normalizeQuota({
    ...currentQuota,
    used: currentQuota.used + normalizedAmount,
  });
  emitQuota();
  return true;
};

export const consumeMeetingQuota = (_meetingType: MeetingType, _sessionId: string): boolean => {
  void _meetingType;
  void _sessionId;
  return consumeCompanyApiUsage(1);
};

export const subscribeDemoUsageQuota = (listener: (quota: DemoUsageQuota) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
