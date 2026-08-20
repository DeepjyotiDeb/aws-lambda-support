import { destroyAuth } from "~/server/auth";
import { getSession } from "~/server/cookie";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  return destroyAuth(request, "/login", userId);
}
