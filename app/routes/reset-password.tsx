import { Form, Link, useActionData } from "react-router";
import * as v from "valibot";
import type { Route } from "./+types/reset-password";
import { checkRateLimit } from "~/server/services/rateLimiter.service";
import { sendPasswordResetEmail } from "~/server/services/user.service";

const SendResetPasswordEmailSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
});

export async function action({ request }: Route.ActionArgs) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const allowed = await checkRateLimit(ip, "/reset-password", 100, 3600); // 5 per hour

  if (!allowed) {
    return { error: "Too many attempts. Try again later." };
  }
  const parsed = v.safeParse(
    SendResetPasswordEmailSchema,
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success) {
    return { error: "Invalid form submission.", parsedErrors: parsed.issues };
  }
  const { email } = parsed.output;
  await sendPasswordResetEmail(email.toLowerCase(), request.url);
  // Security: Always return success message to prevent email enumeration
  return {
    success: true,
    message: "If an account with that email exists, we sent a password reset link.",
  };
}

export default function ResetPassword() {
  const actionData = useActionData<typeof action>();

  if (actionData?.success) {
    return (
      <div className="flex justify-center items-center h-screen ">
        <div className="bg-gray-700 p-8 rounded shadow-md w-96 text-center">
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p>{actionData.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen ">
      <div className="bg-gray-700 p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        {actionData?.error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{actionData.error}</div>
        )}
        <p className="text-sm mb-4">Enter your email address to receive a password reset link.</p>
        <Form method="post" className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full border rounded p-2" />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Send Reset Link
          </button>
        </Form>
        <div className="mt-4 text-sm text-center">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
