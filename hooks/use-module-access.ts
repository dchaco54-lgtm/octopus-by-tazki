"use client";

export function useModuleAccess(role: string, allowedRoles: string[]) {
  return allowedRoles.includes(role);
}
