import demoAccountsPayload from '../../demo-accounts.json';
import type { DemoAuthRole } from './demoAuth';

export type DemoAccountRecord = {
  id: string;
  email: string;
  password: string;
  role: DemoAuthRole;
  tenantId: string | null;
  company: string;
  department: string;
  jobTitle: string;
  permission: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  name: string;
  nameKana: string;
  status: string;
  karteStatus: string;
  managedTenantIds?: string[];
};

export const joinName = (lastName: string | null | undefined, firstName: string | null | undefined) =>
  [lastName, firstName].map((value) => value?.trim()).filter(Boolean).join(' ') || null;

export const joinNameKana = (lastNameKana: string | null | undefined, firstNameKana: string | null | undefined) =>
  [lastNameKana, firstNameKana].map((value) => value?.trim()).filter(Boolean).join(' ') || null;

export const demoAccounts = demoAccountsPayload.accounts as DemoAccountRecord[];

export const findDemoAccount = (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return null;
  return demoAccounts.find((account) => account.email.toLowerCase() === normalized) ?? null;
};

export const inferDemoRoleFromIdentifier = (identifier: string): Exclude<DemoAuthRole, 'admin'> => {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes('cns-') || normalized.includes('consultant')) return 'consultant';
  if (normalized.includes('ops-') || normalized.includes('operations')) return 'operations-admin';
  if (
    normalized.includes('cmp-') ||
    normalized.includes('cad-') ||
    normalized.includes('company-admin') ||
    normalized.includes('hr') ||
    normalized.includes('jinji')
  ) {
    return 'company-admin';
  }
  return 'user';
};

export const resolveDemoLoginRole = (identifier: string): Exclude<DemoAuthRole, 'admin'> => {
  const account = findDemoAccount(identifier);
  if (account?.role && account.role !== 'admin') return account.role;
  return inferDemoRoleFromIdentifier(identifier);
};
