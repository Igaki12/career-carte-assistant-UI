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

const DEFAULT_USAGE_TENANT_ID = 'tenant-career-carte-demo';

type QuotaListenerEntry = {
  tenantId: string;
  listener: (quota: DemoUsageQuota) => void;
};

const listeners = new Set<QuotaListenerEntry>();
let currentQuotas: Record<string, DemoUsageQuota> = {};

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

const getTenantQuota = (tenantId = DEFAULT_USAGE_TENANT_ID) => {
  const existing = currentQuotas[tenantId];
  if (existing) return existing;
  const nextQuota = normalizeQuota({ ...DEFAULT_DEMO_USAGE_QUOTA });
  currentQuotas = {
    ...currentQuotas,
    [tenantId]: nextQuota,
  };
  return nextQuota;
};

const emitQuota = (tenantId = DEFAULT_USAGE_TENANT_ID) => {
  const snapshot = getDemoUsageQuota(tenantId);
  listeners.forEach((entry) => {
    if (entry.tenantId === tenantId) entry.listener(snapshot);
  });
};

export const getDemoUsageQuota = (tenantId = DEFAULT_USAGE_TENANT_ID): DemoUsageQuota => ({
  ...getTenantQuota(tenantId),
});

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

export const updateDemoUsageQuota = (
  patch: Partial<DemoUsageQuota>,
  tenantId = DEFAULT_USAGE_TENANT_ID,
): DemoUsageQuota => {
  const currentQuota = getTenantQuota(tenantId);
  const nextLimit = patch.totalLimit ?? patch.initialMonthlyLimit ?? patch.continuousMonthlyLimit;
  const nextUsed = patch.used ?? patch.initialUsed ?? patch.continuousUsed;
  const nextTurnLimit = patch.perMeetingTurnLimit ?? patch.initialLlmCallsPerInterview ?? patch.continuousLlmCallsPerInterview;

  const nextQuota = normalizeQuota({
    ...currentQuota,
    ...patch,
    ...(nextLimit !== undefined ? { totalLimit: nextLimit } : {}),
    ...(nextUsed !== undefined ? { used: nextUsed } : {}),
    ...(nextTurnLimit !== undefined ? { perMeetingTurnLimit: nextTurnLimit } : {}),
  });
  currentQuotas = {
    ...currentQuotas,
    [tenantId]: nextQuota,
  };
  emitQuota(tenantId);
  return getDemoUsageQuota(tenantId);
};

export const consumeCompanyApiUsage = (amount = 1, tenantId = DEFAULT_USAGE_TENANT_ID): boolean => {
  const normalizedAmount = toPositiveInteger(amount, 1);
  const currentQuota = getTenantQuota(tenantId);
  const summary = getCompanyApiUsageSummary(currentQuota);
  if (summary.remaining < normalizedAmount) return false;

  currentQuotas = {
    ...currentQuotas,
    [tenantId]: normalizeQuota({
      ...currentQuota,
      used: currentQuota.used + normalizedAmount,
    }),
  };
  emitQuota(tenantId);
  return true;
};

export const consumeMeetingQuota = (
  _meetingType: MeetingType,
  _sessionId: string,
  tenantId = DEFAULT_USAGE_TENANT_ID,
): boolean => {
  void _meetingType;
  void _sessionId;
  return consumeCompanyApiUsage(1, tenantId);
};

export const subscribeDemoUsageQuota = (
  listener: (quota: DemoUsageQuota) => void,
  tenantId = DEFAULT_USAGE_TENANT_ID,
) => {
  const entry = { tenantId, listener };
  listeners.add(entry);
  return () => {
    listeners.delete(entry);
  };
};
