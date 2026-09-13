export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  TEAM_LEAD: 'team_lead',
  INTERN: 'intern',
} as const);

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Readonly<Record<Role, string>> = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.TEAM_LEAD]: 'Team Lead',
  [ROLES.INTERN]: 'Intern',
});

export const ROLE_BADGE_CLASS: Readonly<Record<Role, string>> = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'badge-admin',
  [ROLES.TEAM_LEAD]: 'badge-lead',
  [ROLES.INTERN]: 'badge-intern',
});

export const REGISTER_ROLE_OPTIONS: ReadonlyArray<{ value: Role; label: string }> = Object.freeze([
  { value: ROLES.TEAM_LEAD, label: ROLE_LABELS[ROLES.TEAM_LEAD] },
  { value: ROLES.INTERN, label: ROLE_LABELS[ROLES.INTERN] },
]);

export const DASHBOARD_PATHS: Readonly<Record<Role, string>> = Object.freeze({
  [ROLES.SUPER_ADMIN]: '/admin/dashboard',
  [ROLES.TEAM_LEAD]: '/lead/dashboard',
  [ROLES.INTERN]: '/intern/dashboard',
});

export const TOKEN_KEY = 'staffpilot_token';
export const USER_KEY = 'staffpilot_user';
export const LEGACY_TOKEN_KEY = 'staffos_token';
export const LEGACY_USER_KEY = 'staffos_user';

export const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;
export const NAME_REGEX = /^[\p{L}\p{M}\s'-]{2,100}$/u;