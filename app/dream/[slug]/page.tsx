import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { readDream } from "@/lib/hermes/dreams";
import { relTime } from "@/lib/utils";
import { Markdown } from "@/components/dream/markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dream = readDream(slug);
  if (!dream) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Link
        href="/dream"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tüm rüyalar
      </Link>

      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">{dream.title}</h1>
        <p className="mt-1 label">
          {dream.date} · {relTime(dream.date)}
        </p>
      </header>

      <article className="panel p-6">
        <Markdown source={dream.body} />
      </article>
    </div>
  );
}
