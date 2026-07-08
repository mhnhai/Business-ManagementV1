export const Roles = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  USER: 'user',
} as const;

export type RoleCode = (typeof Roles)[keyof typeof Roles];

export function isAdminRole(role: string | undefined): boolean {
  return role === Roles.ADMIN;
}
