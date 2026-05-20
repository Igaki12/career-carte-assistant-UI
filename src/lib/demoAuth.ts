export type DemoAuthRole = 'user' | 'company-admin' | 'operations-admin' | 'consultant' | 'admin';

export type DemoAuthSession = {
  role: DemoAuthRole;
  accountId: string;
  tenantId: string | null;
  remember: boolean;
  loggedInAt: string;
};

export type DemoAuthLoginInput = {
  accountId: string;
  password: string;
  role?: DemoAuthRole;
  tenantId?: string | null;
  remember: boolean;
};

const SESSION_STORAGE_AUTH_KEY = 'cca-demo-auth-session';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDemoAuthRole = (value: unknown): value is DemoAuthRole =>
  value === 'user' ||
  value === 'company-admin' ||
  value === 'operations-admin' ||
  value === 'consultant' ||
  value === 'admin';

const normalizeSession = (value: unknown): DemoAuthSession | null => {
  if (!isRecord(value) || !isDemoAuthRole(value.role) || typeof value.accountId !== 'string') {
    return null;
  }

  return {
    role: value.role,
    accountId: value.accountId,
    tenantId: typeof value.tenantId === 'string' ? value.tenantId : null,
    remember: value.remember === true,
    loggedInAt: typeof value.loggedInAt === 'string' ? value.loggedInAt : new Date().toISOString(),
  };
};

const readStorage = (storage: Storage, key: string) => {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const loadDemoAuthSession = (): DemoAuthSession | null => {
  if (typeof window === 'undefined') return null;
  window.localStorage.removeItem(SESSION_STORAGE_AUTH_KEY);
  return readStorage(window.sessionStorage, SESSION_STORAGE_AUTH_KEY);
};

export const saveDemoAuthSession = (session: DemoAuthSession) => {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(session);
  window.sessionStorage.setItem(SESSION_STORAGE_AUTH_KEY, serialized);
  window.localStorage.removeItem(SESSION_STORAGE_AUTH_KEY);
};

export const clearDemoAuthSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_STORAGE_AUTH_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_AUTH_KEY);
};

export const createDemoAuthSession = ({ accountId, role = 'user', tenantId, remember }: DemoAuthLoginInput): DemoAuthSession => ({
  role,
  accountId: accountId.trim(),
  tenantId: role === 'admin' || role === 'operations-admin' ? null : tenantId ?? 'tenant-career-carte-demo',
  remember,
  loggedInAt: new Date().toISOString(),
});

export const getDefaultRouteForRole = (role: DemoAuthRole) => {
  if (role === 'admin') return '/admin';
  if (role === 'operations-admin') return '/operations-admin';
  if (role === 'company-admin') return '/user';
  if (role === 'consultant') return '/consultant';
  return '/user';
};

export const getRoleLabel = (role: DemoAuthRole) => {
  if (role === 'admin') return 'システム管理者';
  if (role === 'operations-admin') return '運用管理者';
  if (role === 'company-admin') return '企業管理者';
  if (role === 'consultant') return 'キャリアコンサルタント';
  return '一般ユーザー';
};
