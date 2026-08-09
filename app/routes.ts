import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("docs/:slug", "routes/docs.$slug.tsx"),
  route("/.well-known/appspecific/com.chrome.devtools.json", "routes/debug-null.tsx"),
] satisfies RouteConfig;
