import type { AppSection } from "@/components/layout/app-shell";

export const Roles = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
} as const;

export function isAdmin(role: string | undefined): boolean {
  return role === Roles.ADMIN;
}

const ADMIN_SECTIONS: AppSection[] = [
  "admin-sales-dashboard",
  "products",
  "suppliers",
  "imports",
  "customers",
  "activities",
  "users",
  "salaries",
];

const EMPLOYEE_SECTIONS: AppSection[] = [
  "user-dashboard",
  "products",
  "customers",
  "activities",
];

export function sectionsForRole(role: string | undefined): AppSection[] {
  return isAdmin(role) ? ADMIN_SECTIONS : EMPLOYEE_SECTIONS;
}

export function canAccessSection(
  role: string | undefined,
  section: AppSection,
): boolean {
  return sectionsForRole(role).includes(section);
}
