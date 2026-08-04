import { writeReadableStreamToWritable } from "@react-router/node";
import type { APIGatewayProxyEventV2, StreamifyHandler } from "aws-lambda";
import { createRequestHandler as createReactRouterRequestHandler } from "react-router";
import type { ServerBuild } from "react-router";

// awslambda global namespace is declared by @types/aws-lambda (handler.d.ts)

interface HandlerOptions {
  build: ServerBuild | (() => Promise<ServerBuild>);
  mode?: string;
  getLoadContext?: (event: APIGatewayProxyEventV2, request: Request) => unknown;
}

function createWebRequest(event: APIGatewayProxyEventV2): Request {
  // x-viewer-host is set by the CloudFront Function on the viewer request.
  // Fall back to requestContext.domainName (non-spoofable, but is the lambda-url domain).
  const host = event.headers["x-viewer-host"] || event.requestContext.domainName;
  const protocol = event.headers["x-forwarded-proto"] || "https";
  const url = `${protocol}://${host}${event.rawPath}${event.rawQueryString ? `?${event.rawQueryString}` : ""}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (value) headers.set(key, value);
  }

  const method = event.requestContext.http.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body =
    hasBody && event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body
      : undefined;

  return new Request(url, { method, headers, body });
}

const emptyStream = () =>
  new ReadableStream({
    start(controller) {
      controller.enqueue("");
      controller.close();
    },
  });

async function sendResponse(
  response: Response,
  responseStream: awslambda.HttpResponseStream,
): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: response.status,
    headers,
  });

  // Function URL needs a write to happen, otherwise it won't send headers.
  // See https://github.com/fastify/aws-lambda-fastify/issues/154#issuecomment-2614521719
  const body = response.body ?? emptyStream();

  await writeReadableStreamToWritable(body, httpStream);
}

export function createFunctionURLStreamingRequestHandler(
  options: HandlerOptions,
): StreamifyHandler<APIGatewayProxyEventV2, void> {
  const handleRequest = createReactRouterRequestHandler(options.build, options.mode);

  return awslambda.streamifyResponse(async (event: APIGatewayProxyEventV2, responseStream) => {
    let request: Request;

    try {
      request = createWebRequest(event);
    } catch (e: unknown) {
      await sendResponse(
        new Response(`Bad Request: ${e instanceof Error ? e.message : e}`, { status: 400 }),
        responseStream,
      );
      return;
    }

    // const loadContext = options.getLoadContext?.(event, request);
    // const response = await handleRequest(request, loadContext);
    const response = await handleRequest(request);
    await sendResponse(response, responseStream);
  });
}
