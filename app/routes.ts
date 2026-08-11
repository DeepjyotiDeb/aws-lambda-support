import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),
  route("verify-email", "routes/verify-email.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("reset-password/confirm", "routes/reset-password.confirm.tsx"),
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/debug-null.tsx")
] satisfies RouteConfig;
