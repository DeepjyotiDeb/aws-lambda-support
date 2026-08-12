import { createContext as createRouterContext } from "react-router";

export type SessionUser = {
  userId: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
};

export type AuthFlags = {
  google: boolean;
  github: boolean;
  emailVerification: boolean;
  multiSession: boolean;
};

const defaultFlags: AuthFlags = {
  google: false,
  github: false,
  emailVerification: false,
  multiSession: true,
};

export function getAuthFlagsFromEnv(): AuthFlags {
  return {
    google: process.env.AUTH_ENABLE_GOOGLE === "true",
    github: process.env.AUTH_ENABLE_GITHUB === "true",
    emailVerification: process.env.AUTH_ENABLE_EMAIL_VERIFICATION === "true",
    multiSession: process.env.AUTH_ALLOW_MULTI_SESSION !== "false",
  };
}

// React Router server/middleware contexts (used with context.set() and context.get())
export const userContext = createRouterContext<SessionUser | null>(null);
export const authFlagsContext = createRouterContext<AuthFlags>(defaultFlags);
