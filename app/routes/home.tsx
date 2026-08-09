import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({ request: _request }: Route.LoaderArgs) {
  return new Response("I am a message from the server!");
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome loaderData={loaderData} />;
}
