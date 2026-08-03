import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const serverMessage = "Hello from the server!";
  return serverMessage;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome loaderData={loaderData} />;
}
