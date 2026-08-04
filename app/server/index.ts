import * as build from "virtual:react-router/server-build";
import { createFunctionURLStreamingRequestHandler } from "./adapter";

export const handler = createFunctionURLStreamingRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext(event) {
    if (event.headers["x-origin-secret"] !== process.env.ORIGIN_SECRET) {
      throw new Response("Forbidden", { status: 403 });
    }
  },
});
