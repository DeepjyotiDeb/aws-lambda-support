import { Form, useNavigation } from "react-router";
import { userContext } from "~/context";
import type { Route } from "./+types/home";

export function meta() {
  return [{ title: "Home" }, { name: "description", content: "Welcome!" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  return { email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { email, emailVerified, createdAt } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/logout";

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-700 p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <p className="mb-2">
          <span className="font-medium">Email:</span> {email}
        </p>
        <p className="mb-2">
          <span className="font-medium">Verified:</span> {emailVerified ? "Yes" : "No"}
        </p>
        <p>
          <span className="font-medium">Member since:</span>{" "}
          {new Date(createdAt).toISOString().slice(0, 10)}
        </p>

        <Form method="post" action="/logout" viewTransition>
          <button
            type="submit"
            className={`bg-red-600 text-white p-2 rounded hover:bg-red-700 cursor-pointer ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isSubmitting}
          >
            Logout
          </button>
        </Form>
      </div>
    </div>
  );
}
