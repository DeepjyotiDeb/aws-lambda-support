import type { Route } from "./+types/logout";
import { destroyAuth } from "~/server/auth";
import { getSession } from "~/server/cookie";

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  return destroyAuth(request, "/login", userId);
}
