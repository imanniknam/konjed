import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/konjed/pages/PageShell";
import { getPageDoc } from "@/lib/server/cms";

type Props = { params: Promise<{ slug: string[] }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageDoc((await params).slug.join("/"));
  return { title: page ? `${page.seo} | کنجد` : "صفحه پیدا نشد | کنجد" };
}

export default async function Page({ params }: Props) {
  const page = await getPageDoc((await params).slug.join("/"));
  if (!page) notFound();
  return <PageShell page={page} />;
}
