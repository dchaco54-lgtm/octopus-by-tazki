import { ALLOWED_DOMAIN, CHANGE_PASSWORD_PATH, MODULES_PATH, type AppRole } from "@/modules/auth/constants";

const ROLE_PRIORITY: Record<AppRole, number> = {
  basic: 1,
  editor: 2,
  admin: 3,
};

export function isCorporateEmail(email: string) {
  return email.toLowerCase().trim().endsWith(ALLOWED_DOMAIN);
}

export function hasRoleAccess(currentRole: AppRole, requiredRole: AppRole) {
  return ROLE_PRIORITY[currentRole] >= ROLE_PRIORITY[requiredRole];
}

export function requiresFirstLoginPasswordChange(mustChangePassword?: boolean | null) {
  return mustChangePassword === true;
}

export function resolvePostLoginPath(mustChangePassword?: boolean | null) {
  return requiresFirstLoginPasswordChange(mustChangePassword) ? CHANGE_PASSWORD_PATH : MODULES_PATH;
}
