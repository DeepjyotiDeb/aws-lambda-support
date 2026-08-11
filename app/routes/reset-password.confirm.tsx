import { Form, Link, useActionData } from "react-router";
import type { Route } from "./+types/reset-password.confirm";
import { validateToken } from "~/server/services/token.service";
import { createAuthResponse } from "~/server/auth";
import * as v from "valibot";
import { resetUserPassword } from "~/server/services/user.service";

const ResetPasswordSchema = v.object({
  token: v.pipe(v.string(), v.trim()),
  password: v.pipe(v.string(), v.minLength(8)),
});

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return { error: "Missing reset token." };
  }

  const validated = await validateToken("password_reset", token);
  if (!validated) {
    return { error: "Invalid or expired reset link." };
  }

  return { token };
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = v.safeParse(ResetPasswordSchema, Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return { error: "Invalid form submission.", parsedErrors: parsed.issues };
  }

  const { token, password } = parsed.output;
  const res = await resetUserPassword(token, password);
  if (!res.success) {
    return { error: res.error };
  }
  const multiSession = process.env.AUTH_ALLOW_MULTI_SESSION !== "false";
  return createAuthResponse(res.userId, "/", request, multiSession);
}

export default function ResetPasswordConfirm({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();

  if (loaderData?.error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md w-96 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="mb-4">{loaderData.error}</p>
          <Link to="/reset-password" className="text-blue-600 hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen ">
      <div className="bg-gray-700 p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Choose a New Password</h1>
        {actionData?.error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{actionData.error}</div>
        )}
        <Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="token" value={loaderData.token} />
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border rounded p-2"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Update Password
          </button>
        </Form>
      </div>
    </div>
  );
}
