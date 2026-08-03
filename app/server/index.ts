import * as build from "virtual:react-router/server-build";
import { createFunctionURLStreamingRequestHandler } from "./adapter";

export const handler = createFunctionURLStreamingRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});
