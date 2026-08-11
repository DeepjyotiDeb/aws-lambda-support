import { useActionData, Form, Link } from "react-router";
import type { Route } from "./+types/login";
import { createAuthResponse } from "~/server/auth";
import { checkRateLimit } from "~/server/services/rateLimiter.service";
import * as v from "valibot";
import { verifyUserCredentials } from "~/server/services/user.service";

const LoginSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  password: v.pipe(v.string(), v.minLength(1)),
});

export async function action({ request }: Route.ActionArgs) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const allowed = await checkRateLimit(ip, "/login", 10, 600);
  if (!allowed) return { error: "Too many attempts. Try again later." };

  const parsed = v.safeParse(LoginSchema, Object.fromEntries(await request.formData()));
  if (!parsed.success) return { error: "Invalid form submission" };

  const { email, password } = parsed.output;
  const result = await verifyUserCredentials(email.toLowerCase(), password);
  if (!result) return { error: "Invalid credentials" };

  const multiSession = process.env.AUTH_ALLOW_MULTI_SESSION !== "false";
  return createAuthResponse(result.userId, "/", request, multiSession);
}

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-700 p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        {actionData?.error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{actionData.error}</div>
        )}
        <Form method="post" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input name="password" type="password" required className="w-full border rounded p-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Sign In
          </button>
        </Form>
        <div className="mt-4 text-sm text-center">
          <Link to="/register" className="hover:underline">
            Create an account
          </Link>{" "}
          |{" "}
          <Link to="/reset-password" className="hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
