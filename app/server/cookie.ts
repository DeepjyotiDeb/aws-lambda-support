import { createCookie, createCookieSessionStorage } from "react-router";

const secrets = process.env.COOKIE_SECRETS
  ? process.env.COOKIE_SECRETS.split(",")
  : ["fallback-secret"];

export const sessionCookie = createCookie("__session", {
  secrets,
  sameSite: "strict",
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 5, // 5 minutes
});

export const sessionStorage = createCookieSessionStorage({
  cookie: sessionCookie,
});

export const refreshCookie = createCookie("__refresh", {
  secrets,
  sameSite: "lax",
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
});

export const { getSession, commitSession, destroySession } = sessionStorage;
