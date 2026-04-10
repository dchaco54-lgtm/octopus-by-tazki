export const ALLOWED_DOMAIN = "@tazki.cl";
export const APP_ROLES = ["basic", "editor", "admin"] as const;
export const MODULES_PATH = "/modules";
export const CHANGE_PASSWORD_PATH = "/change-password";

export type AppRole = (typeof APP_ROLES)[number];
