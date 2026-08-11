import { createContext as createRouterContext } from "react-router";
import type { User } from "~/server/db";

export type AuthFlags = {
  credentials: boolean;
  google: boolean;
  github: boolean;
  emailVerification: boolean;
  passwordReset: boolean;
  multiSession: boolean;
};

const defaultFlags: AuthFlags = {
  credentials: true,
  google: false,
  github: false,
  emailVerification: false,
  passwordReset: false,
  multiSession: true,
};

export function getAuthFlagsFromEnv(): AuthFlags {
  return {
    credentials: process.env.AUTH_ENABLE_CREDENTIALS !== "false",
    google: process.env.AUTH_ENABLE_GOOGLE === "true",
    github: process.env.AUTH_ENABLE_GITHUB === "true",
    emailVerification: process.env.AUTH_ENABLE_EMAIL_VERIFICATION === "true",
    passwordReset: process.env.AUTH_ENABLE_PASSWORD_RESET === "true",
    multiSession: process.env.AUTH_ALLOW_MULTI_SESSION !== "false",
  };
}

// React Router server/middleware contexts (used with context.set() and context.get())
export const userContext = createRouterContext<User | null>(null);
export const authFlagsContext = createRouterContext<AuthFlags>(defaultFlags);
