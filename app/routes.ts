import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/google/callback", "routes/api/auth/google/callback.tsx"),
  route("auth/google/call", "routes/api/auth/google/call.tsx"),
  route("auth/github/callback", "routes/api/auth/github/callback.tsx"),
  route("auth/github/call", "routes/api/auth/github/call.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/api/logout.tsx"),
  route("verify-email", "routes/verify-email.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("reset-password/confirm", "routes/reset-password.confirm.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/debug-null.tsx"),
] satisfies RouteConfig;
