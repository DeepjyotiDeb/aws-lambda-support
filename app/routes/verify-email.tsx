import { Link } from "react-router";
import type { Route } from "./+types/verify-email";
import { processEmailVerificationToken } from "~/server/services/user.service";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return { error: "Missing verification token." };
  }

  const validated = await processEmailVerificationToken(token);
  if ("error" in validated) {
    return { error: validated.error };
  }

  return { success: true };
}

export default function VerifyEmail({ loaderData }: Route.ComponentProps) {
  if (loaderData?.error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md w-96 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Verification Failed</h1>
          <p className="mb-4">{loaderData.error}</p>
          <Link to="/login" className="text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-96 text-center">
        <h1 className="text-2xl font-bold mb-4 text-green-600">Email Verified!</h1>
        <p className="mb-4">Your email has been successfully verified.</p>
        <Link
          to="/login"
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 px-4 inline-block"
        >
          Continue to Login
        </Link>
      </div>
    </div>
  );
}
