import fs from "node:fs";
import path from "node:path";
import { data } from "react-router";
import type { Route } from "./+types/docs.$slug";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export async function loader({ params }: Route.LoaderArgs) {
  const filePath = path.join(process.cwd(), "app/content", `${params.slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw data("Not found", { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const heading = content.match(/^#\s+(.+)$/m)?.[1] ?? params.slug;
  return { content, heading };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData?.heading }, { name: "description", content: loaderData?.heading }];
}

export default function DocPage({ loaderData }: Route.ComponentProps) {
  return (
    <article className="prose mx-auto max-w-3xl px-4 py-12">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{loaderData.content}</ReactMarkdown>
    </article>
  );
}
