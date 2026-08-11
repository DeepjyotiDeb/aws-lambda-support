import { Form, Link, useActionData } from "react-router";
import type { Route } from "./+types/register";
import * as v from "valibot";
import { createAuthResponse } from "~/server/auth";
import { checkRateLimit } from "~/server/services/rateLimiter.service";
import { registerUser } from "~/server/services/user.service";

const RegisterSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  password: v.pipe(v.string(), v.minLength(8)),
});

export async function action({ request }: Route.ActionArgs) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const allowed = await checkRateLimit(ip, "/register", 5, 3600); // 5 per hour
  if (!allowed) return { error: "Too many attempts. Try again later." };

  const parsed = v.safeParse(RegisterSchema, Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return { error: "Invalid form submission. Password must be at least 8 characters." };
  }

  const { email, password } = parsed.output;
  const result = await registerUser(email.toLowerCase(), password, new URL(request.url).origin);

  if (result.status === "email_exists") {
    return { error: "An account with this email already exists." };
  }
  if (result.status === "verification_sent") {
    return { success: true, message: "Check your inbox to complete registration" };
  }

  return createAuthResponse(result.userId, "/", request);
}

export default function Register() {
  const actionData = useActionData<typeof action>();

  if (actionData?.success) {
    return (
      <div className="flex justify-center items-center h-screen ">
        <div className=" p-8 rounded shadow-md w-96 text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">Success!</h1>
          <p>{actionData.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen ">
      <div className="bg-gray-700 p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
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
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border rounded p-2"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Sign Up
          </button>
        </Form>
        <div className="mt-4 text-sm text-center">
          <Link to="/login" className="text-blue-600 hover:underline">
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
