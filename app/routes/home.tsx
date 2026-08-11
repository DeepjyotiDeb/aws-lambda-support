import { Form } from "react-router";
import type { Route } from "./+types/home";
import { userContext } from "~/context";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New React Router App" }, { name: "description", content: "Welcome!" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;
  return { email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { email, emailVerified, createdAt } = loaderData;

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
          {new Date(createdAt).toLocaleDateString()}
        </p>

        <Form method="post" action="/logout">
          <button
            type="submit"
            className="bg-red-600 text-white p-2 rounded hover:bg-red-700 cursor-pointer"
          >
            Logout
          </button>
        </Form>
      </div>
    </div>
  );
}
