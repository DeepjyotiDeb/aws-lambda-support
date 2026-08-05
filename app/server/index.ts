import * as build from "virtual:react-router/server-build";
import { RouterContextProvider } from "react-router";
import { createFunctionURLStreamingRequestHandler } from "./adapter";

console.log("[server] SESSION_SECRET set:", !!process.env.SESSION_SECRET);
console.log("[server] ORIGIN_SECRET set:", !!process.env.ORIGIN_SECRET);
console.log("[server] NODE_ENV:", process.env.NODE_ENV);

export const handler = createFunctionURLStreamingRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext(event) {
    const hasSecret = event.headers["x-origin-secret"] === process.env.ORIGIN_SECRET;
    console.log(
      "[server:getLoadContext] method:",
      event.requestContext.http.method,
      "path:",
      event.rawPath,
      "origin-secret-match:",
      hasSecret,
    );
    if (!hasSecret) {
      console.error("[server:getLoadContext] Forbidden — x-origin-secret mismatch");
      throw new Response("Forbidden", { status: 403 });
    }
    return new RouterContextProvider();
  },
});
